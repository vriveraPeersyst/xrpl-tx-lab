---
title: Escrow
summary: Holds XRP until a cryptographic condition is met, a minimum time passes, or both.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/escrow
createdBy: EscrowCreate
modifiedBy: EscrowFinish, EscrowCancel
reserve: 1
---

## What it represents

An `Escrow` locks XRP out of the sender's available balance until a condition is met: `FinishAfter` elapses, someone presents fulfillment of a cryptographic `Condition` (PREIMAGE-SHA-256 crypto-condition), or both. While it exists, the XRP doesn't count as `Account`'s spendable balance but it does count as part of its total `Balance` (it affects the sender's reserve calculations indirectly, not directly: the escrow itself consumes 1 owner reserve unit).

It only supports XRP, never issued tokens or MPTs: `Amount` is always an STAmount in drops.

## Lifecycle

- **Creation**: [EscrowCreate](/tx/EscrowCreate). `preflight` requires at least one of `CancelAfter`, `FinishAfter`, or `Condition`, and validates the condition's format if given. `doApply` creates the object, links it to the sender's directory (`OwnerNode`) and, if applicable, to the destination's (`DestinationNode`), and adds 1 to the sender's `OwnerCount`.
- **Release**: [EscrowFinish](/tx/EscrowFinish), by any account (it doesn't have to be the sender or the destination). If there's a `Condition`, a `Fulfillment` satisfying it must be provided; if there's a `FinishAfter`, the ledger's `close_time` must have passed it. The object is deleted and the XRP goes to `Destination`.
- **Cancellation**: [EscrowCancel](/tx/EscrowCancel), only possible after `CancelAfter`. Returns the XRP to `Account` and deletes the object. Without `CancelAfter` the escrow can never be canceled: it can only be released with `EscrowFinish`.
- **Cascading deletion**: [AccountDelete](/tx/AccountDelete) of the sender or the destination fails if there are still pending escrows; they must be resolved first.

## Key fields

- **Account** — the sender, who pays and is charged the reserve.
- **Destination** — who receives the XRP upon release.
- **Amount** — XRP in drops, fixed at creation; it doesn't change.
- **Condition** — crypto-condition in binary (DER) format. If present, `EscrowFinish` requires a valid `Fulfillment`.
- **CancelAfter / FinishAfter** — seconds since the Ripple Epoch (2000-01-01). `FinishAfter` is the point from which the escrow can be finished; `CancelAfter`, the point from which it can be canceled.
- **OwnerNode / DestinationNode** — pages of the sender's and destination's directories where the object is linked.
- **TransferRate / IssuerNode** — reserved for escrows with a special-type `Condition`; in practice not used in normal XRP escrows.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "escrow"` returns it for the sender and, if linked, for the destination. With `ledger_entry`, `escrow` accepts `owner` (the sending account) and `seq` (the `Sequence` of the `EscrowCreate`):

```json
{ "method": "ledger_entry", "params": [{ "escrow": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0075 || AccountID_sender || Sequence)` (`keylet::escrow`). Typical response:

```json
{
  "index": "6516969F8B7997F87A54F92FA5A2D3BC5BE4A7A7E6B8B0E9F4B5A7C9E1B3D5F",
  "node": {
    "LedgerEntryType": "Escrow",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Amount": "10000000",
    "CancelAfter": 545440232,
    "FinishAfter": 545354800,
    "Condition": "A0258020E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855810100",
    "OwnerNode": "0",
    "DestinationNode": "0",
    "Flags": 0,
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet) from the sender while it exists.

## Related

- [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish), [EscrowCancel](/tx/EscrowCancel)
- [Check](/objects/Check), [PayChannel](/objects/PayChannel), [AccountRoot](/objects/AccountRoot)
- [Escrow](/amendments/Escrow), [CryptoConditions](/amendments/CryptoConditions)
</content>
</invoke>
<parameter name="file_path">/Users/vrc-mini/Projects/Peersyst/peersyst-Workspace/xrpl-tx-lab/content/objects/FeeSettings.md