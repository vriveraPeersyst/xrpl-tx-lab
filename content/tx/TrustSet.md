---
title: TrustSet
summary: Crea o modifica una trust line hacia un emisor: límite que aceptas, No Ripple, autorización y congelación.
category: tokens
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/trustset
level: básico
---

## Qué hace

En el XRPL nadie puede enviarte un token emitido (IOU) si tú no has declarado antes que lo aceptas. Esa declaración es una **trust line**, un objeto [RippleState](/objects/RippleState) compartido entre tu cuenta y el emisor. `TrustSet` es la transacción que la crea, la ajusta o la deja en estado "por defecto" para que se borre.

La trust line guarda el límite que estás dispuesto a mantener (`LimitAmount`), el saldo actual, las calidades de entrada/salida y varios flags de cada lado: No Ripple, autorización (`Auth`) y congelación (`Freeze`/`DeepFreeze`). Como el objeto es compartido, cada cuenta solo modifica "su" mitad (la parte *low* o *high*, según el orden numérico de las direcciones).

El emisor también usa `TrustSet`: para autorizar a un tenedor cuando exige `RequireAuth`, o para congelar una línea concreta.

## Cuándo usarlo

- Antes de recibir cualquier token IOU (USD, EUR, stablecoins de testnet…).
- Ajustar el límite máximo que aceptas de un emisor.
- Activar `tfSetNoRipple` para que tu cuenta no sirva de puente entre dos trust lines del mismo token.
- Como emisor: autorizar a un tenedor (`tfSetfAuth`) o congelar/descongelar su línea.
- Cerrar una trust line: pon límite 0, sin calidades ni flags, con saldo 0.

## Cómo funciona por dentro

**`TrustSet::preflight`**: `LimitAmount` no puede ser XRP (`temBAD_LIMIT`), ni negativo, ni la moneda inválida (`temBAD_CURRENCY`), y debe llevar un `issuer` (`temDST_NEEDED`). Los flags `tfSetDeepFreeze` y `tfClearDeepFreeze` solo se admiten con [DeepFreeze](/amendments/DeepFreeze), que está activo en testnet.

**`TrustSet::preclaim`**: el emisor no puedes ser tú mismo (`temDST_IS_SRC`). `tfSetfAuth` solo tiene sentido si tu cuenta tiene `lsfRequireAuth`; si no, `tefNO_AUTH_REQUIRED`. Como el amendment AMM está activo, el emisor debe existir (`tecNO_DST`). Si el emisor tiene `lsfDisallowIncomingTrustline` y aún no existe la línea, `tecNO_PERMISSION`. Con los pseudo-accounts hay reglas propias: hacia un AMM solo puedes abrir línea de sus LP tokens y si el pool no está vacío (`tecAMM_EMPTY`). Con DeepFreeze: una cuenta con `lsfNoFreeze` no puede congelar (`tecNO_PERMISSION`); no puedes congelar y descongelar en la misma tx; y el resultado no puede quedar con deep freeze sin freeze normal.

**`TrustSet::doApply`** distingue dos casos:

- *La línea ya existe*: actualiza tu límite, tus `QualityIn`/`QualityOut` (0 o `QUALITY_ONE` = quitar el campo), aplica No Ripple (solo puedes activarlo si tu saldo en la línea es ≥ 0; si no, `tecNO_PERMISSION`), Auth y los flags de congelación. Luego calcula si cada lado "necesita reserva": tiene límite > 0, saldo positivo, calidad, freeze o No Ripple distinto del `DefaultRipple` de su cuenta. Sube o baja el `OwnerCount` de cada parte según cambie eso (`lsfLowReserve`/`lsfHighReserve`). Si ambos lados quedan en estado por defecto, la línea se borra con `trustDelete`. Si tu lado pasa a necesitar reserva y no la cubres, `tecINSUF_RESERVE_LINE`.
- *La línea no existe*: si `LimitAmount` es 0 y no pones calidades ni `tfSetfAuth`, no hay nada que crear: `tecNO_LINE_REDUNDANT`. Si no cubres la reserva incremental, `tecNO_LINE_INSUF_RESERVE`. Nota curiosa del código: las dos primeras trust lines (`ownerCount < 2`) no exigen reserva adicional en el momento de crearse (`reserveCreate` es 0), aunque sí cuentan en `OwnerCount`. Si todo va bien, `trustCreate` inserta el `RippleState` en los directorios de las dos cuentas.

Delegación: la tx es delegable con permiso granular `TrustlineAuthorize`, `TrustlineFreeze`, etc.; `checkGranularSemantics` exige que el `LimitAmount` coincida con el límite actual para que el delegado no lo cambie de paso.

## Campos clave

- **LimitAmount** — `{currency, issuer, value}`. El `issuer` es la contraparte de la línea; `value` es tu límite. El código lo vuelve a etiquetar internamente con tu cuenta como `account`.
- **QualityIn / QualityOut** — porcentaje en partes por mil millones (1e9 = 100 %) que aplicas a lo que entra/sale por la línea. `0` o `1000000000` elimina el campo.

## Flags

- **tfSetfAuth** — como emisor con `RequireAuth`, autorizas a la contraparte a mantener tu token.
- **tfSetNoRipple / tfClearNoRipple** — activa o quita No Ripple en tu lado. Activarlo exige saldo ≥ 0 en la línea.
- **tfSetFreeze / tfClearFreeze** — congela o descongela la línea desde tu lado (útil para emisores). Bloqueado si tienes `lsfNoFreeze`.
- **tfSetDeepFreeze / tfClearDeepFreeze** — congelación profunda: además de no poder enviar, la contraparte tampoco puede recibir. Requiere que la línea esté ya congelada (o congelarla en la misma tx).

## Errores habituales

- **tecNO_LINE_REDUNDANT** — intentas crear una línea con límite 0 y sin más cambios. Pon un límite > 0.
- **tecNO_LINE_INSUF_RESERVE** / **tecINSUF_RESERVE_LINE** — no tienes XRP para la reserva incremental (0,2 XRP en testnet). Añade fondos.
- **tecNO_DST** — el emisor indicado no existe en el ledger.
- **tecNO_PERMISSION** — el emisor rechaza trust lines entrantes, intentas No Ripple con saldo negativo, o combinaciones de freeze inválidas.
- **tefNO_AUTH_REQUIRED** — usas `tfSetfAuth` sin tener `asfRequireAuth` activado.
- **temDST_IS_SRC** — el `issuer` es tu propia cuenta.
- **temBAD_LIMIT** — `LimitAmount` es XRP o negativo.

## Ejemplo

```json
{
  "TransactionType": "TrustSet",
  "Account": "rXXXX_TU_CUENTA",
  "LimitAmount": {
    "currency": "USD",
    "issuer": "rZZZZ_EMISOR",
    "value": "1000"
  },
  "Flags": 131072
}
```

Acepta hasta 1000 USD del emisor y activa `tfSetNoRipple` (131072).

## Pruébalo en testnet

1. Necesitas una segunda cuenta que haga de emisor; el builder puede usar la cuenta de demostración `{{issuer}}`.
2. Envía el ejemplo. Verifica con `account_lines` (cuenta = la tuya): aparece una línea con `limit: "1000"`, `balance: "0"` y `no_ripple: true`.
3. Consulta `account_info`: tu `OwnerCount` ha subido en 1 y la reserva exigida en 0,2 XRP.
4. Desde el emisor, envía un [Payment](/tx/Payment) de `{currency: "USD", issuer: emisor, value: "10"}` a tu cuenta: el `balance` de la línea pasa a 10.
5. Para cerrarla: devuelve los 10 USD al emisor, envía `TrustSet` con `value: "0"` y `Flags: 262144` (`tfClearNoRipple`) si tu cuenta no tiene `DefaultRipple`; la línea desaparece de `account_lines`.

## Relacionado

- [Payment](/tx/Payment) — mueve tokens por la trust line.
- [AccountSet](/tx/AccountSet) — `asfRequireAuth`, `asfDefaultRipple`, `asfNoFreeze`, `asfGlobalFreeze`, `asfDisallowIncomingTrustline`.
- [Clawback](/tx/Clawback) — el emisor recupera tokens de una línea.
- [OfferCreate](/tx/OfferCreate) — intercambiar el token en el DEX.
- Objetos: [RippleState](/objects/RippleState), [AccountRoot](/objects/AccountRoot).
- Amendments: [DeepFreeze](/amendments/DeepFreeze), [DisallowIncoming](/amendments/DisallowIncoming), [fixTrustLinesToSelf](/amendments/fixTrustLinesToSelf).
