---
title: fixEmptyDID
summary: Prevents creating a completely empty DID object, with no URI, DIDDocument, or Data.
xrplDocs: https://xrpl.org/resources/known-amendments#fixemptydid
---

## What changes

[DIDSet](/tx/DIDSet) creates or updates a [DID](/objects/DID) object by copying the optional `URI`, `DIDDocument`, and `Data` fields that are present and non-empty in the transaction. Before this fix, it was possible to send a `DIDSet` without any of these three fields (or with all of them empty) for an account that did not yet have a DID, and the transactor would still create the object in the ledger, with no useful data inside it. With `fixEmptyDID` active, if after applying the fields the resulting `DID` has neither `URI`, `DIDDocument`, nor `Data`, the transaction fails with `tecEMPTY_DID` instead of creating the empty object.

## Affected transactions and objects

- [DIDSet](/tx/DIDSet): validates that the resulting DID has at least one of `URI`, `DIDDocument`, or `Data`.
- [DID](/objects/DID): can no longer exist as an empty object in the ledger.

## Status and context

A `DID` with no data field is useless: the object exists only to reference identity or credentials off-chain, and without `URI`/`DIDDocument`/`Data` it points to nothing. Allowing it to be created empty consumed owner reserve without providing any information and could confuse anyone querying the object expecting to find at least one pointer to the data. The fix closes that edge case by returning an explicit error code, `tecEMPTY_DID`, instead of silently accepting the transaction.
