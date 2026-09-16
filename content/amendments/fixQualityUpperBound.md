---
title: fixQualityUpperBound
summary: Fixes the calculation of an upper quality bound used when estimating payment steps that convert currency.
xrplDocs: https://xrpl.org/resources/known-amendments#fixqualityupperbound
---

## What changes

The pathfinding payment engine estimates, for each step of a route that changes currency, an upper bound on "quality" (the best possible exchange rate, output/input) in order to discard ahead of time routes that cannot improve on the result already found. fixQualityUpperBound fixes a bug in that bound calculation, which could be miscalculated for some currency-conversion steps.

According to xrpl.org documentation, the affected code was part of an estimation path that in practice was never actually executed by the current payment engine, so the fix has no observable impact on the outcome of transactions: it fixes the bug in the code, but does not change the behavior of any real [Payment](/tx/Payment).

## Affected transactions and objects

- [Payment](/tx/Payment) with paths that cross more than one currency: the internal calculation of the quality bound, with no observable effect on the final result.
- [OfferCreate](/tx/OfferCreate): shares the quality-calculation engine used to cross and chain offers.

## Status and context

This is one of the payment engine's maintenance fixes: it corrects an internal formula without changing the outcome of transactions, as rippled documentation explicitly notes it "has no known impact on transaction processing." It serves as code hygiene and as a more correct foundation for future changes to route quality calculation.
