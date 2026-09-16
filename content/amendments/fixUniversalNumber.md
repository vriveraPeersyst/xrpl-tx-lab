---
title: fixUniversalNumber
summary: Fixes the loss of precision in the internal Number type used in AMM calculations and other ledger arithmetic operations.
xrplDocs: https://xrpl.org/resources/known-amendments#fixuniversalnumber
---

## What changes

`Number` is the internal type rippled uses to perform high-precision arithmetic (mantissa + exponent) for operations that do not fit well in `STAmount`, such as computing AMM prices and ratios. Before this fix, certain `Number` operations (chained multiplications and divisions, conversions between representations) could lose precision or round inconsistently, which resulted in slightly different results depending on the calculation path taken.

With fixUniversalNumber enabled, the `Number` implementation fixes those calculation paths so that rounding is consistent and no significant digits are lost in intermediate operations. The fix does not change the type's public interface, only the accuracy of its internal operations.

## Affected transactions and objects

It does not introduce or modify transactions or objects directly. It affects any transaction whose calculation goes through `Number`, mainly those related to the [AMM](/amendments/AMM): [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMBid](/tx/AMMBid), and offer crossing against an [AMM](/objects/AMM) within the [Flow](/amendments/Flow) engine.

## Status and context

It was proposed shortly after the AMM was enabled, when heavy use of `Number` in pool price calculations revealed edge cases where rounding did not behave as expected. Being an internal precision fix, it does not change the format of any transaction: two nodes with and without the fix can arrive at slightly different results in the same AMM calculations, which is why it needs to be an amendment rather than a simple client patch.
