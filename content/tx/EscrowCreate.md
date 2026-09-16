---
title: EscrowCreate
summary: Locks XRP, issued tokens, or MPT in an Escrow object that is only released to the recipient after a time passes or a cryptographic condition is presented.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowcreate
amendment: Escrow
level: intermediate
---

## What it does

`EscrowCreate` sets aside an amount from your account and stores it in an [Escrow](/objects/Escrow) object on the ledger. That money stops being available to you, but the recipient doesn't have it yet either: it stays "in escrow" until someone releases it with [EscrowFinish](/tx/EscrowFinish) or returns it with [EscrowCancel](/tx/EscrowCancel).

The analogy is a sealed envelope in a safe with a timer: no one can open it before `FinishAfter`, only the recipient can claim it between `FinishAfter` and `CancelAfter`, and after `CancelAfter` it can only be returned to the sender. In addition to time, you can require a `Condition` (a PREIMAGE-SHA-256 crypto-condition): the escrow is only released if someone presents the correct preimage.

Since the [TokenEscrow](/amendments/TokenEscrow) amendment, active on testnet, `Amount` can be XRP, an issued token (IOU), or an MPT. With tokens, the issuer must have enabled `lsfAllowTrustLineLocking` (or `lsfMPTCanEscrow` on the MPT issuance). The created object consumes one unit of owner reserve from your account until it disappears.

## When to use it

- Deferred payments or vesting: releasing funds on a specific date without depending on the sender staying active.
- Conditional payments: an exchange where claiming requires revealing a secret (the condition's preimage).
- Guarantees: locking XRP as a bond, with `CancelAfter` to recover it if no one claims it.
- Locking issued tokens (stablecoins, for example) under the same rules, if the issuer allows it.

## How it works inside

**`EscrowCreate::preflight`** (static validation). If `Amount` isn't XRP, it requires [TokenEscrow](/amendments/TokenEscrow) to be active (otherwise `temBAD_AMOUNT`) and the amount to be positive with a valid currency. With XRP it's enough for it to be greater than zero. There must be at least one of `CancelAfter` or `FinishAfter` (`temBAD_EXPIRATION`); if both are present, `CancelAfter` must be strictly after `FinishAfter`. If there's no `FinishAfter`, there must be a `Condition`: the code justifies this because, without either, the escrow could be finished immediately, which is confusing (`temMALFORMED`). If there's a `Condition`, it's deserialized with `Condition::deserialize`; if malformed, `temMALFORMED`. The `Bytecode` and `Data` fields (SmartEscrow) cause `checkExtraFeatures` to reject the transaction while that amendment doesn't exist on the network.

**`EscrowCreate::preclaim`** (against the ledger). The destination must exist (`tecNO_DST`) and can't be a pseudo-account (`tecNO_PERMISSION`). For IOU tokens, `escrowCreatePreclaimHelper<Issue>` checks, in this order: you're not the issuer; the issuer exists (`tecNO_ISSUER`) and has `lsfAllowTrustLineLocking` (`tecNO_PERMISSION`); you have a trust line with them (`tecNO_LINE`); both you and the destination pass `requireAuth` if the issuer requires authorization; neither of you is frozen (`tecFROZEN`); and your available balance covers the amount (`tecINSUFFICIENT_FUNDS`). For MPT, the equivalent is checked: the issuance exists, has `lsfMPTCanEscrow`, you have an MPToken object, you're not locked (`tecLOCKED`), and the issuance allows transfers.

**`EscrowCreate::doApply`** (effects). It first checks the parent ledger's close time: if `CancelAfter` or `FinishAfter` have already passed, it returns `tecNO_PERMISSION` — that is, you can't create an escrow with dates in the past. Then it checks that you cover the reserve for one more object (`checkReserve`) and, if the escrow is XRP, that after subtracting the amount you're still above your reserve (`tecUNFUNDED`). If the destination has `lsfRequireDestTag` and you don't set `DestinationTag`, `tecDST_TAG_NEEDED`. Next it creates the `Escrow` entry indexed by your account and the transaction's Sequence (or Ticket), inserts it into your owner directory, into the destination's directory (if it's not a self-send) and, for IOU, also into the issuer's directory. With tokens, it stores the issuer's current `TransferRate` in the object to apply it when claimed. Finally it subtracts the amount from your `Balance` (XRP) or moves the tokens to the issuer with `directSendNoFee` / `lockEscrowMPT`, and increments your `OwnerCount`.

## Key fields

- **Amount** — Amount to lock. In drops if XRP; `{currency, issuer, value}` object for IOU; `{mpt_issuance_id, value}` for MPT.
- **FinishAfter** — Seconds since the Ripple Epoch (2000-01-01 00:00 UTC), not Unix. Before this moment, no one can finish the escrow.
- **CancelAfter** — Ripple Epoch seconds. From this point on, the escrow can no longer be finished, and anyone can cancel it. Without it, the escrow never expires.
- **Condition** — PREIMAGE-SHA-256 crypto-condition in hexadecimal. Whoever finishes it will need to provide the corresponding `Fulfillment`.
- **DestinationTag** — Required if the destination requires a tag; it's copied to the object so the recipient sees it when claiming.

## Common errors

- **temBAD_EXPIRATION** — You didn't set either `FinishAfter` or `CancelAfter`, or `CancelAfter` isn't after `FinishAfter`.
- **temMALFORMED** — No `FinishAfter` and no `Condition`, or the `Condition` isn't a valid crypto-condition.
- **tecNO_PERMISSION** — The dates have already passed by the time the transaction is applied, the destination is a pseudo-account, or the token issuer doesn't allow locking (`lsfAllowTrustLineLocking` / `lsfMPTCanEscrow`).
- **tecUNFUNDED** — After setting aside the XRP you'd fall below the reserve (1 XRP base + 0.2 XRP per object on testnet).
- **tecINSUFFICIENT_RESERVE** — You don't cover the reserve for the new object.
- **tecNO_DST** — The destination account doesn't exist. An escrow doesn't create accounts.
- **tecDST_TAG_NEEDED** — The destination has `lsfRequireDestTag` and `DestinationTag` is missing.
- **tecNO_LINE / tecFROZEN** — With tokens: you don't have a trust line with the issuer, or the line (yours or the destination's) is frozen.

## Example

Lock 2 XRP that can be claimed starting in two minutes and returned starting after one day. The times are Ripple Epoch (843000120 ≈ now + 120 s; 843086400 ≈ now + 86,400 s).

```json
{
  "TransactionType": "EscrowCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "Amount": "2000000",
  "FinishAfter": 843000120,
  "CancelAfter": 843086400
}
```

## Try it on testnet

1. In the builder, leave `Amount` at `2000000` drops and set `FinishAfter` a few minutes in the future (the builder computes `{{time+120}}` for you).
2. Sign and send. Check that the result is `tesSUCCESS` and note the transaction's `Sequence`: you'll need it as `OfferSequence` in `EscrowFinish` or `EscrowCancel`.
3. Query `account_objects` with `type: "escrow"` on your account: you'll see the object with `Amount`, `Destination`, `FinishAfter`, and `CancelAfter`.
4. Query `account_info`: your `Balance` has dropped by 2 XRP plus the fee, and your `OwnerCount` has increased by 1.
5. Try an `EscrowFinish` before `FinishAfter`: you'll get `tecNO_PERMISSION`. Repeat once the time has passed.

## Related

- [EscrowFinish](/tx/EscrowFinish) — releases the funds to the recipient.
- [EscrowCancel](/tx/EscrowCancel) — returns the funds after `CancelAfter`.
- [Escrow](/objects/Escrow) — the object this transaction creates.
- [TokenEscrow](/amendments/TokenEscrow) — allows locking IOU and MPT.
- [fixTokenEscrowV1](/amendments/fixTokenEscrowV1) — fixes to token escrow.
- [AccountSet](/tx/AccountSet) — the issuer enables `asfAllowTrustLineLocking`.
