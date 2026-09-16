---
title: fixTakerDryOfferRemoval
summary: Fixes autobridging so it removes dry offers from the book instead of leaving them there.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtakerdryofferremoval
---

## What changes

The offer-crossing engine uses autobridging to chain two offers through XRP when there is no direct offer between two tokens that is just as good. While traversing the book, it can encounter a "dry" offer: an offer whose issuer no longer has sufficient funds or trust line to deliver what it offers, even though the object is still on the ledger. Before this fix, the taker could treat those dry offers as simply not crossable and skip them without removing them from the book.

With fixTakerDryOfferRemoval enabled, the taker removes from the book the dry offers it encounters while traversing it during autobridging, the same way it already does during normal offer crossing when an offer is detected as unable to deliver funds.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate) and [Payment](/tx/Payment) with paths that use autobridging through XRP.
- [Offer](/objects/Offer): unfunded offers found during that traversal are removed from the ledger instead of remaining as noise.

## Status and context

Without this fix, the offer book could accumulate dry offers that autobridging identified but did not clean up, forcing them to be traversed again and again in successive crossings without providing real liquidity. The fix aligns autobridging's behavior with that of direct offer crossing.
