---
title: XChainOwnedClaimID
summary: Un identificador de reclamación para un cruce de cadena vía puente: acumula las firmas (attestations) de los testigos hasta que hay suficientes para liberar los fondos.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/xchainownedclaimid
createdBy: XChainCreateClaimID
modifiedBy: XChainAddClaimAttestation, XChainClaim
reserve: 1
---

## Qué representa

Cuando alguien mueve fondos de una cadena a otra a través de un [Bridge](/objects/Bridge) (por ejemplo, entre XRPL mainnet y una sidechain), el proceso no es atómico: primero se deposita en la cadena de origen ([XChainCommit](/tx/XChainCommit)), y luego hace falta que suficientes testigos (witness servers) atestigüen ese depósito en la cadena de destino antes de liberar los fondos. `XChainOwnedClaimID` es el contenedor de esas atestaciones para una operación concreta: mientras no se junten suficientes firmas (según el quórum configurado en el `Bridge`), los fondos no se liberan.

El `XChainClaimID` en sí (un número) no lo elige el usuario: lo asigna la cadena de destino de forma incremental al crear el objeto.

## Ciclo de vida

- **Creación**: [XChainCreateClaimID](/tx/XChainCreateClaimID), en la cadena de destino, antes de depositar en origen. Fija `OtherChainSource` (quién va a depositar en la cadena de origen) y paga `SignatureReward` por adelantado, la recompensa que se repartirá entre los testigos que atestigüen correctamente.
- **Acumulación de firmas**: [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), enviado por cada testigo (normalmente de forma automática por el software de witness), añade una entrada a `XChainClaimAttestations` con su firma sobre el depósito observado en la cadena de origen.
- **Liberación**: [XChainClaim](/tx/XChainClaim), por el beneficiario, una vez `XChainClaimAttestations` alcanza el quórum. Libera los fondos hacia el destino final y borra el objeto.
- **Borrado en cascada**: [AccountDelete](/tx/AccountDelete) del `Account` falla si aún tiene claim IDs pendientes sin resolver.

## Campos clave

- **Account** — quien creó el claim ID en la cadena de destino (no necesariamente el beneficiario final).
- **XChainBridge** — qué puente (par de cuentas puerta y monedas en ambas cadenas) usa esta reclamación.
- **XChainClaimID** — número asignado secuencialmente por la cadena de destino; junto con `XChainBridge` forma la clave del objeto.
- **OtherChainSource** — la cuenta que se espera que deposite en la cadena de origen; solo sus atestaciones de depósito son válidas para este claim ID.
- **XChainClaimAttestations** — array de firmas de testigos recibidas hasta ahora, cada una con el testigo, el importe observado y su firma.
- **SignatureReward** — recompensa pagada por adelantado, repartida entre los testigos cuyas atestaciones se usan para completar el quórum.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "xchain_owned_claim_id"` lo devuelve para `Account`. Con `ledger_entry`, `xchain_owned_claim_id` acepta los campos del `bridge` (`locking_chain_door`, `locking_chain_issue`, `issuing_chain_door`, `issuing_chain_issue`) más `xchain_owned_claim_id` con el número:

```json
{ "method": "ledger_entry", "params": [{ "xchain_owned_claim_id": { "locking_chain_door": "rLockingChainDoorAddress", "locking_chain_issue": { "currency": "XRP" }, "issuing_chain_door": "rIssuingChainDoorAddress", "issuing_chain_issue": { "currency": "XRP" }, "xchain_owned_claim_id": 1 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0051 || puerta_origen || activo_origen || puerta_destino || activo_destino || XChainClaimID)` (`keylet::xChainClaimID`, namespace `'Q'`). Respuesta típica:

```json
{
  "index": "6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A",
  "node": {
    "LedgerEntryType": "XChainOwnedClaimID",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "XChainClaimID": "1",
    "OtherChainSource": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "SignatureReward": "100",
    "XChainClaimAttestations": [],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) de `Account`.

## Relacionado

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim), [XChainCommit](/tx/XChainCommit)
- [Bridge](/objects/Bridge), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
