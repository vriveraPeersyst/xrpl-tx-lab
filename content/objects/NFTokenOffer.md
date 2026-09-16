---
title: NFTokenOffer
summary: A pending offer to buy or sell a specific NFT, at a price set by its creator.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/nftokenoffer
createdBy: NFTokenCreateOffer
modifiedBy: NFTokenAcceptOffer, NFTokenCancelOffer
reserve: 1
---

## What it represents

An `NFTokenOffer` is a unilateral proposal on a specific [NFT](/objects/NFTokenPage): to buy (`Owner` is the current owner of the NFT who accepts it, `Amount` is what the offerer pays) or to sell (`Owner` is who offers the NFT, `Amount` is what they're asking). The `lsfSellNFToken` flag distinguishes one direction from the other. It moves nothing by itself: it only exists until someone accepts it, cancels it, or it expires.

It can be restricted to a specific buyer with `Destination`, which turns it into a private offer instead of a public one.

## Lifecycle

- **Creation**: [NFTokenCreateOffer](/tx/NFTokenCreateOffer). In a sell offer, `Account` must own the NFT; in a buy offer, `Amount` must be available. It is linked to `Owner`'s directory (`OwnerNode`) and to the NFT's own offer list (`NFTokenOfferNode`, within the `nftBuys`/`nftSells` directories).
- **Acceptance**: [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), by the counterparty (or by anyone if there is no `Destination`). Transfers the NFT and the `Amount`, applying the issuance's `TransferFee` if the accepting party is not the original issuer. Deletes the accepted offer and any other incompatible buy/sell offer remaining on that same NFT.
- **Cancellation**: [NFTokenCancelOffer](/tx/NFTokenCancelOffer), by any account (does not need to be the creator) listing the IDs to cancel; useful for cleaning up already-expired offers.
- **Expiration**: if `Expiration` has passed, the offer remains on the ledger but can no longer be accepted; it must be explicitly canceled.

## Key fields

- **Owner** — the owner of the NFT (always, both in buy and sell offers; not "who pays the offer's reserve", that is paid by `Account`, the creator of the offer).
- **NFTokenID** — the NFT the offer applies to.
- **Amount** — price, in XRP or in an issued token; it can be zero only in sell offers directed to a specific `Destination` (gift).
- **Destination** — if present, only that account can accept the offer.
- **Expiration** — seconds since the Ripple Epoch; once that moment passes, the offer is no longer acceptable.
- **OwnerNode / NFTokenOfferNode** — directory pages where the offer is linked.

## Flags

- **lsfSellNFToken** — the offer is a sell offer (the creator is offering the NFT). Without this flag, it is a buy offer (the creator is offering `Amount` for the NFT).

## How to query it

`account_objects` with `type: "nft_offer"` returns it for `Owner`. It also appears in the `nft_buy_offers` / `nft_sell_offers` of the corresponding NFT. With `ledger_entry`, `nft_offer` accepts only the object ID directly:

```json
{ "method": "ledger_entry", "params": [{ "nft_offer": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E", "ledger_index": "validated" }] }
```

The ID is `SHA512Half(0x0071 || AccountID_creator || Sequence)` (`keylet::nftokenOffer`, namespace `'q'`), and is found in the metadata of the `NFTokenCreateOffer` or by querying `nft_buy_offers`/`nft_sell_offers`. Typical response:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "NFTokenOffer",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "NFTokenID": "000B0000...",
    "Amount": "25000000",
    "Flags": 1,
    "OwnerNode": "0",
    "NFTokenOfferNode": "0"
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from whoever creates the offer (`Account`), not from `Owner`.

## Related

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer)
- [NFTokenPage](/objects/NFTokenPage), [DynamicNFT](/amendments/DynamicNFT)
