---
title: MPTokensV1
summary: Introduces Multi-Purpose Tokens (MPT), a natively issued asset type that is simpler and cheaper than classic IOU trustlines.
xls: XLS-0033
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens
xrplDocs: https://xrpl.org/resources/known-amendments#mptokensv1
---

## What changes

Until this amendment, issuing a token on XRPL meant using the IOU system over trustlines: each holder needs a [RippleState](/objects/RippleState) per issuer and currency, with its own reserve, and the issuer has no native way to enforce circulation limits or structured metadata. MPTokensV1 adds a different, simpler asset model: the issuer creates an issuance with `MPTokenIssuanceCreate`, which produces an `MPTokenIssuance` object with an `AssetScale` (decimal places), an optional `MaximumAmount` for circulation, and flags such as `lsfMPTCanTransfer`, `lsfMPTCanEscrow`, `lsfMPTCanLock`, or `lsfMPTRequireAuth` that define what a holder can do with the token. The issuer can destroy it with `MPTokenIssuanceDestroy` if no circulation remains, and adjust certain flags afterward with `MPTokenIssuanceSet`.

A holder who wants to hold the token needs their own opt-in line, the `MPToken` object, which they create or close with `MPTokenAuthorize`; if the issuance requires authorization (`lsfMPTRequireAuth`), the issuer must explicitly approve that line, just as happens with `RequireAuth` on trustlines. Unlike a trustline, an `MPToken` has no negative balance or "quality" concept: it is a simple capped balance.

`MPTokenMetadata`, a free-form binary field on the issuance, allows attaching application-readable information (name, icon, links) without depending on an external registry.

## Affected transactions and objects

- New: `MPTokenIssuanceCreate`, `MPTokenIssuanceDestroy`, `MPTokenIssuanceSet`, `MPTokenAuthorize`.
- New objects: `MPTokenIssuance` and `MPToken`.
- Modified: [Payment](/tx/Payment), which can move MPT by specifying the `MPTokenIssuanceID` in the `Amount`.

## Status and context

MPTokensV1 emerges as a lightweight alternative to IOU trustlines for use cases that do not need their full flexibility (cross payment routing, multiple issuers of the "same" currency code): points tokens, tokenized shares, simple stablecoins. It lays the foundation for later improvements such as `fixMPTDeliveredAmount`, `DynamicMPT` (changing parameters after issuance), and the not-yet-supported `MPTokensV2`; it is also an infrastructure requirement for [SingleAssetVault](/amendments/SingleAssetVault) and the [lending protocol](/amendments/LendingProtocol), which use MPT to represent shares in a vault.
