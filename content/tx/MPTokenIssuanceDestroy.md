---
title: MPTokenIssuanceDestroy
summary: Elimina una emisión MPT que ya no tiene unidades en circulación y devuelve su reserva al emisor.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuancedestroy
xls: XLS-0033
amendment: MPTokensV1
level: básico
---

## Qué hace

`MPTokenIssuanceDestroy` borra el objeto [MPTokenIssuance](/objects/MPTokenIssuance) del ledger. Solo puede hacerlo el emisor y solo cuando `OutstandingAmount` es 0, es decir, cuando todos los tenedores han devuelto sus unidades al emisor (un [Payment](/tx/Payment) al emisor las "quema") o el emisor las ha recuperado con [Clawback](/tx/Clawback).

Los objetos [MPToken](/objects/MPToken) de los tenedores no se borran automáticamente; cada tenedor los elimina con [MPTokenAuthorize](/tx/MPTokenAuthorize) y `tfMPTUnauthorize`. Pueden hacerlo antes o después de destruir la emisión.

## Cuándo usarlo

- Retirar un token de prueba o una emisión que ya cumplió su función.
- Recuperar la unidad de reserva (0,2 XRP) que ocupa la emisión.
- Cerrar ordenadamente un programa de puntos tras canjear todos los saldos.

## Cómo funciona por dentro

**`MPTokenIssuanceDestroy::preflight`** no añade comprobaciones propias.

**`MPTokenIssuanceDestroy::preclaim`**:
1. Busca la emisión por `MPTokenIssuanceID`; si no existe → `tecOBJECT_NOT_FOUND`.
2. Su `Issuer` debe ser tu cuenta; si no → `tecNO_PERMISSION`.
3. `OutstandingAmount` debe ser 0; si no → `tecHAS_OBLIGATIONS`.
4. `LockedAmount` (unidades retenidas en escrows con [TokenEscrow](/amendments/TokenEscrow)) también debe ser 0; si no → `tecHAS_OBLIGATIONS`.

**`MPTokenIssuanceDestroy::doApply`**: quita la emisión de tu directorio de propietario (`tefBAD_LEDGER` si el enlace está roto), baja tu `OwnerCount` en 1 y borra el objeto.

## Campos clave

- **MPTokenIssuanceID** — identificador de 48 hex de la emisión. Lo encuentras en `account_objects` (`type: "mpt_issuance"`) o en el campo `mpt_issuance_id` de la transacción de creación.

## Errores habituales

- **tecOBJECT_NOT_FOUND** — el ID no corresponde a ninguna emisión (el ejemplo lleva ceros; sustitúyelo).
- **tecNO_PERMISSION** — la emisión existe pero no es tuya.
- **tecHAS_OBLIGATIONS** — todavía hay unidades en manos de tenedores o retenidas en escrow. Pide a los tenedores que te las devuelvan o usa `Clawback` si la emisión tiene `lsfMPTCanClawback`.

## Ejemplo

```json
{
  "TransactionType": "MPTokenIssuanceDestroy",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

## Pruébalo en testnet

1. Crea una emisión con [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) y copia su `MPTokenIssuanceID`.
2. Carga el ejemplo con ese ID y envía: `tesSUCCESS`. En `account_objects` (`type: "mpt_issuance"`) ya no aparece y `OwnerCount` ha bajado en 1.
3. Para ver `tecHAS_OBLIGATIONS`: crea otra emisión, haz que la otra cuenta la autorice con [MPTokenAuthorize](/tx/MPTokenAuthorize), envíale 100 unidades con un `Payment` e intenta destruirla.
4. Haz que la otra cuenta te devuelva las 100 unidades con un `Payment` a tu cuenta (`OutstandingAmount` vuelve a 0) y repite la destrucción: ahora funciona.

## Relacionado

- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenAuthorize](/tx/MPTokenAuthorize), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken)
- [MPTokensV1](/amendments/MPTokensV1), [TokenEscrow](/amendments/TokenEscrow)
