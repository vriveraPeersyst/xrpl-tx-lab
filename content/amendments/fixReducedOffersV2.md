---
title: fixReducedOffersV2
summary: Extends fixReducedOffersV1 with another rounding case that could still block the offer book.
xrplDocs: https://xrpl.org/resources/known-amendments#fixreducedoffersv2
---

## What changes

[fixReducedOffersV1](/amendments/fixReducedOffersV1) fixed the rounding when reducing an offer's size after a partial crossing so that its quality would never worsen, but it left an additional case uncovered in which the same problem could occur again. fixReducedOffersV2 addresses that remaining case.

In the current code, the effect is visible in AMM liquidity used within a path: `AMMOffer::limitIn` uses `quality().ceilInStrict(...)` instead of `quality().ceilIn(...)` when the amendment is enabled and the route passes through more than one pool or combines AMM with the offer book (`multiPath()`), which applies strict rounding that avoids generating a synthetic AMM offer with worse quality than the pool's theoretical quality.

## Affected transactions and objects

- [Payment](/tx/Payment) with paths that combine an [AMM](/objects/AMM) with other liquidity sources (another AMM or the offer book): affects the calculated size of the synthetic offer that represents the pool in that leg of the route.
- [OfferCreate](/tx/OfferCreate) with `tfSell`/paths that cross AMM liquidity.

## Status and context

This is the direct continuation of fixReducedOffersV1: the same underlying problem (a rounding-reduced offer can end up with worse quality than the original and block that price level in the book), but applied to a second case that the first fix did not cover, mainly in routes with AMM liquidity.
