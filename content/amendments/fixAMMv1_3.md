---
title: fixAMMv1_3
summary: Changes the rounding of the AMM's internal calculations to "always round down", so that deposits and withdrawals never benefit the user at the pool's expense.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_3
---

## What changes

The AMM's calculations of LP tokens and asset amounts use precision arithmetic with a configurable rounding mode (`Number::RoundingMode`). Before this fix, that rounding could follow the process's global default mode, which in certain [AMMDeposit](/tx/AMMDeposit) and [AMMWithdraw](/tx/AMMWithdraw) calculations could round in favor of the user and against the pool, allowing, with enough repeated operations, value to be extracted from the AMM through the accumulation of favorable rounding.

With fixAMMv1_3 active, `AMMHelpers` forces `Number::RoundingMode::Downward` in the affected calculations: the LP tokens credited in a deposit and the asset amounts delivered in a withdrawal are always rounded down. If, after the adjustment, a deposit or withdrawal would result in zero tokens or zero amount, the transaction is rejected (for example with `tecAMM_INVALID_TOKENS`) instead of completing with a null or negative result for the pool.

## Affected transactions and objects

- [AMMDeposit](/tx/AMMDeposit) and [AMMWithdraw](/tx/AMMWithdraw): consistent downward rounding of LP tokens and asset amounts.
- [AMM](/objects/AMM): its `LPTokenBalance` and the balances of the pool's two assets are protected against drainage through rounding.

## Status and context

This is a fix for the AMM's economic soundness: it guarantees that rounding never works in favor of the individual user and against the pool's other liquidity providers, closing a theoretical avenue for value extraction through repeated small-amount operations.
