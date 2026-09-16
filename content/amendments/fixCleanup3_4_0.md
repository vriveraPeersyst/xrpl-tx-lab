---
title: fixCleanup3_4_0
summary: Groups the set of behavior fixes accumulated for rippled version 3.4.0 into a single amendment.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_4_0
introducedIn: 3.4.0
---

## What changes

Third installment in the series of "umbrella" amendments following [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) and [fixCleanup3_3_0](/amendments/fixCleanup3_3_0). Activates several scattered fixes for rippled 3.4.0, including changes to `RippleStateHelpers`, `CredentialHelpers`, and `NFTokenHelpers`, to `LendingHelpers` and `LoanSet`/`LoanManage`/`LoanPay`, to `EscrowFinish`/`EscrowCancel`, `MPTokenAuthorize`, `NFTokenAcceptOffer`, `SponsorshipTransfer`, and the payment engine (`OfferStream`, `Payment`). It also modifies the signature scheme: with `fixCleanup3_4_0` active, a signature in `CounterpartySignature` or `SponsorSignature` covers a different prefix than the transaction's own signature (`CPT`/`CPM` and `SPN`/`SPM` respectively), so that a signature can no longer be moved from one role to another.

## Affected transactions and objects

[EscrowFinish](/tx/EscrowFinish), [EscrowCancel](/tx/EscrowCancel), [MPTokenAuthorize](/tx/MPTokenAuthorize), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [Payment](/tx/Payment), and transactions with `CounterpartySignature` or `SponsorSignature` such as those of `Sponsor` and `LoanSet`/`LoanManage`/`LoanPay`.

## Status and context

Like the rest of the series, this does not respond to a single design proposal but to the periodic packaging of bug fixes from different subsystems under a single votable amendment per version. The rippled API-CHANGELOG explicitly documents the signature prefix change as a visible part of this amendment, since it affects clients that build signatures outside of rippled.
