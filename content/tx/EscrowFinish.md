---
title: EscrowFinish
summary: Releases the funds of an Escrow whose FinishAfter has already passed to the recipient, providing the Fulfillment if the escrow had a Condition.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowfinish
amendment: Escrow
level: intermediate
---

## What it does

`EscrowFinish` completes an [Escrow](/objects/Escrow) created with [EscrowCreate](/tx/EscrowCreate): it delivers the locked amount to the escrow's `Destination` account and deletes the object from the ledger. Any account can send this transaction (it doesn't have to be the sender or the recipient), as long as the conditions are met: `FinishAfter` has passed, `CancelAfter` hasn't passed, and, if the escrow had a `Condition`, the correct `Fulfillment` is provided.

The escrow is identified by `Owner` (who created it) and `OfferSequence` (the `Sequence` or Ticket of the `EscrowCreate` transaction). Upon finishing, the creator's `OwnerCount` decreases by one and they recover the object's reserve.

An important detail: escrows don't create accounts. If the destination has been deleted while the escrow was alive, finishing fails with `tecNO_DST`.

## When to use it

- Claiming a vesting or scheduled payment when the date arrives.
- Closing a conditional exchange by revealing the preimage (`Fulfillment`) of the condition.
- Automating the release: an external service can send the `EscrowFinish` on behalf of the recipient, since anyone can sign it.

## How it works inside

**`EscrowFinish::preflight`** (static). `Condition` and `Fulfillment` go together or not at all: if one appears without the other, `temMALFORMED`. In `preflightSigValidated`, if both are present, it verifies that the fulfillment satisfies the condition (`checkCondition`) and the result is cached in the HashRouter; `CredentialIDs` are also validated with `credentials::checkFields` if present. The fee isn't the base fee: `EscrowFinish::calculateBaseFee` adds `base × (32 + fulfillment_size / 16)` drops when there's a `Fulfillment`. With testnet's base fee (10 drops), a small fulfillment costs at least 330 drops.

**`EscrowFinish::preclaim`** (against the ledger). If there are `CredentialIDs` and [Credentials](/amendments/Credentials) is active, it checks that the credentials are valid for the sending account. With [TokenEscrow](/amendments/TokenEscrow) active, the escrow is already read here via `keylet::escrow(Owner, OfferSequence)`; if it doesn't exist, `tecNO_TARGET`. If the amount is a token, `escrowFinishPreclaimHelper` requires that the destination be authorized by the issuer (if `RequireAuth`) and not be in deep freeze (`tecFROZEN`) or locked in the MPT (`tecLOCKED`).

**`EscrowFinish::doApply`** (effects). Using the parent ledger's close time: if `FinishAfter` exists and hasn't passed yet, `tecNO_PERMISSION` ("too soon"); if `CancelAfter` exists and has already passed, also `tecNO_PERMISSION` ("too late"). Then the condition: if the cached fulfillment is invalid, `tecCRYPTOCONDITION_ERROR`; if the escrow had no `Condition` but the transaction brings one, or brings one different from the stored one, also `tecCRYPTOCONDITION_ERROR`. The destination is read (`tecNO_DST` if it doesn't exist) and `verifyDepositPreauth` is applied: if the destination has `lsfDepositAuth`, only the destination itself, an account preauthorized with [DepositPreauth](/tx/DepositPreauth), or someone with credentials accepted by the destination can finish it. It then removes the escrow from the creator's and destination's directories, pays out the amount: XRP directly to the `Balance`; tokens via `escrowUnlockApplyHelper`, applying the `TransferRate` stored in the object at creation time, and removing the escrow from the issuer's directory. Finally it decrements the creator's `OwnerCount` and deletes the object.

## Key fields

- **Owner** — Account that created the escrow. Not necessarily your account.
- **OfferSequence** — `Sequence` (or `TicketSequence`) of the original `EscrowCreate`. Together with `Owner`, identifies the object.
- **Condition** — Must be exactly the same one stored in the escrow. If the escrow had no condition, don't include it.
- **Fulfillment** — Preimage in hexadecimal that satisfies the condition. Required if you set `Condition`. Increases the fee.
- **CredentialIDs** — Credential identifiers to pass the destination's `DepositAuth` filter.

## Common errors

- **tecNO_PERMISSION** — `FinishAfter` hasn't arrived yet, `CancelAfter` has already passed, or the destination has `DepositAuth` and you're not preauthorized.
- **tecNO_TARGET** — There's no escrow with that `Owner` + `OfferSequence`. Check that you're using the `Sequence` of the `EscrowCreate`, not the one for the escrow shown under a different name in `account_objects`.
- **tecCRYPTOCONDITION_ERROR** — Incorrect `Fulfillment`, a `Condition` different from the escrow's, or you set a `Condition` on an escrow that didn't have one.
- **temMALFORMED** — `Condition` without `Fulfillment` or vice versa.
- **telINSUF_FEE_P / terINSUF_FEE_B** — The fee doesn't cover the extra amount for `Fulfillment`.
- **tecNO_DST** — The escrow's destination account no longer exists.
- **tecFROZEN / tecLOCKED** — Token escrow with a frozen or locked destination.

## Example

Finish an escrow you created yourself (hence `Owner` is your account) with `Sequence` 12345 and no condition:

```json
{
  "TransactionType": "EscrowFinish",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Owner": "rXXXX_YOUR_ACCOUNT",
  "OfferSequence": 12345
}
```

If the escrow had a condition, you'd add `"Condition": "A0258020...810120"` and `"Fulfillment": "A0228020..."`.

## Try it on testnet

1. First create an escrow with [EscrowCreate](/tx/EscrowCreate) with `FinishAfter` about two minutes out and note its `Sequence`.
2. Send `EscrowFinish` immediately with that `OfferSequence`: you'll see `tecNO_PERMISSION`, because `FinishAfter` hasn't passed yet.
3. Wait until the ledger's close time passes `FinishAfter` and resend. The result should be `tesSUCCESS`.
4. Query `account_objects` with `type: "escrow"` on your account: the object is gone. `account_info` of the destination account shows the increased `Balance`, and your `OwnerCount` has decreased by one.
5. Optional: enable `asfDepositAuth` on the destination account and try finishing from a third account to see the `DepositAuth` `tecNO_PERMISSION`.

## Related

- [EscrowCreate](/tx/EscrowCreate) — creates the escrow.
- [EscrowCancel](/tx/EscrowCancel) — returns the funds if `CancelAfter` passes.
- [Escrow](/objects/Escrow) — the object deleted here.
- [DepositPreauth](/tx/DepositPreauth) — preauthorizes who can finish toward an account with `DepositAuth`.
- [Credentials](/amendments/Credentials) — allows passing `DepositAuth` with credentials.
- [TokenEscrow](/amendments/TokenEscrow) — escrow for IOU and MPT.
