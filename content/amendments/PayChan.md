---
title: PayChan
summary: Introduces unidirectional payment channels for making off-ledger micropayments with claims signed off-chain.
xrplDocs: https://xrpl.org/resources/known-amendments#paychan
introducedIn: 0.90.0
---

## What changes

Introduces the `PayChannel` object (`ltPAYCHAN`): a unidirectional payment channel between a source account and a destination account, with a total `Amount` reserved in XRP, a `Balance` of what has already been claimed, a `PublicKey` for verifying signatures, a `SettleDelay` (the minimum time before the channel can be closed without mutual agreement), and optionally `Expiration` and `CancelAfter`.

`PaymentChannelCreate` opens the channel by locking the specified `Amount` from the source account. From there, the source can sign, off-chain and with no ledger cost or latency, successive "claims" that authorize the destination to withdraw an increasing amount from the channel; each signature supersedes the previous one, so only the latest one needs to be sent to the network. `PaymentChannelClaim` is the settlement transaction: the destination uses it to collect by presenting the most recent signature (verified against `PublicKey`), and either party can use it to close the channel (by mutual agreement, or unilaterally once `SettleDelay`/`Expiration` has passed), returning the remainder to the source. `PaymentChannelFund` allows the source to add more XRP to an already-open channel, optionally extending its `Expiration`.

## Affected transactions and objects

- New: [PaymentChannelCreate](/tx/PaymentChannelCreate), [PaymentChannelFund](/tx/PaymentChannelFund) and [PaymentChannelClaim](/tx/PaymentChannelClaim).
- Object: new [PayChannel](/objects/PayChannel), linked in the source account's owner directory (and, depending on the ledger, also in the destination's).

## Status and context

Payment channels address the use case of repeated micropayments between the same two parties: content streaming paid per second, per-API pricing, frequent tips, etc. Without a channel, each micropayment would be a `Payment` transaction on the ledger, with its fee cost and confirmation latency; with a channel, only the opening and closing (or re-funding) touch the ledger, while the intermediate claims are negotiated and signed off-chain. Later amendments and fixes (such as `fixPayChanCancelAfter`, which corrects the behavior of `CancelAfter`, or `fixPayChanRecipientOwnerDir`) adjust details of this original design.
