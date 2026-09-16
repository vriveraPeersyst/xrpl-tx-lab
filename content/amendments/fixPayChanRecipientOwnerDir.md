---
title: fixPayChanRecipientOwnerDir
summary: Adds the PayChannel to the channel recipient's owner directory as well, not just the sender's.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpaychanrecipientownerdir
---

## What changes

When a [PayChannel](/objects/PayChannel) is created with [PaymentChannelCreate](/tx/PaymentChannelCreate), the object is linked into the owner directory of the account that creates it (`Account`), which allows listing and counting its owned objects. Before the fix, the channel's recipient (`Destination`) had no reference to that `PayChannel` in its own directory: there was no way to traverse from the destination account the payment channels that others had opened toward it, nor did that object count on its side for operations such as account deletion.

With `fixPayChanRecipientOwnerDir` active, `PaymentChannelCreate::doApply` also inserts the `PayChannel` into the owner directory of `Destination`, storing the resulting page in the object's new `DestinationNode` field. This way, both the sender and the recipient can enumerate the channel from their own owner directory.

## Affected transactions and objects

- [PaymentChannelCreate](/tx/PaymentChannelCreate): inserts the channel into two directories instead of one.
- [PayChannel](/objects/PayChannel): new `DestinationNode` field, alongside the already-existing `OwnerNode`.

## Status and context

Fixes an asymmetry in how payment channels are indexed: without this fix, a service relying on the owner directory to discover the `PayChannel` objects associated with an account would miss all the channels in which that account was only the recipient. The amendment is retired in the code; two-sided linking is now the only existing behavior.
