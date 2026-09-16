---
title: Sponsor
summary: Allows an account to sponsor the owner-count reserve and/or the transaction fee of another account in a transaction.
xrplDocs: https://xrpl.org/resources/known-amendments#sponsor
---

## What changes

Introduces the concept of "sponsorship": an account (the sponsor) can cover, in full or in part, the owner-count reserve that another account's object would generate, or the fee of another account's transaction. The mechanism is activated with two new transactions. `SponsorshipSet` creates or updates a `Sponsorship` object between a sponsor and a `Sponsee`, with `FeeAmountDelta` and/or `RemainingOwnerCountDelta` as the amounts the sponsor is willing to cover, and optionally a `MaxFee` as a cap. `SponsorshipTransfer` transfers an existing sponsorship (identified by `ObjectID`) to another `Sponsee`.

Once active, any transaction can carry sponsor fields (checked in `Transactor.cpp`, which requires that `featureSponsor` be enabled if `hasSponsor`, `hasSponsorFlags`, or `hasSponsorSig` appear) to indicate that another account covers its cost. `checkReserve` in `AccountRootHelpers` no longer looks only at the account's own balance and now takes the available sponsored owner count into account. Transactors such as `TrustSet`, `PaymentChannelCreate`, `Payment`, and `EscrowFinish` explicitly check `featureSponsor` because their reserve logic (creating a trustline, a channel, or releasing an escrow) changes when the resulting object can rely on a sponsor's reserve instead of its own. The `AccountRoot` of a sponsored account adds counters such as `SponsoringAccountCount` and `SponsoringOwnerCount`.

## Affected transactions and objects

- New: [SponsorshipSet](/tx/SponsorshipSet) and [SponsorshipTransfer](/tx/SponsorshipTransfer).
- New object: [Sponsorship](/objects/Sponsorship).
- Modified: [TrustSet](/tx/TrustSet), [PaymentChannelCreate](/tx/PaymentChannelCreate), [Payment](/tx/Payment), and [EscrowFinish](/tx/EscrowFinish), whose reserve logic now accounts for a sponsor.
- [AccountRoot](/objects/AccountRoot): new fields `Sponsor`, `SponsoringAccountCount`, and `SponsoringOwnerCount`.

## Status and context

Addresses the reserve as an entry barrier: today, for an account to receive a trustline, open a payment channel, or hold any object of its own in the ledger, it must itself have the reserve XRP locked up. With Sponsor, a company, wallet, or protocol can take on that reserve on behalf of its users (for example, to onboard accounts without their own funds or to subsidize fees), without transferring them XRP that ends up locked in their balance, and without losing control over those funds, which remain the sponsor's.
