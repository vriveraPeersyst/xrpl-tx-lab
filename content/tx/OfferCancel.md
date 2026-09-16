---
title: OfferCancel
summary: Withdraws a still-live order of yours from the book, identified by the Sequence of the OfferCreate that created it.
category: dex
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/offercancel
level: basic
---

## What it does

`OfferCancel` removes an [Offer](/objects/Offer) object that your account has in the DEX. You only need to specify `OfferSequence`: the `Sequence` (or Ticket number) with which you sent the original [OfferCreate](/tx/OfferCreate). Once the order is deleted, it disappears from the book's directory and from your owner directory, and your `OwnerCount` drops by 1, freeing 0.2 XRP of reserve on testnet.

It's a deliberately tolerant transaction: if the order no longer exists (because it was fully crossed, deleted by another transaction, or never got placed), the result is still `tesSUCCESS`. You pay the fee, but there's no error. That makes it safe to send "just in case."

There's no way to cancel another account's order: the object's key is derived from your `Account` plus the `OfferSequence` (`keylet::offer(account, seq)`), so it can only match orders of yours.

## When to use it

- Withdrawing a limit order you no longer want to keep (the price has moved).
- Freeing owner reserve before deleting an account with [AccountDelete](/tx/AccountDelete): offers are auto-deletable, but canceling them beforehand avoids surprises.
- Cleaning up expired orders: an order with a past `Expiration` still occupies reserve until someone touches it.
- If you also want to place a new order, it's cheaper to use the `OfferSequence` field of [OfferCreate](/tx/OfferCreate), which cancels and creates in a single transaction.

## How it works inside

**`OfferCancel::preflight`**: the only static validation is that `OfferSequence` isn't 0; if it is, `temBAD_SEQUENCE`.

**`OfferCancel::preclaim`**: reads your [AccountRoot](/objects/AccountRoot) (if it doesn't exist, `terNO_ACCOUNT`) and checks that `OfferSequence` is **strictly less** than your current `Sequence`. A value equal to or greater than that can't correspond to any order already sent and returns `temBAD_SEQUENCE`. Note: since the comparison is against `Sequence`, if the order was created with a Ticket whose number is greater than your current `Sequence`, this check rejects it.

**`OfferCancel::doApply`**: builds the key `keylet::offer(Account, OfferSequence)` and does a `peek` on the ledger. If the object exists, it calls `offerDelete`, which removes it from the book's directory (`BookDirectory`/`BookNode`) and from your owner directory (`OwnerNode`), decrements `OwnerCount`, and deletes the SLE. If it doesn't exist, it writes a debug log and returns `tesSUCCESS` without touching anything.

The transactor doesn't check any amendment: the behavior has been the same for years. It has no flags of its own.

## Key fields

- **OfferSequence** — the `Sequence` of the `OfferCreate` transaction that created the order. If you created it with a Ticket, it's the `TicketSequence`. You'll find it as `seq` in the `account_offers` response or in the `Sequence` field of the `Offer` object in `account_objects`.

## Common errors

- **temBAD_SEQUENCE** — `OfferSequence` is 0, or is greater than or equal to your account's current `Sequence`. Copy the exact value from `account_offers`.
- **terNO_ACCOUNT** — the signing account doesn't exist on the ledger (not funded).
- **tesSUCCESS with no changes** — not an error, but the most confusing situation: the order was already gone. Check the metadata for an `Offer` node in `DeletedNode`; if there isn't one, nothing was deleted.
- **tefPAST_SEQ / terPRE_SEQ** — generic sequence errors of the transaction itself (not of `OfferSequence`): resubmit with the account's correct `Sequence`.

## Example

```json
{
  "TransactionType": "OfferCancel",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "OfferSequence": 12345
}
```

## Try it on testnet

1. Create an order with [OfferCreate](/tx/OfferCreate) at a price nobody will cross (for example, 1 XRP for 1,000,000 USD) and note the `Sequence` of that transaction.
2. Query `account_offers` and verify it appears with that `seq`.
3. Submit `OfferCancel` with `OfferSequence` equal to that value.
4. Query `account_offers` again: the order is gone. In `account_info`, `OwnerCount` has dropped by 1.
5. Resubmit the exact same `OfferCancel`: you'll see `tesSUCCESS` again, but in the metadata only your `AccountRoot` is modified (fee and `Sequence`), with no `DeletedNode`.
6. Try with `OfferSequence` equal to your current `Sequence` and observe `temBAD_SEQUENCE`.

## Related

- [OfferCreate](/tx/OfferCreate)
- [Offer](/objects/Offer)
- [DirectoryNode](/objects/DirectoryNode)
- [TicketCreate](/tx/TicketCreate)
- [AccountDelete](/tx/AccountDelete)
