---
title: DIDDelete
summary: Removes the decentralized identifier (DID) from your account and frees up its reserve.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/diddelete
amendment: DID
level: basic
---

## What it does

`DIDDelete` deletes the [DID](/objects/DID) object from your account, if it exists, and returns the unit of owner reserve it consumed. It's the simplest transaction in the identity system: it carries no fields of its own, always operating on the (single) DID of whoever sends it.

Use it when you no longer want to maintain a published decentralized identifier, when the DID document has become obsolete with no intention of replacing it, or as a required prerequisite step for deleting the account with [AccountDelete](/tx/AccountDelete), which doesn't proceed while objects consuming reserve still exist.

## When to use it

- Withdrawing your public DID because you no longer need it or want to start fresh.
- Freeing up the reserve of one XRP that the `DID` object was locking up.
- Preparing your account for an `AccountDelete`, by cleaning up this object first.

## How it works inside

**`DIDDelete::preflight`** doesn't validate anything: it always returns `tesSUCCESS`, because the transaction has no fields of its own to check.

**`DIDDelete::doApply`** locates your account's `DID` via `keylet::did(accountID_)`. If it doesn't exist, it fails with `tecNO_ENTRY`: there's nothing to delete. If it exists, it removes it from your owner directory (`dirRemove`); if that operation doesn't find the expected entry in the directory —an internal inconsistent state that shouldn't happen on a healthy ledger— it returns `tefBAD_LEDGER`. It then reduces your owner count by 1 and deletes the object from the ledger.

The result is deterministic: either the `DID` disappears and you recover the reserve, or the transaction has no effect because there was nothing to delete.

## Key fields

It carries no specific fields beyond those common to every transaction (`Account`, `Fee`, `Sequence`...).

## Common errors

- **tecNO_ENTRY** — your account has no `DID` published; there's nothing to delete.
- **tefBAD_LEDGER** — internal inconsistency in the owner directory; indicative of a ledger issue, not your transaction.

## Example

```json
{
  "TransactionType": "DIDDelete",
  "Account": "rXXXX_YOUR_ACCOUNT"
}
```

Deletes your account's DID, if it exists.

## Try it on testnet

1. If your account doesn't have a DID yet, create one first with [DIDSet](/tx/DIDSet).
2. Confirm with `account_objects` (`type: "did"`) that the object exists.
3. Sign and send the `DIDDelete` from the example.
4. Repeat `account_objects`: the object no longer appears, and `account_info` will show your `OwnerCount` has dropped by one and the effective reserve decreases accordingly.
5. Send the same `DIDDelete` again: you'll get `tecNO_ENTRY`, since there's nothing left to delete.

## Related

- [DIDSet](/tx/DIDSet) — creates or updates the DID.
- [AccountDelete](/tx/AccountDelete) — requires deleting the DID (and other objects) from the account first.
- Objects: [DID](/objects/DID).
- Amendments: [DID](/amendments/DID).
