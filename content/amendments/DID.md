---
title: DID
summary: Adds decentralized identifiers (W3C DID) to the ledger - each account can publish and update a DID document.
xls: XLS-0040
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0040-decentralized-identity
xrplDocs: https://xrpl.org/resources/known-amendments#did
introducedIn: 2.0.0
---

## What changes

Adds the `DID` object, at most one per account, which represents the identifier `did:xrpl:1:<address>`. `DIDSet` creates or updates it with up to three optional hexadecimal fields: `DIDDocument` (the embedded DID document), `URI` (where to find it off-chain), and `Data` (attestations or other data). At least one must be left with content; a `DIDSet` that would leave the object empty is rejected with `tecEMPTY_DID`, a behavior later reinforced by `fixEmptyDID`. `DIDDelete` removes the object and frees its reserve.

## Affected transactions and objects

- New: [DIDSet](/tx/DIDSet) and [DIDDelete](/tx/DIDDelete).
- New object [DID](/objects/DID), which consumes one unit of owner reserve and appears in the account's directory.
- An account with a DID cannot be deleted with [AccountDelete](/tx/AccountDelete) until it is removed.

## Status and context

W3C DIDs make it possible to identify a person, organization, or device without relying on a central authority: the subject controls the identifier and its associated keys. Anchoring the DID document to an XRPL account gives a verifiable root of trust for verifiable credentials and identity flows. XLS-40 was proposed as a low-level identity building block; [Credentials](/amendments/Credentials) came later to express specific assertions about an account and link them to deposit authorization.
