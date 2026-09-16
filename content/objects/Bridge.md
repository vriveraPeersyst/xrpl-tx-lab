---
title: Bridge
summary: Define un puente entre dos cadenas XRPL: la cuenta puerta, el activo que cruza, la recompensa a los testigos y los contadores de reclamaciones.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/bridge
createdBy: XChainCreateBridge
modifiedBy: XChainModifyBridge, XChainCreateClaimID, XChainAccountCreateCommit, XChainAddAccountCreateAttestation
reserve: 1
---

## Qué representa

Un `Bridge` es la mitad de un puente entre dos redes XRPL (por ejemplo, mainnet y una sidechain). Cada cadena tiene su propio objeto `Bridge` en la cuenta *puerta* (door account) de ese lado. El objeto dice qué activo se bloquea en una cadena y se emite en la otra, cuánto cobran los testigos por atestiguar y lleva la cuenta de las reclamaciones para que ningún cruce se cobre dos veces.

Un puente es de tipo "bloquear y emitir": en la cadena de origen los fondos se quedan en la puerta (`LockingChainDoor`) y en la de destino la puerta emisora (`IssuingChainDoor`) crea el token equivalente. Los testigos vigilan una cadena y firman atestaciones para la otra.

**Estado en testnet**: el amendment [XChainBridge](/amendments/XChainBridge) no está activado, así que hoy no puedes crear este objeto en la testnet pública. El código sigue en rippled y lo describimos por completitud.

## Ciclo de vida

- **Creación**: [XChainCreateBridge](/tx/XChainCreateBridge), enviada por la cuenta puerta. `XChainCreateBridge::preclaim` exige que la cuenta sea una de las dos puertas y que no exista ya un puente para ese par puerta/moneda; `doApply` crea el objeto con los contadores a cero y suma 1 a `OwnerCount`.
- **Modificación**: [XChainModifyBridge](/tx/XChainModifyBridge) cambia `SignatureReward` y `MinAccountCreateAmount`. [XChainCreateClaimID](/tx/XChainCreateClaimID) incrementa `XChainClaimID` en la cadena de destino; [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit) incrementa `XChainAccountCreateCount` en la de origen y [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) avanza `XChainAccountClaimCount` en la de destino cuando se completa una creación de cuenta.
- **Borrado**: no hay transacción para borrarlo, y bloquea [AccountDelete](/tx/AccountDelete) de la puerta.

## Campos clave

- **XChainBridge** — la definición completa del puente: `LockingChainDoor`, `LockingChainIssue`, `IssuingChainDoor`, `IssuingChainIssue`. Es la misma en las dos cadenas y forma parte de la clave del objeto.
- **Account** — la puerta de esta cadena (una de las dos del `XChainBridge`).
- **SignatureReward** — XRP (o el activo) que se reparte entre los testigos cuyas atestaciones cuentan para una reclamación. Lo paga quien crea el [XChainOwnedClaimID](/objects/XChainOwnedClaimID).
- **MinAccountCreateAmount** — mínimo para [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit); si falta, las creaciones de cuenta a través del puente están desactivadas.
- **XChainClaimID** — último identificador de reclamación emitido. Cada `XChainCreateClaimID` usa el siguiente.
- **XChainAccountCreateCount** — cuántos `XChainAccountCreateCommit` se han enviado desde esta cadena.
- **XChainAccountClaimCount** — cuántas creaciones de cuenta se han completado en esta cadena. Deben procesarse en orden estricto.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

Con `ledger_entry` pasa la definición del puente y la cuenta puerta:

```json
{ "method": "ledger_entry", "params": [{
  "bridge_account": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
  "bridge": {
    "LockingChainDoor": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rDoorIssuingChainxxxxxxxxxxxxxxxxxxxx",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "ledger_index": "validated"
}] }
```

La clave es `SHA512Half(0x0042 || puerta_de_esta_cadena || moneda)` (`keylet::bridge`). En `account_objects` usa `type: "bridge"`. Respuesta típica:

```json
{
  "node": {
    "LedgerEntryType": "Bridge",
    "Account": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
    "XChainBridge": {
      "LockingChainDoor": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
      "LockingChainIssue": { "currency": "XRP" },
      "IssuingChainDoor": "rDoorIssuingChainxxxxxxxxxxxxxxxxxxxx",
      "IssuingChainIssue": { "currency": "XRP" }
    },
    "SignatureReward": "100",
    "MinAccountCreateAmount": "1000000",
    "XChainClaimID": "0",
    "XChainAccountCreateCount": "3",
    "XChainAccountClaimCount": "3",
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Cuenta como 1 en el `OwnerCount` de la cuenta puerta.

## Relacionado

- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
- [XChainBridge](/amendments/XChainBridge)
