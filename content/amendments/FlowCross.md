---
title: FlowCross
summary: Extends the Flow engine so it can cross offers from the order book within the payment calculation itself, not just route direct payments.
xrplDocs: https://xrpl.org/resources/known-amendments#flowcross
---

## What changes

The original [Flow](/amendments/Flow) engine knew how to calculate how to route a payment through existing trustlines and order books, but the actual offer crossing — the logic that decides which offers in the book are consumed, in what order, and for what amount when a transaction interacts with the DEX — still lived partly outside Flow, inherited from the old engine. FlowCross moves that crossing logic inside the Flow calculation itself, so that a single pass over the strands resolves both routing and offer crossing at once.

This is especially relevant for [OfferCreate](/tx/OfferCreate): when creating a new offer, rippled checks whether it crosses with existing offers on the opposite book before leaving a remainder on the ledger. With FlowCross, that crossing check uses the same strand machinery as a multi-hop [Payment](/tx/Payment), instead of a separate code path, which unifies the behavior between "paying while crossing the DEX" and "creating an offer that crosses instantly".

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate): crossing of the new offer against the opposite book is resolved via Flow.
- [Payment](/tx/Payment): payments that cross several offers along the way use the same unified calculation.
- [Offer](/objects/Offer) object: offers partially crossed or removed by the crossing are handled with Flow's logic.

## Status and context

FlowCross is the first direct extension of Flow after its launch: it unifies two code paths that previously calculated crossings independently and could diverge in edge cases (for example, very low-quality offers or crossings that leave tiny remainders). Because it depends on Flow, it can only be activated alongside it or after it. It is an intermediate step toward the DEX's current behavior, later refined by [FlowSortStrands](/amendments/FlowSortStrands).
