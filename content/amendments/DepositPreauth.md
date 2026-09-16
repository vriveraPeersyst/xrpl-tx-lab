---
title: DepositPreauth
summary: A whitelist of senders for accounts with DepositAuth, plus the deposit_authorized method and tecEXPIRED for expired offers.
xrplDocs: https://xrpl.org/resources/known-amendments#depositpreauth
introducedIn: 1.1.0
---

## What changes

Adds the `DepositPreauth` transaction and the object of the same name. An account with `lsfDepositAuth` can preauthorize another account (`Authorize`) to send it payments directly, and revoke that later (`Unauthorize`). Each preauthorization is its own object and consumes one unit of owner reserve. The engine checks for the object's existence in `preclaim` of `Payment`, `EscrowFinish` and `PaymentChannelClaim` before applying the DepositAuth rule. The RPC method `deposit_authorized` is added to query it.

Two additional adjustments: a cross-currency payment from an account to itself no longer fails due to DepositAuth, and `OfferCreate` with an `Expiration` in the past returns `tecEXPIRED` instead of `tesSUCCESS` with no effect.

## Affected transactions and objects

- New: [DepositPreauth](/tx/DepositPreauth).
- Modified: [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim) and [OfferCreate](/tx/OfferCreate).
- New object [DepositPreauth](/objects/DepositPreauth); affects [AccountRoot](/objects/AccountRoot) (owner count).

## Status and context

[DepositAuth](/amendments/DepositAuth) solved compliance, but forced the recipient to cash checks one by one. Preauthorizations allow the default block to be kept while opening exceptions for verified counterparties (custodians, exchanges, KYC'd clients). With [Credentials](/amendments/Credentials), the same object can authorize by credential instead of by account, which scales better. Retired in rippled: it is part of the base protocol.
