---
title: fixFillOrKill
summary: Fixes offer crossing with the tfFillOrKill flag so it is not wrongly killed when the TakerGets is not fully spent.
xrplDocs: https://xrpl.org/resources/known-amendments#fixfillorkill
---

## What changes

An [OfferCreate](/tx/OfferCreate) with `tfFillOrKill` must be executed in full or not at all. The offer-crossing engine (`flowCross`, in `StrandFlow`) mishandled this combination when `tfSell` was also present: the previous implementation required the incoming offer's entire `TakerGets` to be spent for it to be considered satisfied, even though with `tfFillOrKill` and without `tfSell` the only requirement is that the owner of the opposing offer receives the full amount of their `TakerPays`, without needing to exhaust the `TakerGets`. This caused valid `FillOrKill` offers to be killed (`tecPATH_PARTIAL` or offer removal) when they could actually have been completed. With `fixFillOrKill` active, the engine distinguishes both cases: without `tfSell`, it is enough to deliver the full `TakerPays`; with `tfSell`, spending the full `TakerGets` is still required.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate): changes the success/failure condition when crossing an offer with `tfFillOrKill`.
- [Offer](/objects/Offer): affects which offers survive or are removed during crossing.

## Status and context

Fixes a bug in the interpretation of the `tfFillOrKill`/`tfSell` flags in the payment engine (`flowCross`), which could incorrectly reject perfectly executable "all or nothing" offers when they were not combined with `tfSell`. The fix makes the behavior match the documented semantics of the flag.
