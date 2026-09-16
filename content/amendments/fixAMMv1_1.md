---
title: fixAMMv1_1
summary: Fixes several AMM precision and consistency issues: rounding for the last liquidity provider, negative amounts in accountSendIOU, and the quality of synthetic offers against the central book.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_1
---

## What changes

Groups several fixes to the AMM introduced by [AMM](/amendments/AMM). In [AMMWithdraw](/tx/AMMWithdraw), accumulated rounding could cause the `LPTokenBalance` of the `AMM` object to not exactly match the actual balance in the last liquidity provider's trustline; with the fix active, `verifyAndAdjustLPTokenBalance` compares both values and adjusts the stored `LPTokenBalance` when the difference is small, or rejects the withdrawal with `tecAMM_INVALID_TOKENS` if it is too large. It also adds a defensive check that prevents withdrawing more LP tokens than the pool has on record (`tecINTERNAL` if that were to happen, something that should not occur except due to an internal error).

In addition, `accountSendIOU` now explicitly rejects with `tecINTERNAL` any attempt to move a negative amount or an MPT through this path, which is meant only for IOUs, closing off a path to inconsistent states. Finally, it adjusts how the quality of an AMM's synthetic offer is compared against the best offer in the central book in `BookStep`, so that the choice between AMM and CLOB is consistent in edge cases with very close `Quality` values.

## Affected transactions and objects

- [AMMWithdraw](/tx/AMMWithdraw): adjustment of the last liquidity provider's `LPTokenBalance`.
- [Payment](/tx/Payment) and [OfferCreate](/tx/OfferCreate): quality comparison between AMM and central book offers during routing.
- [AMM](/objects/AMM): consistency of its `LPTokenBalance`.

## Status and context

This is a package of numerical precision fixes to the AMM, detected after the initial deployment of the [AMM](/amendments/AMM) amendment: without them, withdrawal operations under edge conditions could leave the pool with a slightly inconsistent LP token balance or lead to suboptimal routing decisions against the order book.
