---
title: fixInvalidTxFlags
summary: Requires validation of the flags on Credential and SignerListSet transactions, rejecting undefined combinations.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinvalidtxflags
---

## What changes

Many XRPL transactions check in `preflight` that the `Flags` field does not contain bits outside those defined for that transaction, returning `temINVALID_FLAG` if it does. [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete), and [SignerListSet](/tx/SignerListSet) did not apply this check: their `getFlagsMask` returned `0` without `fixInvalidTxFlags`, so any value in `Flags` passed without rejection even if it did not correspond to any valid flag for those transactions.

With the amendment active, `getFlagsMask` returns `tfUniversalMask` for these four transactions, so the common preflight engine rejects with `temINVALID_FLAG` any bit in `Flags` that is not among the universally allowed ones. This is a defensive validation: it closes a path through which transactions with malformed or contradictory flags could be submitted without the server detecting them at the earliest check stage.

## Affected transactions and objects

- [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete): `Flags` validation in `preflight`.
- [SignerListSet](/tx/SignerListSet): same `Flags` validation.

## Status and context

It was introduced alongside the [Credentials](/amendments/Credentials) amendment, fixing an oversight in the flag validation of the new credential transactions, and taking the opportunity to close the same gap in `SignerListSet`. Without this fix, a client could build a transaction with an invalid `Flags` value and the node would accept it instead of rejecting it early with `temINVALID_FLAG`.
