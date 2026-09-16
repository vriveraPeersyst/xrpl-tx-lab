---
title: PermissionedDEX
summary: Allows restricting a DEX offer to a specific permissioned domain, so that it only crosses with accounts from that domain.
xrplDocs: https://xrpl.org/resources/known-amendments#permissioneddex
introducedIn: 3.0.0
---

## What changes

Extends `OfferCreate` with the optional field `DomainID`, which references an existing [PermissionedDomain](/amendments/PermissionedDomains). When specified, the offer can only be crossed (or queried in the order book) against other accounts that satisfy that domain's accepted credentials; the DEX matching engine uses a separate order book for offers associated with a domain versus the general open book. It also adds the `tfHybrid` flag, which creates a "hybrid" offer: visible and crossable both in the open book and in the domain's book, useful for liquidity providers who want to participate in both markets with the same offer. Without the amendment active, `tfHybrid` is prohibited (it is added to the rejected flags mask), and using `DomainID` makes the transaction fail in `preflight`.

`Payment` also gains support for `DomainID` in its cross-currency paths, so that a payment can require that the conversion path use only offers from a specific permissioned domain, instead of sweeping the entire open order book.

## Affected transactions and objects

- [OfferCreate](/tx/OfferCreate): new `DomainID` field and `tfHybrid` flag.
- [Payment](/tx/Payment): supports `DomainID` to restrict cross-currency payment routing to a domain.
- Objects: [Offer](/objects/Offer) can become associated with a domain; depends on [PermissionedDomain](/objects/PermissionedDomain) as a reference.

## Status and context

XRPL's native DEX is, by default, completely open: any account can cross with any offer. For regulated use cases—for example, an issuer of a tokenized asset that can only operate between KYC/AML-verified accounts—that is a regulatory compliance problem. PermissionedDEX allows keeping markets restricted to a set of accredited accounts via [PermissionedDomains](/amendments/PermissionedDomains), without needing a separate order book or separate infrastructure, and it is a key piece for bringing regulated assets to the XRPL AMM and DEX.
