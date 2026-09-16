---
title: fixPermissionedDomainInvariant
summary: Adds an invariant check so a PermissionedDomain can never be left in an inconsistent state.
xrplDocs: https://xrpl.org/resources/known-amendments
---

## What changes

Extends the ledger invariant checks that run after every transaction with rules for [PermissionedDomain](/objects/PermissionedDomain) objects: a domain must always keep a valid, non-empty `AcceptedCredentials` list within limits and a correct owner link, otherwise the transaction is rejected with `tecINVARIANT_FAILED` instead of writing a corrupt object.

## Affected transactions and objects

- [PermissionedDomainSet](/tx/PermissionedDomainSet), [PermissionedDomainDelete](/tx/PermissionedDomainDelete).
- [PermissionedDomain](/objects/PermissionedDomain).

## Status and context

Present on the 3.2.0 preview build running on WASM Devnet. Newer builds ship the same protection inside the general invariant set (fixCleanup series), so the identifier is not listed on Testnet or Devnet.
