---
title: LedgerHashes
summary: System object that stores hashes of past ledgers to allow jumping backward through history without traversing it entirely.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ledgerhashes
createdBy: sistema (consenso)
modifiedBy: sistema (consenso)
reserve: 0
---

## What it represents

Each ledger links to the previous one by its hash, but walking that chain one by one to reach an old ledger would be very expensive. `LedgerHashes` implements a "skip list": it stores up to 256 hashes of previous ledgers so you can jump directly backward in few hops, instead of ledger by ledger.

There are two variants, both with the same `LedgerEntryType`:

- **Short skip list**: a fixed-index object that gets updated on every ledger and stores the last 256 hashes.
- **Long skip list**: one object per range of 65536 ledgers ("flag ledger"), storing the hashes of the ledgers that are multiples of 256 within that range. With the short and long lists combined, you can reach any historical ledger in at most two hops.

## Lifecycle

- **Creation and update**: automatic, on every ledger close, as part of the consensus process itself. No user transaction touches them; there is no `EnableAmendment` or `SetFee` equivalent for this type.
- **Deletion**: they are never deleted.

## Key fields

- **Hashes** — vector of up to 256 256-bit hashes, in order.
- **FirstLedgerSequence** — only in the long skip list: the first ledger index covered.
- **LastLedgerSequence** — only in the long skip list: the last ledger index covered.

## Flags

It has no `lsf*` flags.

## How to query it

It does not belong to any account, so it does not appear in `account_objects`. With `ledger_entry`, the `hashes` parameter accepts two forms: `true` for the short skip list, or a ledger index number for the long skip list that covers that range:

```json
{ "method": "ledger_entry", "params": [{ "hashes": true, "ledger_index": "validated" }] }
```

```json
{ "method": "ledger_entry", "params": [{ "hashes": 20800000, "ledger_index": "validated" }] }
```

The index of the short list is fixed: `SHA512Half(0x0073)` (`keylet::skip()`, namespace `'s'`). The index of the long list is computed as `SHA512Half(0x0073 || (ledger_index >> 16))`, i.e. a different object for each block of 65536 ledgers. Typical response:

```json
{
  "index": "B4979A36CDC7F3D3D5C31A4EAE2AC7D7209DDA877588B9AFC66799692AB0D66",
  "node": {
    "LedgerEntryType": "LedgerHashes",
    "Hashes": [
      "C6A5FDE95FC5D9A6D...",
      "A38B7C1D9E2F4A6B8C..."
    ],
    "Flags": 0
  }
}
```

In practice it is faster to use `ledger` directly with `ledger_index` to get a specific hash; `LedgerHashes` is mainly used internally in rippled to serve `ledger_range` and history responses.

## Related

- [Amendments](/objects/Amendments), [FeeSettings](/objects/FeeSettings), [NegativeUNL](/objects/NegativeUNL)
