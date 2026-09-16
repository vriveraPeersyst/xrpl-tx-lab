---
title: fixRmSmallIncreasedQOffers
summary: Removes from the book tiny residual offers whose quality ended up abnormally high after a partial crossing.
xrplDocs: https://xrpl.org/resources/known-amendments#fixrmsmallincreasedqoffers
---

## What changes

When an [Offer](/objects/Offer) is partially crossed, a remainder with a very small amount can be left in the book. Before this fix, that remainder could have a quality (the `TakerPays`/`TakerGets` rate) very different from, and notably worse than, that of the original offer, as a consequence of rounding when reducing its amounts. Being a tiny amount, neither normal crossing transactions nor pathfinding payments removed it from the book through the usual channel used to remove fully consumed or unfunded offers: it stayed there, occupying that price level without providing real liquidity.

With fixRmSmallIncreasedQOffers enabled, this type of residual offer is detected and removed from the book the same way fully consumed or unfunded offers already are, instead of leaving them orphaned on the ledger.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate) and [Payment](/tx/Payment) with paths: when crossing an offer, the engine checks whether the resulting remainder falls into this case and removes it.
- [Offer](/objects/Offer): no longer accumulates phantom entries with minimal amount and degraded quality.

## Status and context

This is an offer book hygiene fix: without it, successive partial crossings could leave the DEX dotted with tiny offers with anomalous quality that did not clean themselves up, complicating reading the book and computing payment routes over it.
