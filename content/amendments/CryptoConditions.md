---
title: CryptoConditions
summary: Historical amendment that added crypto-conditions to suspended payments (SusPay); no effect of its own since Escrow replaced it.
xrplDocs: https://xrpl.org/resources/known-amendments#cryptoconditions
introducedIn: 0.50.0
---

## What changes

Nothing, on its own. CryptoConditions was designed as a complement to the `SusPay` amendment (suspended payments): it added the ability to lock a payment with an Interledger Protocol *crypto-condition* (a PREIMAGE-SHA-256 hash) and release it by presenting the *fulfillment*. `SusPay` never activated and was replaced by [Escrow](/amendments/Escrow), which already included that support out of the box, so this amendment ended up with no content of its own.

## Affected transactions and objects

- None directly. The functionality it described now lives in the `Condition` field of [EscrowCreate](/tx/EscrowCreate) and the `Condition`/`Fulfillment` fields of [EscrowFinish](/tx/EscrowFinish), on top of the [Escrow](/objects/Escrow) object.

## Status and context

Between 2016 and 2017, Ripple iterated several times on the design of conditional payments: first `SusPay` (0.31.0), then CryptoConditions (0.50.0) to add Interledger's cryptographic conditions, and finally `Escrow` (0.60.0), which merged both into a single amendment with final transaction names. Since the amendment IDs were already published in distributed software, they could not be changed: they were left active and removed from the code in later versions.

Today it appears in rippled's list of retired amendments (`XRPL_RETIRE_FEATURE`). It only has historical interest: if you see its ID in an old ledger, you now know it didn't change any rule. Its sibling [CryptoConditionsSuite](/amendments/CryptoConditionsSuite), which was meant to extend the condition types, is in the same situation.
