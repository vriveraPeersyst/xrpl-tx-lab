---
title: Checks
summary: Introduces checks - deferred payments that the recipient cashes whenever they want, up to a maximum amount.
xrplDocs: https://xrpl.org/resources/known-amendments#checks
introducedIn: 0.90.0
---

## What changes

Adds the `Check` object and three transactions to manage it. A check works like a paper check: the issuer signs `CheckCreate` with a maximum amount (`SendMax`) and a recipient; the money does not move until the recipient sends `CheckCash`, specifying an exact `Amount` or a `DeliverMin`. If the issuer has insufficient balance or liquidity at that moment, cashing fails but the check remains on the ledger to be tried again later. Either the issuer or the recipient can cancel it with `CheckCancel`; if it has an `Expiration` and has expired, anyone can cancel it.

Introduces the `tecEXPIRED` code for attempts to create a check that is already expired.

## Affected transactions and objects

- New: [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash), and [CheckCancel](/tx/CheckCancel).
- New object [Check](/objects/Check), which consumes one unit of the issuer's owner reserve.
- Interaction with [DepositAuth](/amendments/DepositAuth): an account with deposit authorization can receive funds by cashing checks, because the transaction is sent by that account itself.

## Status and context

XRPL payments are *push*: the sender decides the exact moment and cannot send to accounts that require authorization. Checks turn the flow into *pull*, which solves several cases: businesses that only accept funds after performing their own checks, payments conditional on the recipient accepting them, and invoice settlement where the final amount is set by the collector within a maximum.

It is retired in rippled: it is part of the base protocol. The later [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) amendment removed the need to create the trust line before cashing a token check.
