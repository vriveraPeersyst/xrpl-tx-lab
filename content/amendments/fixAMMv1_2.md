---
title: fixAMMv1_2
summary: Requires checking and covering the trustline or MPToken reserve when withdrawing from an AMM, and expands when the pool can offer its maximum size against the central book.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_2
---

## What changes

When executing [AMMWithdraw](/tx/AMMWithdraw), the withdrawn asset may require creating a new trustline or `MPToken` on the withdrawing account if it did not already have one. Before this fix, that reserve check was not performed explicitly for all cases; with the amendment active, `sufficientReserve` checks before the withdrawal whether a `RippleState` (trustline) or an `MPToken` needs to be created for the received asset and, if the `MPToken` does not exist, requires that it already be authorized by the issuer. This prevents a withdrawal from leaving the account unable to receive the asset or from consuming reserve unexpectedly midway through the operation.

It also adjusts `AMMLiquidity` so that, when there is no clear offer from the central book (`clobQuality`) to compare against, the AMM can directly propose its maximum-size offer (`maxOffer`) in more situations, improving how much of the pool's liquidity is actually made available for payment routing.

## Affected transactions and objects

- [AMMWithdraw](/tx/AMMWithdraw): reserve check for a trustline or MPToken before withdrawing.
- [Payment](/tx/Payment): calculation of the maximum offer an AMM projects against the order book.
- [RippleState](/objects/RippleState) and `MPToken`: may be created as part of the withdrawal if missing.

## Status and context

Fixes a case where an AMM withdrawal into an asset new to the account could complete without the required reserve or authorization, or where the AMM offered less liquidity than it could actually provide due to the lack of an explicit comparison with the central book.
