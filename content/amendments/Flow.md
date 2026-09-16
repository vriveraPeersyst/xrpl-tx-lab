---
title: Flow
summary: Replaces the old payment engine with "Flow", the modern engine that computes routes and executes payments and offer crossing on XRPL.
xrplDocs: https://xrpl.org/resources/known-amendments#flow
---

## What changes

Flow completely replaces rippled's original payment engine (known as the "payment engine" or classic path engine) with a new implementation designed to be more predictable, easier to reason about, and more efficient. The old engine calculated paths in a fairly opaque way and had known edge cases with hard-to-explain results (delivered amounts larger or smaller than expected, paths that failed for no clear reason). Flow rewrites that calculation as a composition of "strands": each strand is a sequence of steps (order book, trustline) that the payment can traverse, and the engine combines several strands in parallel to maximize the amount delivered at the same cost, similar to a maximum-flow algorithm on a graph.

The result is the same kind of operation as before — sending a payment that can traverse multiple order books and trustlines, or converting one currency into another on the fly — but calculated more rigorously, with better handling of `SendMax`, `DeliverMin`, and the partial-payment flags of [Payment](/tx/Payment).

## Affected transactions and objects

- [Payment](/tx/Payment): any payment with paths (cross-currency or spanning multiple hops) is now calculated via Flow instead of the old engine.
- [OfferCreate](/tx/OfferCreate): offer crossing when creating a new offer reuses the same Flow machinery to determine how much is crossed against the order book.
- [Offer](/objects/Offer) and [RippleState](/objects/RippleState) (trustlines) objects, which are the nodes that Flow traverses when building strands.

## Status and context

Before Flow, rippled used the so-called "legacy path engine", with logic accumulated since Ripple's earliest years that was difficult to maintain and audit. Flow was explicitly designed to replace it with a more formal, testable algorithm, and it became the foundation for all later improvements to the XRPL DEX: [FlowCross](/amendments/FlowCross) and [FlowSortStrands](/amendments/FlowSortStrands) are direct extensions of it, and features such as the AMM or [PermissionedDEX](/amendments/PermissionedDEX) assume that the execution engine is Flow. Along with the order book itself, it is the core of XRPL's native DEX.
