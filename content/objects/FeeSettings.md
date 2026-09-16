---
title: FeeSettings
summary: A unique object that stores the base cost of a transaction and the account and owner reserves currently in effect on the network.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/feesettings
createdBy: SetFee
modifiedBy: SetFee
reserve: 0
---

## What it represents

`FeeSettings` is a singleton: only one object of this type exists in the entire ledger, and no one owns it. It fixes three numbers that everyone needs in order to build a valid transaction: the base cost in drops, the account reserve (the minimum required for an `AccountRoot` to exist), and the owner reserve (the cost of each additional object the account owns, such as an `Escrow` or a trust line). The server multiplies these values by the network load (`load_factor`) to calculate the fee that must actually be paid on each transaction; that isn't stored here, it's computed on the fly.

## Lifecycle

- **Creation**: it has existed since the ledger's genesis; no user transaction creates it.
- **Modification**: the [SetFee](/tx/SetFee) pseudo-transaction, issued by validators through consensus (never by a user) when they decide to change network fees. It can't be sent manually.
- **Deletion**: never deleted.
- **Historical format**: the object has two generations of fields coexisting. The old one (`BaseFee`, `ReferenceFeeUnits`, `ReserveBase`, `ReserveIncrement`) used relative "fee units"; the current one (`BaseFeeDrops`, `ReserveBaseDrops`, `ReserveIncrementDrops`) expresses everything directly in drops. A recent ledger only carries the drop-denominated fields.

## Key fields

- **BaseFeeDrops** — base cost of a "normal" transaction (a simple `Payment`), before applying `load_factor`.
- **ReserveBaseDrops** — minimum XRP an account must hold to exist.
- **ReserveIncrementDrops** — additional cost for each object the account owns (trust lines, offers, escrows, etc.).
- **BaseFee / ReferenceFeeUnits / ReserveBase / ReserveIncrement** — legacy equivalents in "fee units"; deprecated, kept for compatibility with older clients.

## Flags

Has no `lsf*` flags.

## How to query it

It doesn't appear in `account_objects` because it doesn't belong to any account; it's queried directly with `ledger_entry` by passing `"fee": true`, or with the dedicated `fee` method (without `ledger_entry`):

```json
{ "method": "ledger_entry", "params": [{ "fee": true, "ledger_index": "validated" }] }
```

The index is fixed: `SHA512Half(0x0065)` (`keylet::feeSettings`, namespace `'e'`). Typical response on testnet:

```json
{
  "index": "4BC50C9B0D8515D3EAAE1E74B29A95804346C491EE1A95BF25E4AAB854A6A66",
  "node": {
    "LedgerEntryType": "FeeSettings",
    "BaseFeeDrops": "10",
    "ReserveBaseDrops": "1000000",
    "ReserveIncrementDrops": "200000",
    "Flags": 0
  }
}
```

You can also use the `server_state` method, which exposes these same values already combined with `load_factor` inside `validated_ledger`.

## Related

- [SetFee](/tx/SetFee)
- [Amendments](/objects/Amendments), [NegativeUNL](/objects/NegativeUNL)
- [FeeEscalation](/amendments/FeeEscalation)
</content>
</invoke>
