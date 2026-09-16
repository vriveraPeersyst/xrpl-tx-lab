---
title: DID
summary: El identificador descentralizado de una cuenta: apunta a un documento DID (W3C) o lo incrusta directamente.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/did
createdBy: DIDSet
modifiedBy: DIDSet, DIDDelete
reserve: 1
---

## Qué representa

Un `DID` (Decentralized Identifier) es la forma de asociar una identidad W3C a una cuenta XRPL. El identificador es `did:xrpl:1:<dirección>`, y este objeto es lo que un *resolver* consulta para obtener el documento DID: las claves públicas, servicios y métodos de verificación de esa identidad.

Cada cuenta puede tener como mucho un `DID`. El documento puede vivir fuera de cadena (`URI`), ir incrustado (`DIDDocument`) o dejarse como datos libres (`Data`), pero tiene que haber al menos uno de los tres.

## Ciclo de vida

- **Creación y modificación**: la misma transacción, [DIDSet](/tx/DIDSet). Si no existe el objeto, `DIDSet::doApply` lo crea, lo enlaza en el directorio de la cuenta y suma 1 al `OwnerCount`. Si existe, actualiza los campos presentes: un campo enviado como cadena vacía se elimina; uno omitido se conserva. `preflight` rechaza una `DIDSet` sin ninguno de los tres campos (`temEMPTY_DID`), y con [fixEmptyDID](/amendments/fixEmptyDID) también rechaza dejar el objeto vacío al modificarlo (`tecEMPTY_DID`).
- **Borrado**: [DIDDelete](/tx/DIDDelete) elimina el objeto y devuelve la reserva. [AccountDelete](/tx/AccountDelete) también lo borra en cascada.

## Campos clave

- **Account** — dueño de la identidad. Es la única cuenta que puede modificar o borrar el objeto, y es lo único que entra en la clave.
- **DIDDocument** — documento DID en hex, máximo 256 bytes. Para documentos reales suele ser insuficiente; por eso lo habitual es usar `URI`.
- **URI** — hex de hasta 256 bytes con la ubicación del documento (IPFS, HTTPS…).
- **Data** — hex de hasta 256 bytes de uso libre, por ejemplo una prueba de control o metadatos.

Los tres son opcionales individualmente pero no a la vez.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "did"`, o `ledger_entry` con la dirección:

```json
{ "method": "ledger_entry", "params": [{ "did": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ledger_index": "validated" }] }
```

La clave es `SHA512Half(0x0049 || AccountID)` (`keylet::did`). Respuesta típica:

```json
{
  "index": "E6E7F1C4E2B9F0AB0C5A2B7E3D9C1F5A8B4D6E2C0F9A7B3D5E1C8F4A6B2D0E9C",
  "node": {
    "LedgerEntryType": "DID",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "URI": "697066733A2F2F62616679626569636B6E6D6F",
    "Data": "7B226E616D65223A2270656572737973742D746573746E6574227D",
    "Flags": 0,
    "OwnerNode": "0",
    "PreviousTxnID": "9C8B7A6F5E4D3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B3A2F1E0D9C8B",
    "PreviousTxnLgrSeq": 20800130
  }
}
```

## Reserva

1 unidad de reserva de propietario (0,2 XRP en testnet) mientras exista.

## Relacionado

- [DIDSet](/tx/DIDSet), [DIDDelete](/tx/DIDDelete)
- [Credential](/objects/Credential), [AccountRoot](/objects/AccountRoot)
- [DID](/amendments/DID), [fixEmptyDID](/amendments/fixEmptyDID)
