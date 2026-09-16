---
title: Check
summary: A deferred check: the issuer authorizes a payment up to a maximum, and the recipient decides when and how much to cash.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/check
createdBy: CheckCreate
modifiedBy: CheckCash, CheckCancel
reserve: 1
---

## What it represents

A `Check` works like a bank check. Whoever issues it doesn't move funds: they merely leave a promise in the ledger to pay up to `SendMax` to `Destination`. The recipient cashes it whenever they want with [CheckCash](/tx/CheckCash), and at that point the issuer's balance is checked. If they don't have enough, the check bounces (`tecUNFUNDED`) but keeps existing.

It's a way to "push" a payment to someone who has `lsfDepositAuth` or `lsfRequireDestTag`, or to let the recipient choose the tax or liquidity moment to cash it.

## Lifecycle

- **Creation**: [CheckCreate](/tx/CheckCreate). `preclaim` requires the destination to exist, not to have `lsfDisallowIncomingCheck`, and the check to not already be born expired. `doApply` creates the object, links it in the issuer's directory (`OwnerNode`) and in the destination's (`DestinationNode`), and adds 1 to the issuer's `OwnerCount`.
- **Cashing**: [CheckCash](/tx/CheckCash) by the recipient, with an exact `Amount` or `DeliverMin`. If the check is for a token and the recipient has no trust line, with [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) one is created automatically. When cashed, the object is always deleted, even if less than `SendMax` is cashed.
- **Cancellation**: [CheckCancel](/tx/CheckCancel). It can be sent by the issuer or the destination at any time; any account can cancel it once `Expiration` has passed.
- **Cascading deletion**: [AccountDelete](/tx/AccountDelete) of the issuer or the destination deletes the associated checks.

## Key fields

- **Account** — issuer, who will pay. The reserve is charged to them.
- **Destination** — the only one who can cash it.
- **SendMax** — cap on what's transferred, in drops or in an issued token. If it's a token, the `issuer` is the token's issuer, and its `TransferRate` applies when cashed.
- **Sequence** — the sequence (or ticket) of the `CheckCreate`; together with `Account` it forms the object's key.
- **Expiration** — seconds since the Ripple Epoch (2000-01-01). Once past that point, `CheckCash` fails with `tecEXPIRED` and anyone can cancel it.
- **InvoiceID** — a free-form 256-bit hash for the issuer to reference an invoice.
- **OwnerNode / DestinationNode** — pages of the issuer's and destination's directories where it's linked.

## Flags

It has no `lsf*` flags.

## How to query it

`account_objects` with `type: "check"` returns it for both the issuer and the recipient. With `ledger_entry`, `check` accepts only the object's ID:

```json
{ "method": "ledger_entry", "params": [{ "check": "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B", "ledger_index": "validated" }] }
```

The ID is `SHA512Half(0x0043 || issuer_AccountID || Sequence)` (`keylet::check`), and you can find it in the `CheckCreate` metadata (`CreatedNode.LedgerIndex`). Typical response:

```json
{
  "index": "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B",
  "node": {
    "LedgerEntryType": "Check",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "SendMax": "50000000",
    "Sequence": 20790113,
    "Expiration": 812000000,
    "DestinationTag": 42,
    "InvoiceID": "6F1DFD1D0FE8A32E40E1F2C05CF1C15545BAB56B617F9C6C2D63A6B704BEF59B",
    "OwnerNode": "0",
    "DestinationNode": "0",
    "Flags": 0,
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the issuer while it exists.

## Related

- [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel)
- [Escrow](/objects/Escrow), [PayChannel](/objects/PayChannel), [AccountRoot](/objects/AccountRoot)
- [Checks](/amendments/Checks), [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine), [DisallowIncoming](/amendments/DisallowIncoming)
