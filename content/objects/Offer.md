---
title: Offer
summary: An open order in the native DEX's order book: offers one asset in exchange for another at a given price.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/offer
createdBy: OfferCreate
modifiedBy: OfferCreate
reserve: 1
---

## What it represents

An `Offer` is a limit order: "I give up to `TakerGets`, in exchange for `TakerPays`". The XRPL DEX is a central limit order book, not an automated pool (that's [AMM](/objects/AMM)); each `Offer` hangs off a book `DirectoryNode` (`BookDirectory`), which groups all offers for the same asset pair at the same quality (price). The portion of the order that doesn't match instantly stays live in the ledger until someone matches it, it expires, or the owner cancels it.

It can be of type `lsfSell` (sell exactly `TakerGets`, accepting more than `TakerPays` if the market improves) or normal (fill exactly up to `TakerPays`).

## Lifecycle

- **Creation**: [OfferCreate](/tx/OfferCreate). It first attempts to match against the existing book; whatever remains (if `tfImmediateOrCancel` is not set) is stored as a new `Offer`, linked to `BookDirectory` (`BookNode`) and to the owner's directory (`OwnerNode`).
- **Partial or full match**: each subsequent [OfferCreate](/tx/OfferCreate) that matches against this order reduces `TakerPays`/`TakerGets` proportionally; if it reaches zero, it's deleted.
- **Cancellation**: [OfferCancel](/tx/OfferCancel), only by the owner, specifying the `OfferSequence` to withdraw.
- **Expiration**: if `Expiration` has passed, the order no longer matches even though it remains in the ledger; it's cleaned up the first time another transaction finds it expired (an implicit `tecEXPIRED` while traversing the book, not a direct error).
- **Cascading deletion**: [AccountDelete](/tx/AccountDelete) of the owner deletes their pending offers.

## Key fields

- **TakerGets / TakerPays** — what the order's creator offers and what they ask for; the ratio between the two defines the price (`quality`).
- **BookDirectory / BookNode** — the book directory this order is indexed in, whose key embeds the price in the last 64 bits.
- **Expiration** — seconds since the Ripple Epoch; past that point the order is no longer valid for matching.
- **DomainID** — if present, the order is only visible/matchable within that [PermissionedDomain](/objects/PermissionedDomain), for access-controlled markets.
- **AdditionalBooks** — additional books (besides the primary one computed from `TakerPays`/`TakerGets`) in which this order is also indexed, used with permissioned domains.

## Flags

- **lsfPassive** — the order does not match against other orders at the exact same price when created; it only rests in the book.
- **lsfSell** — sell exactly `TakerGets`, accepting to receive more than `TakerPays` if a better price is available, instead of being limited to that exact amount.
- **lsfHybrid** — the order participates both in the open book and in a permissioned domain book (requires `DomainID` and `AdditionalBooks`).

## How to query it

`account_objects` with `type: "offer"` returns it for its owner; `book_offers` traverses the book for an asset pair. With `ledger_entry`, `offer` accepts `account` and `seq` (the `Sequence` of the `OfferCreate`):

```json
{ "method": "ledger_entry", "params": [{ "offer": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x006F || AccountID_owner || Sequence)` (`keylet::offer`, namespace `'o'`). Typical response:

```json
{
  "index": "1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B",
  "node": {
    "LedgerEntryType": "Offer",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "TakerGets": "10000000",
    "TakerPays": { "currency": "USD", "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "value": "5" },
    "BookDirectory": "4627DFFCFF8B5A265EDBD8AE8C14A52325DBFEDAF4F5C32DAD9E0FE5E8A2AF6",
    "Flags": 0,
    "OwnerNode": "0",
    "BookNode": "0"
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the owner while it exists.

## Related

- [OfferCreate](/tx/OfferCreate), [OfferCancel](/tx/OfferCancel)
- [AMM](/objects/AMM), [DirectoryNode](/objects/DirectoryNode), [PermissionedDomain](/objects/PermissionedDomain)
