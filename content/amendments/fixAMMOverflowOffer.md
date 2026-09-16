---
title: fixAMMOverflowOffer
summary: Fixes an overflow when calculating the synthetic offer that an AMM projects against the central order book.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammoverflowoffer
---

## What changes

When a payment or an `OfferCreate` crosses liquidity, the payment engine compares the best offer in the central book with the synthetic offer that an [AMM](/objects/AMM) would generate at that same `Quality`. That calculation involves operations on the pool balances that, under certain combinations of extreme balances, could overflow the numeric type used internally and throw an `overflow_error` exception or produce an incorrect result instead of simply indicating that the AMM could not offer at that quality.

fixAMMOverflowOffer corrects that calculation so that, in these extreme combinations, the routing engine treats the situation as "the AMM has no valid offer in this range" instead of overflowing. The practical effect is that payments that traverse pools with very disproportionate balances no longer fail unpredictably.

## Affected transactions and objects

- [Payment](/tx/Payment) and [OfferCreate](/tx/OfferCreate): when calculating synthetic AMM offers during payment routing (`BookStep`, `AMMLiquidity`).
- [AMM](/objects/AMM): the calculation of the offer the pool projects against the order book.

## Status and context

This is a targeted fix to the AMM liquidity engine introduced by the [AMM](/amendments/AMM) amendment: without it, certain pool states with very uneven balances could cause internal failures when routing payments that combined AMM and central book liquidity. It is retired (`XRPL_RETIRE_FIX` in `features.macro`): the fix is now the only possible behavior.
