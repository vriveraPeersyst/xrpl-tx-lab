---
title: fixExpiredNFTokenOfferRemoval
summary: Lets expired NFToken offers be removed cleanly and stops them from blocking related operations.
xrplDocs: https://xrpl.org/resources/known-amendments
---

## What changes

An [NFTokenOffer](/objects/NFTokenOffer) with a past `Expiration` could linger and, in some paths, interfere with accepting or cancelling other offers. With the fix, expired offers are treated as removable by anyone through [NFTokenCancelOffer](/tx/NFTokenCancelOffer) and are skipped consistently by [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), returning the owner reserve to the offer creator.

## Affected transactions and objects

- [NFTokenCancelOffer](/tx/NFTokenCancelOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer).
- [NFTokenOffer](/objects/NFTokenOffer).

## Status and context

Present on the 3.2.0 preview build running on WASM Devnet. On newer builds the change has been absorbed into later fix amendments (see the fixCleanup series), so the identifier does not appear on Testnet or Devnet.
