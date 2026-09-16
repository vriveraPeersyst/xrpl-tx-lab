---
title: fixReducedOffersV1
summary: Fixes rounding when reducing an offer's size so that its quality never worsens relative to the original.
xrplDocs: https://xrpl.org/resources/known-amendments#fixreducedoffersv1
---

## What changes

When the payment pathfinding Flow engine partially crosses an [Offer](/objects/Offer), it computes a "reduced" version of that offer with less amount on both sides. That calculation involves rounding, and before this fix the rounding could produce a reduced offer with a slightly worse quality (the `TakerPays`/`TakerGets` rate) than the original offer. A reduced offer with worse quality than the best offer available in the book effectively blocked that price level: it stayed there unable to be crossed, but was not removed either.

With fixReducedOffersV1 enabled, the rounding is adjusted so that the quality of the reduced offer is always equal to or better than that of the original offer, so it never worsens relative to the price the offer's creator originally accepted.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate) and [Payment](/tx/Payment) with paths: the calculation of an offer's reduced size when it is partially crossed.
- [Offer](/objects/Offer): the object that remains on the ledger after a partial crossing.

## Status and context

Fixes a bug in the Flow engine that could leave offer books effectively blocked at a price level due to a residual offer with worse quality than it should have. [fixReducedOffersV2](/amendments/fixReducedOffersV2) extends this same correction to another rounding case that this fix did not cover.
