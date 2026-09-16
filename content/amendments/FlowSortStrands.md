---
title: FlowSortStrands
summary: Improves the order in which the Flow engine evaluates the different strands (routes) of a payment with paths to obtain better results more efficiently.
xrplDocs: https://xrpl.org/resources/known-amendments#flowsortstrands
---

## What changes

When a [Payment](/tx/Payment) specifies several possible `Paths`, the [Flow](/amendments/Flow) engine decomposes each one into a strand (a concrete sequence of order books and trustlines) and evaluates them to decide how much each one can deliver at the best price. The order in which Flow processes those strands matters: processing them in a suboptimal order can cause cheap liquidity in a secondary strand to be exhausted before it can be used from the main strand, or force Flow to repeat iterations to converge on the same result.

FlowSortStrands changes the sorting criterion Flow uses to decide in what sequence to try the strands, prioritizing those with the best estimated price quality first. This reduces the number of iterations needed for the calculation to converge and makes it more likely that the final result is optimal (the largest amount delivered at the best possible aggregate price), rather than depending on the order in which the sender listed the paths.

## Affected transactions and objects

- [Payment](/tx/Payment): payments with multiple `Paths` benefit from a more efficient evaluation with better results.
- [OfferCreate](/tx/OfferCreate): crossing an offer against several price levels of the book also goes through the same strand ordering.
- It introduces no new objects or fields; it is a change to [Flow](/amendments/Flow)'s internal algorithm.

## Status and context

This is a performance and result-quality optimization on top of Flow, not a change in behavior visible to whoever builds a transaction: the input and output fields of `Payment` do not change, but the amount actually delivered or the effective cost of a payment with paths may vary slightly compared to previous behavior, always in the sender's favor. Together with [FlowCross](/amendments/FlowCross), it completes the consolidation of the Flow engine as a full replacement for the original path engine.
