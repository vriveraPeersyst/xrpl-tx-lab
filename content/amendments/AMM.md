---
title: AMM
summary: Adds automated market makers (XLS-30) integrated with the DEX, with LP tokens, fee voting, and a discount auction.
xls: XLS-0030
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0030-automated-market-maker
xrplDocs: https://xrpl.org/resources/known-amendments#amm
introducedIn: 1.12.0
---

## What changes

Introduces *Automated Market Makers* on the ledger. Each asset pair (XRP or issued tokens) can have at most one AMM instance, which lives in a special account (pseudo-account) with no keys that custodies the pool. Whoever deposits liquidity receives *LP tokens* proportional to their contribution; with them they take part in the exchange fees, vote on the pool's fee (`TradingFee`), and can bid for the *auction slot*, which grants the right to trade at a reduced fee for a limited time.

The payment engine and offer crossing now combine order book offers and AMMs to obtain the best exchange rate, without the user having to choose. In addition, some transactions cannot target an AMM's account as destination (for example, a check cannot be sent to it because it could never be cashed).

## Affected transactions and objects

- New: [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid), and [AMMDelete](/tx/AMMDelete).
- Modified: [Payment](/tx/Payment) and [OfferCreate](/tx/OfferCreate) use the pools as a source of liquidity; [CheckCreate](/tx/CheckCreate), [EscrowCreate](/tx/EscrowCreate), and [PaymentChannelCreate](/tx/PaymentChannelCreate) reject the AMM account as destination.
- New [AMM](/objects/AMM) object and new `AMMID` field on [AccountRoot](/objects/AccountRoot) linking the pseudo-account to its pool.
- LP tokens are ordinary issued tokens, so they appear as [RippleState](/objects/RippleState).

## Status and context

The original XRPL DEX only had an order book, which requires active market makers and leaves pairs with little liquidity without a price. XLS-30 proposed a Uniswap-style constant-product AMM, but integrated natively: the payment engine evaluates offers and AMM at each step and picks the best combination. The *auction slot* auction and fee voting are XRPL-specific design choices meant to reduce impermanent loss and return part of the arbitrage to liquidity providers.

After activation, several rounding and edge-case issues were discovered and fixed with the amendments `fixAMMv1_1`, `fixAMMv1_2`, `fixAMMv1_3`, and `fixAMMOverflowOffer`. Compatibility with clawback-enabled tokens came later with [AMMClawback](/amendments/AMMClawback).
