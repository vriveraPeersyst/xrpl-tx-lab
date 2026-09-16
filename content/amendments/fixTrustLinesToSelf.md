---
title: fixTrustLinesToSelf
summary: Deletes two trustlines from an account to itself created by an old bug and prevents them from being created again.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtrustlinestoself
---

## What changes

A trustline (a [RippleState](/objects/RippleState) object) represents a trust relationship between two distinct accounts for a token; it makes no sense for an account to have a trustline with itself. An old bug allowed, in a very small number of specific cases, trustlines of that kind to be created, with the account itself as both issuer and holder.

fixTrustLinesToSelf does two things when enabled: it directly deletes from the ledger the known trustlines affected by that bug (identified by their object key), and it strengthens validation in [TrustSet](/tx/TrustSet) so that a transaction attempting to create or modify a trustline where `Account` and the issuer of `LimitAmount` coincide is rejected, closing the avenue that allowed the original problem.

## Affected transactions and objects

- [TrustSet](/tx/TrustSet): rejects trustlines where the account and the limit's issuer are the same account.
- [RippleState](/objects/RippleState): removes from the ledger the specific entries affected by the bug.

## Status and context

This is a one-off cleanup fix: it corrects an inconsistent state inherited from a historical bug and closes the avenue that allowed it, without changing the behavior of normal trustlines between distinct accounts.
