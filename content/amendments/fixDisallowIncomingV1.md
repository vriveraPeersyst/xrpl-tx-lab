---
title: fixDisallowIncomingV1
summary: Fixes an issue where an account's lsfDisallowIncoming* flags did not block the creation of new trustlines via TrustSet.
xrplDocs: https://xrpl.org/resources/known-amendments#fixdisallowincomingv1
---

## What changes

The [DisallowIncoming](/amendments/DisallowIncoming) amendment added account flags such as `asfDisallowIncomingTrustline` so that an issuer could reject unwanted incoming objects. However, its original implementation had a gap: when a user created a trustline toward an issuer with `lsfDisallowIncomingTrustline` enabled via [TrustSet](/tx/TrustSet), the operation was still allowed if the trustline did not imply a balance against the issuer, letting through trust lines that the flag was supposed to prevent. `fixDisallowIncomingV1` fixes this case so that `TrustSet` also respects the flag when creating a new trustline, not only in indirect flows such as offer crossing.

## Affected transactions and objects

- [TrustSet](/tx/TrustSet): checks the issuer's `lsfDisallowIncomingTrustline` before creating the trustline.
- [AccountRoot](/objects/AccountRoot): the `lsfDisallowIncomingTrustline`, `lsfDisallowIncomingNFTokenOffer`, `lsfDisallowIncomingCheck`, and `lsfDisallowIncomingPayChan` flags now apply consistently across all object-creation paths.

## Status and context

Fixes a bug in the initial implementation of DisallowIncoming: without this fix, an account that had enabled `asfDisallowIncomingTrustline` to avoid accumulating unsolicited trust lines could still end up receiving them via a direct TrustSet. In the current code the amendment is retired (`XRPL_RETIRE_FIX(DisallowIncomingV1)` in `features.macro`): the corrected behavior is now the only one that exists, and no code branch remains conditioned on it, except references in tests that document the original bug.
