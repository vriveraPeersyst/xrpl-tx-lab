---
title: ImmediateOfferKilled
summary: Changes the result code of an OfferCreate with tfImmediateOrCancel that does not cross with anything, from tesSUCCESS to tecKILLED.
xrplDocs: https://xrpl.org/resources/known-amendments#immediateofferkilled
---

## What changes

The `tfImmediateOrCancel` flag on [OfferCreate](/tx/OfferCreate) requests that the offer be crossed immediately against the order book and, if it cannot cross (fully or partially) at that moment, be cancelled without leaving a remainder on the ledger. Before this amendment, when a `tfImmediateOrCancel` offer crossed nothing at all, the transaction still returned `tesSUCCESS`: from the result code's point of view it appeared to have succeeded, even though in practice nothing had happened.

With ImmediateOfferKilled active, that same case — no amount crossed — returns `tecKILLED` instead of `tesSUCCESS`. The transaction is still included in the ledger (it pays the fee, like any `tec` result), but the result code correctly reflects that the offer's intent was not fulfilled.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate): changes the result returned when `tfImmediateOrCancel` is active and there is no crossing at all.
- It does not create or modify the [Offer](/objects/Offer) object, because in this specific case the offer is never actually created on the ledger.

## Status and context

Before the fix, a client that submitted an IOC offer with no available liquidity to cross would see `tesSUCCESS` and had to inspect the transaction metadata to realize that nothing had actually been executed — a confusing behavior for anyone integrating automated trading on top of the XRPL DEX. `tecKILLED` makes that outcome explicit in the transaction's own code, without needing to parse metadata to distinguish "something crossed" from "nothing crossed".
