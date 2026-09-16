---
title: Clawback
summary: Permite al emisor recuperar tokens IOU o MPT de la cuenta de un tenedor, sin su consentimiento.
category: tokens
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/clawback
xls: XLS-0039
amendment: Clawback
level: intermedio
---

## Qué hace

`Clawback` es la herramienta del emisor regulado: retira tokens de la cuenta de un tenedor y los devuelve al emisor (donde, al ser su propia deuda, simplemente desaparecen). Es el equivalente a una orden judicial de bloqueo y recuperación de fondos en un banco.

Solo funciona si el emisor optó por ello **antes de emitir**: para tokens IOU, la cuenta emisora debe tener el flag `lsfAllowTrustLineClawback`, que solo se puede activar con [AccountSet](/tx/AccountSet) mientras la cuenta no tenga ningún objeto (trust lines, ofertas…). Para MPT, la emisión debe haberse creado con `tfMPTCanClawback`.

Objetos afectados: la [RippleState](/objects/RippleState) entre emisor y tenedor (IOU) o el [MPToken](/objects/MPToken) del tenedor y la [MPTokenIssuance](/objects/MPTokenIssuance) (MPT).

## Cuándo usarlo

- Cumplimiento normativo: recuperar activos de una cuenta comprometida o sancionada.
- Corregir emisiones erróneas de stablecoins o tokens de activos reales.
- Recuperar fondos de tenedores que perdieron sus claves, si el emisor asume esa política.

## Cómo funciona por dentro

**`Clawback::preflight`** se especializa según el tipo de activo:

- *IOU*: no puede llevar `Holder` (`temMALFORMED`). El `issuer` del `Amount` es el **tenedor**, no tú. Si coincide con tu cuenta, si es XRP o si el valor es ≤ 0, `temBAD_AMOUNT`.
- *MPT*: requiere [MPTokensV1](/amendments/MPTokensV1) (activo en testnet). `Holder` es obligatorio y distinto de tu cuenta; el importe debe estar entre 1 y el máximo de MPT.

**`Clawback::preclaim`** exige que existan emisor y tenedor. Un AMM no puede ser tenedor objetivo (`tecAMM_ACCOUNT`; para eso existe [AMMClawback](/tx/AMMClawback)). Luego:

- *IOU*: tu cuenta debe tener `lsfAllowTrustLineClawback` y **no** tener `lsfNoFreeze` (`tecNO_PERMISSION`). La trust line debe existir (`tecNO_LINE`) y el signo del saldo debe indicar que el tenedor te debe a ti, no al revés (si no, `tecNO_PERMISSION`). Si el tenedor no tiene saldo positivo ignorando congelaciones, `tecINSUFFICIENT_FUNDS`.
- *MPT*: la emisión debe existir, tener `lsfMPTCanClawback`, ser tuya, y el tenedor tener el objeto `MPToken` con saldo > 0.

**`Clawback::doApply`** calcula lo que el tenedor realmente puede gastar (`accountHolds` con `IgnoreFreeze`, así que funciona aunque la línea esté congelada) y mueve `min(saldo, Amount)` del tenedor al emisor con `directSendNoFee`. Es decir: **si pides más de lo que tiene, recuperas todo lo que tiene y la transacción tiene éxito**; no falla por exceso.

## Campos clave

- **Amount** — para IOU, `{currency, issuer, value}` donde `issuer` es la dirección del **tenedor** al que le retiras el token (el código lo reetiqueta después con tu cuenta). Para MPT, `{mpt_issuance_id, value}`.
- **Holder** — solo para MPT: cuenta a la que se le retira. Prohibido en IOU.

## Errores habituales

- **tecNO_PERMISSION** — tu cuenta no tiene `asfAllowTrustLineClawback`, tiene `asfNoFreeze`, o el saldo de la línea no apunta en tu dirección (no eres el emisor real de ese saldo). Activa el flag antes de crear cualquier objeto.
- **tecNO_LINE** — no existe trust line entre tú y ese tenedor para esa moneda.
- **tecINSUFFICIENT_FUNDS** — el tenedor tiene saldo 0.
- **tecAMM_ACCOUNT** — el tenedor es un AMM: usa `AMMClawback`.
- **temBAD_AMOUNT** — el `issuer` del `Amount` es tu propia cuenta, es XRP o el valor es ≤ 0.
- **temMALFORMED** — pusiste `Holder` en un clawback de IOU, o lo omitiste en uno de MPT.

## Ejemplo

```json
{
  "TransactionType": "Clawback",
  "Account": "rXXXX_TU_CUENTA",
  "Amount": {
    "currency": "USD",
    "issuer": "rYYYY_OTRA_CUENTA",
    "value": "10"
  }
}
```

Tu cuenta (emisora de USD) recupera hasta 10 USD de `rYYYY_OTRA_CUENTA`.

## Pruébalo en testnet

1. Con una cuenta **recién creada y sin objetos**, envía [AccountSet](/tx/AccountSet) con `SetFlag: 16` (`asfAllowTrustLineClawback`). Si ya tiene trust lines u ofertas recibirás `tecOWNERS`.
2. Desde la otra cuenta, crea una trust line con [TrustSet](/tx/TrustSet) a tu cuenta para `USD`.
3. Desde tu cuenta, envía un [Payment](/tx/Payment) de 25 USD a la otra cuenta. `account_lines` del tenedor mostrará `balance: "25"`.
4. Envía el ejemplo de `Clawback` con `value: "10"`. Consulta de nuevo `account_lines`: `balance: "15"`.
5. Repite con `value: "1000"`: verás `tesSUCCESS` y el saldo baja a 0 (no falla por exceder).
6. Prueba `SetFlag: 6` (`asfNoFreeze`) en tu cuenta: obtendrás `tecNO_PERMISSION`, porque clawback y NoFreeze son excluyentes.

## Relacionado

- [AccountSet](/tx/AccountSet) — `asfAllowTrustLineClawback` y su incompatibilidad con `asfNoFreeze`.
- [TrustSet](/tx/TrustSet) — congelar como alternativa menos drástica.
- [AMMClawback](/tx/AMMClawback) — recuperar tokens depositados en un AMM.
- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) — `tfMPTCanClawback`.
- Objetos: [RippleState](/objects/RippleState), [MPToken](/objects/MPToken).
- Amendments: [Clawback](/amendments/Clawback), [MPTokensV1](/amendments/MPTokensV1), [AMMClawback](/amendments/AMMClawback).
