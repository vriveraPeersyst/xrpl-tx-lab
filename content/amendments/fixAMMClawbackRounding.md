---
title: fixAMMClawbackRounding
summary: Fixes the rounding of the proportional withdrawal from an AMM pool when clawing back LP tokens from a frozen holder.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammclawbackrounding
---

## What changes

[AMMClawback](/tx/AMMClawback) lets an issuer with `lsfAllowTrustLineClawback` recover a holder's LP tokens and withdraw their proportional share of the pool. Before this fix, the calculation of that proportional share could accumulate rounding errors that left the `AMM` with an `LPTokenBalance` inconsistent with the actual sum of the remaining LPs' balances, especially when the affected holder was the sole liquidity provider or was left with a minimal residual balance.

With the amendment active, `AMMClawback::preclaim` calculates the holder's actual `lpTokenBalance` within the amendment's own branch and calls `verifyAndAdjustLPTokenBalance`, which compares that balance against the `AMM` object's `LPTokenBalance` and adjusts it if the difference is small (within a relative distance of `10^-3`), or rejects with `tecAMM_INVALID_TOKENS` if the discrepancy is too large. In the final withdrawal, `getRoundedLPTokens` explicitly rounds the tokens to be withdrawn and adjusts the withdrawn fraction (`adjustFracByTokens`) before calculating each asset's amounts.

## Affected transactions and objects

- [AMMClawback](/tx/AMMClawback): recalculates and adjusts the `LPTokenBalance` before performing the withdrawal.
- [AMM](/objects/AMM): its `LPTokenBalance` is corrected to reflect the actual balance after the clawback.

## Status and context

This is a targeted numerical-precision fix in the AMM engine: without it, a repeated clawback or one with very small residual balances could leave the pool with an `LPTokenBalance` that didn't match the tokens actually in circulation — a state the AMM's invariant checks could end up rejecting.
