---
title: DeepFreeze
summary: Deep freezing of trust lines: the holder can neither send nor receive the frozen token, not even through offers or AMM.
xls: XLS-0077
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0077-deep-freeze
xrplDocs: https://xrpl.org/resources/known-amendments#deepfreeze
introducedIn: 2.4.0
---

## What changes

The classic *freeze* of a trust line prevents the holder from sending the token, but still lets them receive it. DeepFreeze adds a second level: with `tfSetDeepFreeze` on `TrustSet` the issuer also blocks incoming transfers. A holder with a deep freeze cannot receive payments in the token, their offers that consume or produce it are treated as unfunded, and the payment engine avoids that line in any path. `tfClearDeepFreeze` reverts it.

Rules in `TrustSet::preflight` and `doApply`: the deep freeze can only be applied if the line is already (or becomes) frozen with the normal freeze, it cannot be combined with `tfClearFreeze` in the same transaction, and an issuer with `lsfNoFreeze` cannot use it. `RippleState` gains `lsfLowDeepFreeze` and `lsfHighDeepFreeze`. A new invariant (`FreezeInvariant`) checks that no transaction moves balance through a line with a deep freeze.

## Affected transactions and objects

- Modified: [TrustSet](/tx/TrustSet) with the flags `tfSetDeepFreeze` and `tfClearDeepFreeze`.
- Indirectly affected: [Payment](/tx/Payment), [OfferCreate](/tx/OfferCreate), [CheckCash](/tx/CheckCash), [AMMDeposit](/tx/AMMDeposit) and [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) treat the line as blocked in both directions.
- Objects: [RippleState](/objects/RippleState) with two new flags.

## Status and context

For a regulated issuer, freezing only outgoing transfers is not enough: a sanctioned account could keep accumulating the token, and the issuer remained obligated to recognize that balance. XLS-77 provides a more complete compliance tool, consistent with [Clawback](/amendments/Clawback), with which it is often combined: first the account is isolated, then the funds are recovered. Like the normal freeze, it is a visible decision by the issuer that any holder can check on the trust line.
