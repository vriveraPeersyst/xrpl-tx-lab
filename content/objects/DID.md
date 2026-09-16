---
title: DID
summary: An account's decentralized identifier: it points to a DID (W3C) document or embeds it directly.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/did
createdBy: DIDSet
modifiedBy: DIDSet, DIDDelete
reserve: 1
---

## What it represents

A `DID` (Decentralized Identifier) is the way to associate a W3C identity with an XRPL account. The identifier is `did:xrpl:1:<address>`, and this object is what a *resolver* queries to obtain the DID document: the public keys, services, and verification methods of that identity.

Each account can have at most one `DID`. The document can live off-chain (`URI`), be embedded (`DIDDocument`), or be left as free-form data (`Data`), but at least one of the three must be present.

## Lifecycle

- **Creation and modification**: the same transaction, [DIDSet](/tx/DIDSet). If the object doesn't exist, `DIDSet::doApply` creates it, links it into the account's directory, and adds 1 to `OwnerCount`. If it exists, it updates the fields present: a field sent as an empty string is removed; one that's omitted is kept unchanged. `preflight` rejects a `DIDSet` with none of the three fields (`temEMPTY_DID`), and with [fixEmptyDID](/amendments/fixEmptyDID) it also rejects leaving the object empty when modifying it (`tecEMPTY_DID`).
- **Deletion**: [DIDDelete](/tx/DIDDelete) removes the object and returns the reserve. [AccountDelete](/tx/AccountDelete) also deletes it in cascade.

## Key fields

- **Account** — owner of the identity. It's the only account that can modify or delete the object, and it's the only thing that goes into the key.
- **DIDDocument** — DID document in hex, up to 256 bytes. For real documents this is usually insufficient; that's why `URI` is the usual choice.
- **URI** — up to 256 bytes of hex with the document's location (IPFS, HTTPS…).
- **Data** — up to 256 bytes of hex for free use, for example a proof of control or metadata.

All three are individually optional but not all at once.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "did"`, or `ledger_entry` with the address:

```json
{ "method": "ledger_entry", "params": [{ "did": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ledger_index": "validated" }] }
```

The key is `SHA512Half(0x0049 || AccountID)` (`keylet::did`). Typical response:

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

## Reserve

1 owner reserve unit (0.2 XRP on testnet) while it exists.

## Related

- [DIDSet](/tx/DIDSet), [DIDDelete](/tx/DIDDelete)
- [Credential](/objects/Credential), [AccountRoot](/objects/AccountRoot)
- [DID](/amendments/DID), [fixEmptyDID](/amendments/fixEmptyDID)
</content>
</invoke>
