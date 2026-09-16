---
title: NFTokenAcceptOffer
summary: Executes an NFT offer: accepts a sale, accepts a purchase, or matches a purchase with a sale as a broker collecting a fee.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenacceptoffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: intermediate
---

## What it does

`NFTokenAcceptOffer` consumes one or two [NFTokenOffer](/objects/NFTokenOffer) objects, moves the payment, and transfers the token from the seller's [NFTokenPage](/objects/NFTokenPage) to the buyer's. It has three modes:

- **Accept a sale** (`NFTokenSellOffer`): you are the buyer; you pay the offer's `Amount` and receive the NFT.
- **Accept a purchase** (`NFTokenBuyOffer`): you own the NFT; you receive the bidder's `Amount` and hand over the token.
- **Broker mode** (both fields): you are neither buyer nor seller. You match a purchase with a sale of the same token, and you can keep the difference (or part of it) via `NFTokenBrokerFee`.

If the NFT has a `TransferFee`, the issuer automatically collects their percentage of the amount, unless they are themselves the buyer or seller.

## When to use it

- Buying an NFT that's for sale.
- Accepting another account's bid on your NFT.
- Running a marketplace: users post offers and your account matches them while collecting a fee.

## How it works inside

**`NFTokenAcceptOffer::preflight`**:
- Neither `NFTokenBuyOffer` nor `NFTokenSellOffer` present → `temMALFORMED`.
- `NFTokenBrokerFee` requires both fields to be present and to be greater than 0; if not → `temMALFORMED`.

**`NFTokenAcceptOffer::preclaim`** loads each offer (`tecOBJECT_NOT_FOUND` if the ID is zero or doesn't exist; `temBAD_OFFER` if its `Amount` is negative). With [fixCleanup3_1_3](/amendments/fixCleanup3_1_3) active (yes on testnet), an expired offer is not rejected here: it's deleted in `doApply` and the tx ends in `tecEXPIRED`. Then:

In broker mode:
- Both offers must refer to the same `NFTokenID` and the same currency → `tecNFTOKEN_BUY_SELL_MISMATCH`.
- Buyer and seller can't be the same account → `tecCANT_ACCEPT_OWN_NFTOKEN_OFFER`.
- The sale price can't exceed the bid → `tecINSUFFICIENT_PAYMENT`.
- If either offer has a `Destination`, it must be your account → `tecNO_PERMISSION`.
- `NFTokenBrokerFee` must be in the same currency, be less than the bid, and the bid minus the fee must cover the sale price → `tecINSUFFICIENT_PAYMENT`.

For the buy offer: it must have `lsfSellNFToken` off (`tecNFTOKEN_OFFER_TYPE_MISMATCH`), not be yours, and if there's no sale offer, the token must be in your pages and the `Destination` (if any) must be you (`tecNO_PERMISSION`). The bidder must have funds for the full `Amount` → `tecINSUFFICIENT_FUNDS`.

For the sell offer: it must have `lsfSellNFToken` (`tecNFTOKEN_OFFER_TYPE_MISMATCH`), not be yours, and the seller must still own the token (`tecNO_PERMISSION`). If there's no buy offer, you must have funds for the `Amount` → `tecINSUFFICIENT_FUNDS`.

With [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) active (yes on testnet), if the payment is in an issued token: buyer, seller, and, if there's a `TransferFee`, the NFT's issuer need authorized trust lines when the currency issuer requires `RequireAuth` (`tecNO_LINE`, `tecNO_AUTH`), and none of them can be in deep freeze (`tecFROZEN`).

**`NFTokenAcceptOffer::doApply`**:
1. Deletes expired offers (→ `tecEXPIRED`) and then the accepted offers, releasing their owners' reserve.
2. In broker mode, first pays `NFTokenBrokerFee` from the buyer to your account, then the buyer's `TransferFee` to the issuer on the remainder, and finally the remaining amount to the seller.
3. In the other modes (`acceptOffer`) it pays the `TransferFee` to the issuer and the rest to the seller. With `Amount` 0 there's no payment.
4. `transferNFToken` removes the token from the seller's pages and inserts it into the buyer's. If the buyer needs a new page and can't cover the reserve → `tecINSUFFICIENT_RESERVE`.

Each payment (`pay`) uses `accountSend` and checks that neither the source nor destination ends up with a negative balance (`tecINSUFFICIENT_FUNDS`).

## Key fields

- **NFTokenSellOffer** — `LedgerIndex` of the sell offer (from `nft_sell_offers`).
- **NFTokenBuyOffer** — `LedgerIndex` of the buy offer (from `nft_buy_offers`).
- **NFTokenBrokerFee** — only in broker mode. It's deducted from the bid before calculating the issuer's `TransferFee`. Amount in the same currency as the offers.

## Common errors

- **tecOBJECT_NOT_FOUND** — the offer ID doesn't exist or has already been consumed or canceled.
- **tecNFTOKEN_OFFER_TYPE_MISMATCH** — you put a sell offer in `NFTokenBuyOffer` or vice versa.
- **tecCANT_ACCEPT_OWN_NFTOKEN_OFFER** — you're trying to accept your own offer.
- **tecINSUFFICIENT_FUNDS** — whoever pays doesn't have enough balance (in purchases, the bidder; in sales, you).
- **tecINSUFFICIENT_PAYMENT** — in broker mode, the bid doesn't cover the price plus the fee.
- **tecNO_PERMISSION** — the offer has a `Destination` that isn't you, or the seller no longer holds the token.
- **tecEXPIRED** — the offer expired; the tx deletes it and charges a fee.
- **tecNFTOKEN_BUY_SELL_MISMATCH** — the two offers don't refer to the same token or the same currency.

## Example

```json
{
  "TransactionType": "NFTokenAcceptOffer",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenSellOffer": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Broker mode:

```json
{
  "TransactionType": "NFTokenAcceptOffer",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenSellOffer": "…",
  "NFTokenBuyOffer": "…",
  "NFTokenBrokerFee": "100000"
}
```

## Try it on testnet

1. From the other demo account, mint an NFT (`Flags: 8`) and create a sell offer for `"1000000"` with [NFTokenCreateOffer](/tx/NFTokenCreateOffer).
2. Query `nft_sell_offers` with the `NFTokenID` and copy the `nft_offer_index`.
3. With your account, load the example, paste the index into `NFTokenSellOffer`, and submit.
4. `account_nfts` for your account now shows the token; `account_info` for the other account has lost 1 XRP minus its fee and recovered the offer's reserve.
5. Mint another NFT with `TransferFee: 5000` (5%), sell it between two accounts that aren't the issuer, and check the `AffectedNodes` to see how the issuer receives the 5%.
6. To see `tecEXPIRED`, create an offer with `Expiration` set a minute out, wait, and accept it: the tx charges a fee, deletes the offer, and transfers nothing.

## Related

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), [NFTokenMint](/tx/NFTokenMint)
- [NFTokenOffer](/objects/NFTokenOffer), [NFTokenPage](/objects/NFTokenPage)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2)
