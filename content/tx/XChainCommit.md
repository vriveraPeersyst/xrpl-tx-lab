---
title: XChainCommit
summary: Bloquea fondos en la cuenta door de la cadena origen, asociados a un claim ID obtenido en la cadena destino, para que los witnesses los atestigüen.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincommit
xls: XLS-0038
amendment: XChainBridge
level: intermedio
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

`XChainCommit` es el paso en el que los fondos entran en el puente. Envías `Amount` a la cuenta door de **esta** cadena, indicando el `XChainClaimID` que obtuviste antes en la **otra** cadena con [XChainCreateClaimID](/tx/XChainCreateClaimID). Si esta es la cadena locking, los fondos quedan bloqueados en la door; si es la issuing, el activo envuelto vuelve a la door (que es su emisor) y deja de circular.

La transacción no crea ningún objeto en el ledger: es, en esencia, un pago a la door. Su efecto real lo producen los **witnesses**, que ven la transacción validada y envían [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) en la otra cadena. Cuando allí se alcanza el quórum, la door de destino entrega el importe equivalente a la cuenta indicada.

## Cuándo usarlo

- Mover XRP o un IOU de la cadena locking a la issuing (bloquear y recibir envuelto).
- Devolver el activo envuelto de la issuing a la locking (quemar y desbloquear).
- Siempre después de tener un claim ID en la cadena de destino; sin él los fondos quedarían en la door sin forma de reclamarlos.

## Cómo funciona por dentro

`XChainCommit::preflight` (en `transactors/bridge/XChainBridge.cpp`):

- `Amount` debe ser positivo y un importe legal (`temBAD_AMOUNT`).
- Su activo debe ser `LockingChainIssue` o `IssuingChainIssue` del `XChainBridge` (`temBAD_ISSUER`).
- `makeTxConsequences` declara como gasto máximo el `Amount` si es XRP.

`XChainCommit::preclaim`:

- Busca el [Bridge](/objects/Bridge) en esta cadena; si no existe, `tecNO_ENTRY`.
- La door no puede hacer commit sobre sí misma (`tecXCHAIN_SELF_COMMIT`).
- Determina si esta cadena es la locking o la issuing comparando la `Account` del Bridge con las doors, y exige que el activo de `Amount` sea el de **este** lado (`tecXCHAIN_BAD_TRANSFER_ISSUE`). Es decir: en la locking chain envías `LockingChainIssue`; en la issuing, `IssuingChainIssue`.

`XChainCommit::doApply` llama a `transferHelper` de tu cuenta a la door con `CanCreateDstPolicy::No` y `DepositAuthPolicy::Normal`:

- Si la door exige destination tag, `tecDST_TAG_NEEDED`; si tiene `lsfDepositAuth` sin preautorizarte, `tecNO_PERMISSION`.
- Para XRP, comprueba `saldo ≥ Amount + reserva` (`tecUNFUNDED_PAYMENT`). Un detalle: se permite que el **fee** de la transacción salga de la reserva (`TransferHelperSubmittingAccountInfo` pasa el saldo previo al fee), pero no el `Amount`.
- Para IOU, ejecuta un `flow` sin paths, sin pago parcial y pagando el emisor la transfer fee; cualquier fallo que no sea `tec`/`ter` se traduce a `tecXCHAIN_PAYMENT_FAILED`.

No comprueba que el claim ID exista (está en la otra cadena) ni que `OtherChainDestination` sea válido: el transactor **no lee** `OtherChainDestination`; solo lo usan los witnesses.

## Campos clave

- **XChainClaimID** — el número del `XChainOwnedClaimID` que creaste en la cadena de destino. Si te equivocas, los witnesses atestiguarán sobre un claim ID que no es tuyo (o que no existe) y no podrás reclamar.
- **Amount** — importe en el activo de esta cadena. El equivalente en la otra cadena tendrá el mismo valor numérico con el otro issue.
- **OtherChainDestination** — opcional. Cuenta de la otra cadena a la que los witnesses deben atestiguar como destino; si lo pones, la entrega es automática al alcanzar quórum. Si lo omites, tendrás que enviar tú [XChainClaim](/tx/XChainClaim) en el destino.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **tecNO_ENTRY** — no hay Bridge con esa especificación en esta cadena.
- **tecXCHAIN_BAD_TRANSFER_ISSUE** — has enviado el activo del otro lado (por ejemplo, el IOU envuelto en la cadena locking).
- **tecXCHAIN_SELF_COMMIT** — la cuenta que firma es la propia door.
- **tecUNFUNDED_PAYMENT** — el `Amount` te dejaría por debajo de la reserva.
- **tecNO_PERMISSION** — la door tiene DepositAuth y no estás preautorizado.
- **temBAD_ISSUER** — el activo de `Amount` no es ninguno de los dos del puente.

## Ejemplo

```json
{
  "TransactionType": "XChainCommit",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTRA_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "XChainClaimID": "1",
  "Amount": "1000000"
}
```

`rYYYY_OTRA_CUENTA` es la door de la cadena locking (esta) y `rZZZZ_EMISOR` la door de la cadena emisora. Bloqueas 1 XRP para el claim ID 1.

## Pruébalo en testnet

1. Carga el ejemplo en el builder. `XChainClaimID` debe ser el que obtuviste con `XChainCreateClaimID` en la cadena de destino.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo.
3. Cuando el amendment se active y exista el puente: tras `tesSUCCESS`, `account_info` de la door mostrará su `Balance` aumentado en `Amount`, y en tu cuenta habrá bajado `Amount + Fee`. No aparece ningún objeto nuevo en `account_objects`.
4. En la otra cadena, observa cómo el `XChainOwnedClaimID` va acumulando entradas en `XChainClaimAttestations` a medida que los witnesses envían atestaciones, hasta que desaparece al completarse la reclamación.

## Relacionado

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim)
- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID)
- [XChainBridge](/amendments/XChainBridge)
