---
title: fixPayChanCancelAfter
summary: Rejects creating a PaymentChannel whose CancelAfter is already in the past at creation time.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpaychancancelafter
---

## What changes

[PaymentChannelCreate](/tx/PaymentChannelCreate) accepts an optional `CancelAfter` field: a timestamp after which anyone can close the channel. Before the fix, this date was not checked at channel creation time, so it was possible to open a [PayChannel](/objects/PayChannel) with a `CancelAfter` already expired relative to the ledger's `parentCloseTime`: a channel that was already "expired" at birth, without ever having been usable for anything.

With `fixPayChanCancelAfter` active, `PaymentChannelCreate::doApply` compares the transaction's `CancelAfter` with the ledger's `parentCloseTime` at the time it is applied; if `CancelAfter` has already passed, the transaction fails with `tecEXPIRED` instead of creating a useless channel from the very first moment.

## Affected transactions and objects

- [PaymentChannelCreate](/tx/PaymentChannelCreate): check added in `doApply` before inserting the object.
- [PayChannel](/objects/PayChannel): prevents instances from being created with an already-expired `CancelAfter`.

## Status and context

This is a defensive validation fix: without it, a client could spend the reserve and fee of a transaction opening a payment channel that, due to a miscalculated or already-past `CancelAfter`, was unusable from the moment of creation and could only be closed. The amendment is retired in the code; the check is now a permanent part of `PaymentChannelCreate`.
