---
title: XChainOwnedCreateAccountClaimID
summary: Como XChainOwnedClaimID, pero para crear una cuenta nueva en la cadena de destino a partir de un depósito en la de origen, vía puente.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/xchainownedcreateaccountclaimid
createdBy: sistema (XChainAddAccountCreateAttestation)
modifiedBy: XChainAddAccountCreateAttestation
reserve: 1
---

## Qué representa

Cuando alguien usa un [Bridge](/objects/Bridge) para enviar fondos a una cuenta que **todavía no existe** en la cadena de destino, no basta con reclamar un pago: hay que crear la cuenta primero. `XChainOwnedCreateAccountClaimID` es el equivalente de [XChainOwnedClaimID](/objects/XChainOwnedClaimID) para ese caso: acumula atestaciones de los testigos sobre un depósito de tipo "crear cuenta", y cuando se alcanza el quórum, la propia cadena de destino crea la cuenta y le acredita los fondos automáticamente. A diferencia del flujo normal, aquí no hace falta una transacción de reclamación por parte del beneficiario: el proceso se completa solo, por eso `modifiedBy` no incluye una transacción de "claim" final.

El número de secuencia (`XChainAccountCreateCount`) es un contador estrictamente creciente por puente, para garantizar que las creaciones de cuenta se procesan en el mismo orden en que se depositaron en origen.

## Ciclo de vida

- **Creación**: automática, disparada por la primera [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) que un testigo envía sobre un depósito de tipo "crear cuenta" observado en la cadena de origen (originado por [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)). No existe una transacción de usuario que lo cree de forma explícita, a diferencia de `XChainCreateClaimID`.
- **Acumulación de firmas**: sucesivas [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) de distintos testigos van añadiendo entradas a `XChainCreateAccountAttestations`.
- **Resolución automática**: al alcanzar el quórum configurado en el `Bridge`, la cadena de destino crea la `AccountRoot` de destino (si no existía) y le acredita el importe depositado menos la comisión de creación del puente. El objeto se borra en el mismo paso.

## Campos clave

- **Account** — la cuenta puerta (door account) del puente en la cadena de destino, dueña técnica del objeto.
- **XChainBridge** — el puente al que pertenece esta creación de cuenta.
- **XChainAccountCreateCount** — contador secuencial estricto: las creaciones de cuenta se resuelven en este orden, no en el orden en que llegan las atestaciones.
- **XChainCreateAccountAttestations** — array de firmas de testigos, cada una con la cuenta a crear, el importe depositado y la firma del testigo.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "xchain_owned_create_account_claim_id"` lo devuelve para la cuenta puerta. Con `ledger_entry`, acepta los mismos campos de `bridge` que `XChainOwnedClaimID`, más `xchain_owned_create_account_claim_id` con el contador:

```json
{ "method": "ledger_entry", "params": [{ "xchain_owned_create_account_claim_id": { "locking_chain_door": "rLockingChainDoorAddress", "locking_chain_issue": { "currency": "XRP" }, "issuing_chain_door": "rIssuingChainDoorAddress", "issuing_chain_issue": { "currency": "XRP" }, "xchain_owned_create_account_claim_id": 1 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x004B || puerta_origen || activo_origen || puerta_destino || activo_destino || XChainAccountCreateCount)` (`keylet::xChainCreateAccountClaimID`, namespace `'K'`). Respuesta típica (mientras está pendiente de quórum):

```json
{
  "index": "7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B",
  "node": {
    "LedgerEntryType": "XChainOwnedCreateAccountClaimID",
    "Account": "rIssuingChainDoorAddress",
    "XChainAccountCreateCount": "1",
    "XChainCreateAccountAttestations": [],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) de la cuenta puerta mientras está pendiente.

## Relacionado

- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation)
- [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID)
