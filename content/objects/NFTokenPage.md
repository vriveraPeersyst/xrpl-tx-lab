---
title: NFTokenPage
summary: A page that groups up to 32 NFTs from the same account; the set of chained pages is the owner's NFT "inventory".
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/nftokenpage
createdBy: NFTokenMint
modifiedBy: NFTokenMint, NFTokenBurn, NFTokenAcceptOffer, NFTokenModify
reserve: 0
---

## What it represents

NFTs are not individual ledger objects: they live grouped inside `NFTokenPage`, sorted by `NFTokenID` within each page, with up to 32 per page. All pages belonging to the same account form a doubly linked list (`PreviousPageMin`/`NextPageMin`) whose index is constructed so that the page ID itself embeds the owner's `AccountID` in the first bytes; this lets rippled locate an account's page range without needing a separate owner directory.

Unlike almost everything else in the ledger, holding NFTs **does not consume owner reserve**: you can accumulate hundreds of NFTs without paying additional XRP in reserve (though the cost of each mint transaction still applies).

## Lifecycle

- **Creation**: [NFTokenMint](/tx/NFTokenMint) inserts the new `NFTokenID` into the appropriate page (sorted by ID), creating a new page if the existing one already has 32 tokens or none exists yet.
- **Modification**: [NFTokenBurn](/tx/NFTokenBurn) removes a token from its page, merging or removing pages that become empty or sparsely filled. [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) moves the token from the seller's page to a page owned by the buyer. [NFTokenModify](/tx/NFTokenModify) changes the token's `URI` without moving it to another page, only if the NFT was minted with `tfMutable`.
- **Deletion**: automatic when a page runs out of tokens; there is no dedicated transaction to delete the page itself.

## Key fields

- **NFTokens** — array sorted by `NFTokenID`, each entry with `NFTokenID`, `URI` (optional), and the flags/issuer/taxon/serial number encoded within the ID itself.
- **PreviousPageMin / NextPageMin** — link to the previous/next page of the same account; absent at the ends of the list.

## Flags

Has no `lsf*` flags of its own (flags for each individual NFT, such as `tfBurnable` or `tfMutable`, are encoded within the `NFTokenID`, not as `lsf*` flags on the page object).

## How to query it

`account_objects` with `type: "nft_page"` returns all pages for the account; for listing NFTs more directly, the dedicated `account_nfts` method is preferable. With `ledger_entry`, `nft_page` only accepts the object ID directly:

```json
{ "method": "ledger_entry", "params": [{ "nft_page": "0000000000000000000000000000000000000000000000000000FFFFFFFF", "ledger_index": "validated" }] }
```

The boundary IDs are computed with `keylet::nftokenPageMin(owner)` (the `AccountID` bytes in the high part, the rest zeroed) and `keylet::nftokenPageMax(owner)` (the same bytes with the rest set to `nft::kPageMask`); intermediate pages have IDs between the two. Typical response:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "NFTokenPage",
    "NFTokens": [
      { "NFToken": { "NFTokenID": "000B0000...", "URI": "697066733A2F2F..." } }
    ],
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Related

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn), [NFTokenModify](/tx/NFTokenModify)
- [NFTokenOffer](/objects/NFTokenOffer)
- [DynamicNFT](/amendments/DynamicNFT)
