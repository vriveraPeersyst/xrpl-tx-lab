---
title: fixEnforceNFTokenTrustlineV2
summary: Extends fixEnforceNFTokenTrustline by also checking that the payment token's issuer authorizes receiving it, and adjusts the calculation of broker fees.
xrplDocs: https://xrpl.org/resources/known-amendments#fixenforcenftokentrustlinev2
---

## What changes

Building on [fixEnforceNFTokenTrustline](/amendments/fixEnforceNFTokenTrustline), this amendment adds a call to `checkTrustlineAuthorized` in [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) for the NFT minter: if the payment token's issuer requires authorization (`lsfRequireAuth`) and the minter is not authorized, the transaction fails just as a regular payment to an unauthorized account would, instead of still forcing the fee to be collected. It also applies this check when calculating and distributing the `brokerFee` in brokered (matched) offers, and adjusts `NFTokenHelpers` so that the distribution of non-native fees takes into account whether the amendment is active.

## Affected transactions and objects

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): validates minter authorization in addition to the existence of the trustline, both in the direct payment and in the `brokerFee`.
- [RippleState](/objects/RippleState): honors `lsfRequireAuth` also for the automatic collection of an NFT's `TransferFee`.

## Status and context

V1 closed the gap of trustlines created without consent, but left open a related case: an issuer could require explicit authorization (`RequireAuth`) to receive its own token, and the automatic collection of an NFT's transfer fee would bypass that requirement anyway. V2 aligns this collection with the same authorization rules that already apply to any regular payment in that token, closing the remaining path for crediting funds to an account without its authorization.
