---
title: DisallowIncoming
summary: Four account flags to block incoming checks, payment channels, NFT offers and trust lines.
xrplDocs: https://xrpl.org/resources/known-amendments#disallowincoming
introducedIn: 1.10.0
---

## What changes

Adds to `AccountSet` the flags `asfDisallowIncomingCheck`, `asfDisallowIncomingPayChan`, `asfDisallowIncomingNFTokenOffer` and `asfDisallowIncomingTrustline`. When the destination has the corresponding flag enabled, `CheckCreate`, `PaymentChannelCreate`, `NFTokenCreateOffer` and `TrustSet` fail with `tecNO_PERMISSION` instead of creating the object.

The trust line case has a nuance introduced by `fixDisallowIncomingV1`: if a line already exists between the two accounts, the flag holder can still modify it; only the creation of new lines initiated by third parties is blocked.

## Affected transactions and objects

- Modified: [AccountSet](/tx/AccountSet), [CheckCreate](/tx/CheckCreate), [PaymentChannelCreate](/tx/PaymentChannelCreate), [NFTokenCreateOffer](/tx/NFTokenCreateOffer) and [TrustSet](/tx/TrustSet).
- Objects: [AccountRoot](/objects/AccountRoot) (new flags); prevents unwanted creation of [Check](/objects/Check), [PayChannel](/objects/PayChannel), [NFTokenOffer](/objects/NFTokenOffer) and [RippleState](/objects/RippleState).

## Status and context

Any account could create objects "toward" another one without its consent. Although the recipient does not pay reserve for them, they are still affected: a pending check or channel prevents deleting the account with [AccountDelete](/tx/AccountDelete), and these were used in scams (NFT offers or trust lines with misleading names that show up in the victim's wallet). This amendment gives the holder simple, per-object-type control. It is retired in rippled and is part of the base protocol.
