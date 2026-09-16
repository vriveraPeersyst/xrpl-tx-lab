---
title: FeeEscalation
summary: Changes the transaction cost mechanism so it rises automatically with network load instead of being a fixed value.
xrplDocs: https://xrpl.org/resources/known-amendments#feeescalation
---

## What changes

Before FeeEscalation, the cost of a transaction was a practically fixed network value (the `base fee`), independent of how much demand there was at any given moment. With this amendment, each validator calculates a minimum cost per transaction based on how many transactions are already competing to get into the open ledger: the more transactions in the queue, the higher the cost needed for yours to be included. The cost is expressed as a multiple of the `base fee` and scales non-linearly with ledger occupancy, heavily penalizing traffic spikes.

This turns the `Fee` field of each transaction into an implicit bidding mechanism: whoever pays more than the current minimum has priority to get into the next closed ledger, while transactions with a low `Fee` can repeatedly be left out during congestion and eventually expire if they carry a `LastLedgerSequence`.

## Affected transactions and objects

It affects the `Fee` field, present in all transactions, and how each `rippled` orders its local queue of candidate transactions before proposing them for consensus. It does not introduce or modify any ledger objects.

## Status and context

Before this amendment, an attacker could flood the network with cheap transactions and block the processing of legitimate ones, since all transactions cost the same regardless of congestion. FeeEscalation introduces a fee market within each server: the cost rises only when needed, protecting the network from spam without penalizing normal usage during periods of low demand. It is retired (`XRPL_RETIRE_FEATURE` in `features.macro`): the fee escalation mechanism is today the only one that exists on the network. It should not be confused with [XRPFees](/amendments/XRPFees), which adjusts specific reserve and base fee values, not the scaling mechanism itself.
