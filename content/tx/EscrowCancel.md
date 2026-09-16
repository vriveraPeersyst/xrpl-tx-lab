---
title: EscrowCancel
summary: Returns the funds of an Escrow whose CancelAfter has already passed to the creator, and removes the object from the ledger.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowcancel
amendment: Escrow
level: basic
---

## What it does

`EscrowCancel` undoes an [Escrow](/objects/Escrow) that has expired: it returns the locked amount to the account that created it (`Owner`) and deletes the object. This is only possible if the escrow had `CancelAfter` and that moment has already passed according to the ledger's close time. An escrow without `CancelAfter` can never be cancelled: it can only end with [EscrowFinish](/tx/EscrowFinish).

As with `EscrowFinish`, any account can send the transaction; it doesn't need to be the creator or the recipient. The escrow is identified by `Owner` and `OfferSequence` (the `Sequence` or Ticket of the original [EscrowCreate](/tx/EscrowCreate)). Upon cancellation, the creator recovers the funds and one unit of owner reserve.

## When to use it

- Recovering a bond or a conditional payment that the recipient didn't claim in time.
- Cleaning up expired escrows to free up reserve (0.2 XRP per object on testnet).
- Any "housekeeping" service can cancel expired escrows belonging to third parties, since the transaction doesn't require you to be the owner.

## How it works inside

**`EscrowCancel::preflight`** doesn't validate anything specific: only the common checks apply to any transaction (signature, fee, universal flags).

**`EscrowCancel::preclaim`** (against the ledger). With [TokenEscrow](/amendments/TokenEscrow) active, as on testnet, it looks up the escrow by `keylet::escrow(Owner, OfferSequence)`; if it doesn't exist, `tecNO_TARGET`. If the amount is an IOU token, `escrowCancelPreclaimHelper<Issue>` checks that the creator is still authorized by the issuer (`requireAuth`), so the funds can be returned. For MPT, it also checks that the issuance still exists (`tecOBJECT_NOT_FOUND`). Note: freezing is not checked, unlike in `EscrowFinish`; the refund to the creator is allowed even if the trust line is frozen.

**`EscrowCancel::doApply`** (effects). If the escrow has no `CancelAfter`, `tecNO_PERMISSION`. If the parent ledger's close time hasn't yet passed `CancelAfter`, also `tecNO_PERMISSION`. From there: it removes the escrow from the creator's owner directory and, if a `DestinationNode` exists, from the recipient's directory. It returns the amount: if XRP, it's added to the creator's `Balance`; if a token, it calls `escrowUnlockApplyHelper` with parity rate (`kParityRate`), i.e. without applying `TransferRate` on the refund, and removes the link from the issuer's directory. If the creator deleted their trust line while the escrow was pending, the refund recreates it (`createAsset` is true when the one cancelling is the creator). Finally it decrements the creator's `OwnerCount` and deletes the object. The [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) amendment (not active on testnet) only changes the order in which the owner count is decremented relative to the possible recreation of the trust line, so that the deleted escrow doesn't count against the reserve.

Unlike `EscrowFinish`, there's no cryptographic condition or `DepositAuth` check here: the money goes back to its owner, not into any other account.

## Key fields

- **Owner** — account that created the escrow and will receive the funds back.
- **OfferSequence** — `Sequence` (or `TicketSequence`) of the `EscrowCreate` transaction. Together with `Owner`, it identifies the object.

There are no other fields specific to this transaction. The signing account (`Account`) can be anyone.

## Common errors

- **tecNO_PERMISSION** — The escrow has no `CancelAfter`, or that moment hasn't arrived yet. Remember it's compared against the parent ledger's close time, not your local clock.
- **tecNO_TARGET** — There's no escrow with that `Owner` + `OfferSequence`; it may have already been finished or cancelled.
- **tecNO_AUTH** — Token escrow whose issuer has `RequireAuth` and has withdrawn authorization from the creator.
- **tecOBJECT_NOT_FOUND** — MPT escrow whose issuance no longer exists.
- **tefBAD_LEDGER** — Internal failure removing the object from a directory; shouldn't happen.

## Example

Cancel an escrow you created yourself with `Sequence` 12345:

```json
{
  "TransactionType": "EscrowCancel",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Owner": "rXXXX_YOUR_ACCOUNT",
  "OfferSequence": 12345
}
```

## Try it on testnet

1. Create an escrow with [EscrowCreate](/tx/EscrowCreate) using `FinishAfter` at +60 s and `CancelAfter` at +180 s (the builder supports `{{time+180}}`). Note its `Sequence`.
2. Send `EscrowCancel` immediately: you'll get `tecNO_PERMISSION` because `CancelAfter` hasn't passed yet.
3. Wait until the ledger passes `CancelAfter` and resend. The result should be `tesSUCCESS`.
4. Query `account_objects` with `type: "escrow"`: the object is gone. In `account_info`, your `Balance` has recovered the amount (minus fees) and your `OwnerCount` has decreased by one.
5. Also try cancelling from another account (`Account` different from `Owner`): it works the same way, since anyone can cancel an expired escrow.

## Related

- [EscrowCreate](/tx/EscrowCreate) — creates the escrow and sets `CancelAfter`.
- [EscrowFinish](/tx/EscrowFinish) — the alternative path: delivering to the recipient.
- [Escrow](/objects/Escrow) — the object that gets deleted.
- [TokenEscrow](/amendments/TokenEscrow) — escrow for IOU and MPT.
- [fixTokenEscrowV1](/amendments/fixTokenEscrowV1) — fixes to token escrow.
