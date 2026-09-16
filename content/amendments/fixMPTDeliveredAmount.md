---
title: fixMPTDeliveredAmount
summary: Adds the delivered_amount metadata to direct Payments that move an MPT when the delivered amount differs from the requested one.
xrplDocs: https://xrpl.org/resources/known-amendments#fixmptdeliveredamount
---

## What changes

When a [Payment](/tx/Payment) moves a Multi-Purpose Token (MPT) directly between issuer and recipient — without going through the generic payment engine — the amount actually delivered can differ from the requested amount for two reasons: a partial payment is allowed (`tfPartialPayment`) or the MPT's issuer charges a transfer fee (`TransferRate`). In both cases, before the fix the transaction metadata did not reflect that adjustment: the `delivered_amount` field was not updated with the amount actually sent to the recipient.

With `fixMPTDeliveredAmount` active, after applying `accountSend` for an MPT, if the delivered amount (`amountDeliver`) differs from the requested amount (`dstAmount`) the code calls `ctx_.deliver(amountDeliver)`, which sets `DeliveredAmount` in the metadata to the actual amount delivered. Without this data, any service relying on `delivered_amount` (exchanges, wallets, indexers) could not know how much MPT the recipient had actually received in a partial payment or one with a fee.

## Affected transactions and objects

- [Payment](/tx/Payment): `delivered_amount` metadata when `Amount` is an MPT and it is delivered via direct transfer.

## Status and context

Fixes a gap inherited from MPTokensV1: the `delivered_amount` mechanism had already existed for XRP and IOU for years (following the historical problem of partial payments without metadata), but had not been replicated for direct MPT payments when that asset type was added.
