---
title: AMMClawback
summary: Permite al emisor de un token recuperar (clawback) el token que un tenedor tiene depositado en un AMM, retirando su liquidez por él.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammclawback
xls: XLS-0073
amendment: AMMClawback
level: avanzado
---

## Qué hace

El [Clawback](/tx/Clawback) ordinario recupera tokens de la trust line de un tenedor. Pero si ese tenedor ha depositado los tokens en un [AMM](/objects/AMM), ya no están en su trust line: están en la pseudocuenta del fondo, y él solo tiene LP tokens. `AMMClawback` cubre ese hueco: el emisor obliga a una **retirada equilibrada** de la posición del tenedor (`Holder`) en el AMM y, de lo que sale, se queda con su propio token. El otro activo del par se entrega al tenedor, salvo que el emisor emita también ese segundo activo y active `tfClawTwoAssets`, en cuyo caso recupera ambos.

Quema los LP tokens del tenedor, reduce las reservas del fondo y, si el fondo queda vacío, lo borra igual que [AMMWithdraw](/tx/AMMWithdraw). Ignora congelaciones, autorizaciones y reserva del tenedor: el emisor tiene prioridad (privilegio `OverrideFreeze`).

Antes del amendment [AMMClawback](/amendments/AMMClawback), `AMMCreate` rechazaba tokens con clawback habilitado; ahora se permiten precisamente porque existe esta transacción.

## Cuándo usarlo

- Emisores regulados (stablecoins, activos tokenizados) que deben poder recuperar fondos por orden legal aunque estén en un AMM.
- Retirar de circulación el token de una cuenta comprometida sin depender de que ella retire su liquidez.
- Vaciar completamente un AMM de tu token cuando quieres discontinuarlo: tras el clawback del último LP el fondo se borra.

## Cómo funciona por dentro

`AMMClawback::checkExtraFeatures` exige [AMMClawback](/amendments/AMMClawback) (activo en testnet), y [MPTokensV2](/amendments/MPTokensV2) si interviene un MPT.

`AMMClawback::preflight`:
- `Account` (emisor) ≠ `Holder` (`temMALFORMED`).
- `Asset` no puede ser XRP (`temMALFORMED`): XRP no tiene emisor.
- `Asset.issuer` debe ser `Account` (`temMALFORMED`).
- Con `tfClawTwoAssets`, `Asset2.issuer` también debe ser `Account` (`temINVALID_FLAG`).
- Si hay `Amount`, su activo debe ser `Asset` (`temBAD_AMOUNT`) y ser positivo.

`AMMClawback::preclaim`:
- `Holder` debe existir (`terNO_ACCOUNT`); el par debe tener AMM (`terNO_AMM`).
- El emisor debe tener `lsfAllowTrustLineClawback` **y no** `lsfNoFreeze` (`tecNO_PERMISSION`). Ambos se fijan con [AccountSet](/tx/AccountSet) y son irreversibles; `AllowTrustLineClawback` solo puede activarse en una cuenta sin trust lines. Para MPT, la emisión debe tener `lsfMPTCanClawback`.
- Con `tfClawTwoAssets`, la misma comprobación para `Asset2`.

`AMMClawback::doApply` (en `applyGuts`):
1. Con [fixAMMClawbackRounding](/amendments/fixAMMClawbackRounding) (activo) primero llama a `verifyAndAdjustLPTokenBalance` para corregir desajustes de redondeo si el tenedor es el último LP. Si el tenedor no tiene LP tokens → `tecAMM_BALANCE`.
2. **Sin `Amount`**: `AMMWithdraw::equalWithdrawTokens` con todos los LP tokens del tenedor (`WithdrawAll::Yes`), sin comisión, ignorando freeze, auth y reserva.
3. **Con `Amount`**: `equalWithdrawMatchingOneAmount` calcula la fracción `Amount / reservaDeAsset`, retira esa misma fracción del otro activo y de los LP tokens. Si la fracción cubre todos los LP tokens del tenedor (más de los que tiene; con [fixCleanup3_4_0](/amendments/fixCleanup3_4_0), aún no activo, también si son exactamente iguales) se convierte en retirada total. Con `fixAMMClawbackRounding` redondea LP tokens y activos a favor del fondo (`getRoundedLPTokens`, `getRoundedAsset`).
4. Comprueba la invariante de precisión y llama a `deleteAMMAccountIfEmpty`.
5. Lo retirado de `Asset` va del tenedor al emisor con `directSendNoFee` (equivale a quemarlo). Con `tfClawTwoAssets` ocurre lo mismo con `Asset2`; si no, el tenedor se queda con el segundo activo. Si el tenedor había borrado su trust line, se recrea sin exigir reserva (`ReserveHandling::IgnoreReserve`), para que no pueda esquivar el clawback.

Un detalle: en la retirada, el `Amount` que pides se interpreta contra la reserva del fondo, así que el emisor recupera como máximo la parte proporcional del tenedor; no puede llevarse liquidez de otros LP.

## Campos clave

- **Holder** — Cuenta cuyo depósito en el AMM se recupera. Debe tener LP tokens de ese fondo.
- **Asset** — Tu token (con `issuer` = tu cuenta). Es el activo que recuperas.
- **Asset2** — El otro activo del par, para identificar el AMM.
- **Amount** — Cuánto de `Asset` recuperar. Si lo omites, se retira **toda** la posición del tenedor. Si lo indicas, se retira la fracción equivalente de los dos activos.

## Flags

- **tfClawTwoAssets** (1) — Recupera también `Asset2`. Solo válido si emites los dos activos del fondo.

## Errores habituales

- **tecNO_PERMISSION** — Tu cuenta no tiene `lsfAllowTrustLineClawback`, o tiene `lsfNoFreeze`. Activa `asfAllowTrustLineClawback` (16) con `AccountSet` antes de emitir cualquier trust line.
- **temMALFORMED** — `Asset` es XRP, su `issuer` no es tu cuenta, o `Holder` eres tú.
- **temINVALID_FLAG** — `tfClawTwoAssets` con un `Asset2` que no emites.
- **tecAMM_BALANCE** — El tenedor no tiene LP tokens de este AMM.
- **tecAMM_INVALID_TOKENS** / **tecAMM_FAILED** — `Amount` tan pequeño que redondea a cero LP tokens o deja una retirada de un solo lado.
- **terNO_AMM** / **terNO_ACCOUNT** — El par no tiene AMM o `Holder` no existe.

## Ejemplo

```json
{
  "TransactionType": "AMMClawback",
  "Account": "rXXXX_TU_CUENTA",
  "Holder": "rYYYY_OTRA_CUENTA",
  "Asset": { "currency": "USD", "issuer": "rXXXX_TU_CUENTA" },
  "Asset2": { "currency": "XRP" }
}
```

Recupera toda la posición de `rYYYY_OTRA_CUENTA` en el fondo USD/XRP: el USD vuelve al emisor y el XRP se entrega al tenedor.

## Pruébalo en testnet

Aquí tu cuenta actúa como **emisor**, así que necesitas preparar el escenario:

1. Con `rXXXX_TU_CUENTA` envía [AccountSet](/tx/AccountSet) con `SetFlag: 16` (`asfAllowTrustLineClawback`) **antes** de que nadie abra trust lines contigo, y `SetFlag: 8` (`asfDefaultRipple`).
2. Desde `rYYYY_OTRA_CUENTA` abre una trust line USD hacia tu cuenta ([TrustSet](/tx/TrustSet)) y págale, por ejemplo, 100 USD con un [Payment](/tx/Payment).
3. Con `rYYYY_OTRA_CUENTA` crea el AMM USD/XRP ([AMMCreate](/tx/AMMCreate) con 50 USD y 10 XRP). Anota `amm_info`.
4. Con `rXXXX_TU_CUENTA` envía el ejemplo. En los metadatos verás que la línea de LP tokens del tenedor se pone a cero, que la trust line USD de la pseudocuenta baja y que el tenedor recibe los 10 XRP; como era el único LP, el AMM se borra (`DeletedNode` de `AMM` y `AccountRoot`).
5. Repite el escenario y prueba `Amount: {currency: "USD", issuer: "rXXXX_TU_CUENTA", value: "10"}`: solo se retira un quinto de la posición y el AMM sigue vivo con `lp_token.value` reducido.
6. Envía la transacción desde una cuenta sin `AllowTrustLineClawback` para ver `tecNO_PERMISSION`.

## Relacionado

- [Clawback](/tx/Clawback), [AMMWithdraw](/tx/AMMWithdraw), [AMMCreate](/tx/AMMCreate), [AMMDelete](/tx/AMMDelete), [AccountSet](/tx/AccountSet)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMMClawback](/amendments/AMMClawback), [Clawback](/amendments/Clawback), [fixAMMClawbackRounding](/amendments/fixAMMClawbackRounding), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
