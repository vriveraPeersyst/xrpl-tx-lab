---
title: XRPFees
summary: Changes the FeeSettings object and the ttFEE transaction to express the base fee and reserve directly in drops, removing the "fee units" layer of indirection.
xrplDocs: https://xrpl.org/resources/known-amendments#xrpfees
---

## What changes

Before this amendment, the `FeeSettings` object stored `BaseFee` (in drops) together with `ReferenceFeeUnits`, and a transaction's actual cost was calculated by multiplying each transaction's own "fee units" by that `BaseFee`/`ReferenceFeeUnits` ratio. XRPFees removes that layer of indirection: with the amendment active, `FeeSettings` now stores `BaseFeeDrops`, `ReserveBaseDrops`, and `ReserveIncrementDrops` directly in drops, and the old fields (`BaseFee`, `ReferenceFeeUnits`, `ReserveBase`, `ReserveIncrement`) are removed from the object (`makeFieldAbsent` in `Change::applyFee`).

The transaction that adjusts these network parameters (`ttFEE`, triggered by validator voting) requires, once `featureXRPFees` is enabled, that `BaseFeeDrops`, `ReserveBaseDrops`, and `ReserveIncrementDrops` be present (they were previously optional) and rejects with `temMALFORMED` if they are missing; conversely, it does not allow populating the new fields before the amendment is active. Ledger genesis (`Ledger::Ledger`) also branches: if `featureXRPFees` is among the initial amendments, it starts directly with the fields in drops.

This amendment changes the data representation, not the fee-scaling mechanism under load: that is handled independently by FeeEscalation.

## Affected transactions and objects

- System transaction `ttFEE` (network fee voting): new fields `BaseFeeDrops`, `ReserveBaseDrops`, `ReserveIncrementDrops`, mandatory once the amendment is active.
- [FeeSettings](/objects/FeeSettings): replaces `BaseFee`/`ReferenceFeeUnits`/`ReserveBase`/`ReserveIncrement` with the drops-based fields.

## Status and context

Simplifies how the network expresses and updates its base economic parameters (minimum transaction cost and account/owner reserves), removing the need to multiply by a "units" factor inherited from an era when different transaction types could weigh differently in fee units. With XRPFees, validators vote and the ledger directly stores how many drops each concept costs, without intermediate arithmetic.
