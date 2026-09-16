---
title: TrustSetAuth
summary: Allows an issuer to require explicit authorization for each trustline opened toward its token.
xrplDocs: https://xrpl.org/resources/known-amendments#trustsetauth
---

## What changes

Introduces the `lsfRequireAuth` flag on `AccountRoot`, enabled via `AccountSet` (`asfRequireAuth`). When an issuing account enables it, any new trustline another account opens toward its token starts out unauthorized by default: the issuer cannot receive payments in that token through that line until it explicitly authorizes it. To authorize it, the issuer itself sends a `TrustSet` with the `tfSetAuth` flag on the trustline in question, which marks the line as authorized (`lsfLowAuth`/`lsfHighAuth` depending on the side) permanently: once authorized, it cannot be de-authorized.

The code in `TrustSet::doApply` checks, when `bSetAuth` is present, that the issuing account has `lsfRequireAuth` enabled before accepting the flag; if it does not, authorizing anything makes no sense because lines are already operative by default. This gives an issuer full control over who can hold its token on the ledger, instead of anyone being able to simply create a trustline and start operating.

## Affected transactions and objects

- [AccountSet](/tx/AccountSet): `asfRequireAuth` flag to enable `lsfRequireAuth`.
- [TrustSet](/tx/TrustSet): `tfSetAuth` flag for the issuer to authorize a specific line.
- [AccountRoot](/objects/AccountRoot): `lsfRequireAuth` flag.
- [RippleState](/objects/RippleState): `lsfLowAuth`/`lsfHighAuth` flags that mark a line as authorized.

## Status and context

This is one of the protocol's historical amendments, designed for regulated or permissioned issuers (for example, tokens representing real-world assets) who need to individually approve each counterparty before it can hold a balance in their token, instead of operating in an open mode where anyone can create a trustline without prior permission. It is the foundation on which later amendments, such as [DepositAuth](/amendments/DepositAuth) or [Credentials](/amendments/Credentials), build more flexible authorization mechanisms.
