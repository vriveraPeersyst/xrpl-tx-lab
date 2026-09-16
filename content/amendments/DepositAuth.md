---
title: DepositAuth
summary: Account flag that rejects any deposit not initiated by the account itself, in order to comply with source-of-funds regulations.
xrplDocs: https://xrpl.org/resources/known-amendments#depositauth
introducedIn: 0.90.0
---

## What changes

Adds the flag `asfDepositAuth` (`lsfDepositAuth` in `AccountRoot`). With it enabled, `Payment` transactions that have the account as destination fail with `tecNO_PERMISSION`, whether they are in XRP, tokens or MPT. `EscrowFinish` and `PaymentChannelClaim` also fail if sent by another account; only the recipient itself can execute them. The account can still receive funds by cashing checks (`CheckCash`), because it is the one initiating the transaction.

There is an exception so accounts don't become unusable: if the balance is below the base reserve, it accepts XRP payments of up to the base reserve. The amendment also fixes a bug whereby `EscrowCreate` and `PaymentChannelCreate` applied `lsfDisallowXRP`, which is a purely informational flag.

## Affected transactions and objects

- Modified: [AccountSet](/tx/AccountSet), [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim), [EscrowCreate](/tx/EscrowCreate) and [PaymentChannelCreate](/tx/PaymentChannelCreate).
- Objects: [AccountRoot](/objects/AccountRoot).

## Status and context

Some financial institutions cannot accept funds from an unknown source: they must verify the sender before the money comes in. On a ledger where anyone can send to anyone, that was impossible. DepositAuth turns the account into "outgoing only" and lets the holder control each incoming transfer via checks or preauthorizations. It was the first step in a line that continues with [DepositPreauth](/amendments/DepositPreauth) (account whitelists) and [Credentials](/amendments/Credentials) (credential-based authorization). It is retired in rippled and is part of the base protocol.
