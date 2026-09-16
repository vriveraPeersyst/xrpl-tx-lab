---
title: DirectoryNode
summary: Page of an internal ledger index: lists the IDs of an account's objects or the offers in a book at a given price.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/directorynode
createdBy: Payment, OfferCreate, TrustSet, EscrowCreate, NFTokenCreateOffer
modifiedBy: OfferCancel, EscrowFinish, AccountDelete
reserve: 0
---

## What it represents

The ledger is a tree of objects indexed by hash; it has no native way to answer "what objects does this account have?" or "what offers exist at this price?". `DirectoryNode`s are the index that resolves that: each one is a page with up to 32 object IDs (`Indexes`) and pointers to the previous and next page. Three uses:

- **Owner directory** (`Owner` present): lists everything an account owns. This is what `account_objects` traverses.
- **Book directory** (`TakerPays*`/`TakerGets*` present): all the [Offer](/objects/Offer) objects for an asset pair at the same quality (price). The price is embedded in the last 64 bits of the key.
- **NFT offer directories** (`NFTokenID` present): the buy or sell offers for a specific NFT ([NFTokenOffer](/objects/NFTokenOffer)).

It's an infrastructure object: you never create or delete it directly.

## Lifecycle

- **Creation**: the first time an account acquires an object (a trust line via [TrustSet](/tx/TrustSet), an offer via [OfferCreate](/tx/OfferCreate), an escrow…), `dirInsert` in `View.cpp` creates the root page of its directory. When the root fills up, it creates the next page and links it with `IndexNext`/`IndexPrevious`. A book is created with the first offer at that price.
- **Modification**: every object addition or removal adds or removes an ID from `Indexes`.
- **Deletion**: `dirRemove` deletes a page once it becomes empty. An owner directory disappears entirely with [AccountDelete](/tx/AccountDelete). The page limit is 262,144 ([fixDirectoryLimit](/amendments/fixDirectoryLimit)); once reached, additions fail with `tecDIR_FULL`.

## Key fields

- **RootIndex** — key of the directory's root page. At the root it matches `index`.
- **Indexes** — up to 32 object IDs. On non-root pages the order is insertion order; in books, the order within the same quality is chronological.
- **IndexNext / IndexPrevious** — page number (not hash) of neighboring pages; the key of page N is `SHA512Half(0x0064 || RootIndex || N)` (`keylet::page`). Absent if there's only one page.
- **Owner** — the owning account, only in owner directories.
- **TakerPaysCurrency / TakerPaysIssuer / TakerGetsCurrency / TakerGetsIssuer** — the book's pair. With MPT, `TakerPaysMPT` / `TakerGetsMPT` are used instead.
- **ExchangeRate** — the book's quality encoded in 64 bits, the same value that goes in the last 8 bytes of the key.
- **DomainID** — present in the books of a permissioned domain ([PermissionedDEX](/amendments/PermissionedDEX)).
- **NFTokenID** — the NFT whose offers it lists, in `nftBuys` / `nftSells` directories.
- **PreviousTxnID / PreviousTxnLgrSeq** — only in owner directories and since [fixPreviousTxnID](/amendments/fixPreviousTxnID).

## Flags

- **lsfNFTokenBuyOffers** — buy-offer directory for an NFT.
- **lsfNFTokenSellOffers** — sell-offer directory for an NFT.

In all other directories `Flags` is 0.

## How to query it

It doesn't appear in `account_objects` (it doesn't count as an object of its own). With `ledger_entry`, use `directory` with `owner` or with `dir_root`, and optionally `sub_index` for later pages:

```json
{ "method": "ledger_entry", "params": [{ "directory": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "sub_index": 0 }, "ledger_index": "validated" }] }
```

An owner's root is `SHA512Half(0x004F || AccountID)` (`keylet::ownerDir`). For books, `book_offers` is more practical. Typical response:

```json
{
  "index": "A6C6EB0E3D2F1B8C9A7D5E4F3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B",
  "node": {
    "LedgerEntryType": "DirectoryNode",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "RootIndex": "A6C6EB0E3D2F1B8C9A7D5E4F3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B",
    "Indexes": [
      "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B",
      "E6E7F1C4E2B9F0AB0C5A2B7E3D9C1F5A8B4D6E2C0F9A7B3D5E1C8F4A6B2D0E9C"
    ],
    "Flags": 0,
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Reserve

None. Directory pages don't count toward `OwnerCount`; you pay for the objects they contain, not for the index.

## Related

- [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet), [AccountDelete](/tx/AccountDelete)
- [AccountRoot](/objects/AccountRoot), [Offer](/objects/Offer), [NFTokenOffer](/objects/NFTokenOffer)
- [fixDirectoryLimit](/amendments/fixDirectoryLimit), [fixPreviousTxnID](/amendments/fixPreviousTxnID), [SortedDirectories](/amendments/SortedDirectories)
</content>
</invoke>
