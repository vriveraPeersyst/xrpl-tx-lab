---
title: NFTokenCreateOffer
summary: Publishes a sell offer (if you hold the NFT) or a buy offer (if someone else holds it) in XRP or an issued token.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokencreateoffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: intermediate
---

## What it does

`NFTokenCreateOffer` creates an [NFTokenOffer](/objects/NFTokenOffer) object on the ledger. There are two modes, decided by the `tfSellNFToken` flag:

- **Sell offer** (`Flags: 1`): you own the token and set the price in `Amount`. It can be 0 to give it away.
- **Buy offer** (no flag): another account holds the token, specified in `Owner`, and `Amount` is what you're offering to pay (must be greater than 0).

The offer moves nothing on its own. It's executed when the counterparty (or a broker) accepts it with [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer). Each offer consumes one owner reserve unit (0.2 XRP on testnet).

## When to use it

- Selling or gifting an NFT to a specific account (`Destination`) or to whoever wants to accept it.
- Bidding on someone else's NFT.
- Setting up a brokered operation: seller and buyer create their offers and a third party matches them while collecting `NFTokenBrokerFee`.

## How it works inside

**`NFTokenCreateOffer::preflight`** delegates to `nft::tokenOfferCreatePreflight`, which reads the flags from the `NFTokenID` itself:
- Negative `Amount` → `temBAD_AMOUNT`.
- If the NFT has `tfOnlyXRP` and `Amount` isn't XRP → `temBAD_AMOUNT`. An issued-token amount equal to 0 is also `temBAD_AMOUNT`.
- Buy offer with `Amount` 0 → `temBAD_AMOUNT`.
- `Expiration` equal to 0 → `temBAD_EXPIRATION`.
- `Owner` is required on buy offers and forbidden on sell offers; the opposite in either case → `temMALFORMED`. `Owner` or `Destination` equal to `Account` → `temMALFORMED`.

**`NFTokenCreateOffer::preclaim`**:
- `Expiration` already past → `tecEXPIRED`.
- The token must be in the correct account's pages: yours if selling, `Owner`'s if buying. If not → `tecNO_ENTRY`.
- `nft::tokenOfferCreatePreclaim`:
  - If the price is an issued token and the NFT has `TransferFee` > 0, the NFT's issuer must have a trust line for that currency (`tecNO_LINE`) and not be frozen (`tecFROZEN`). This ensures they can collect their fee.
  - If you're not the NFT's issuer and it doesn't carry `tfTransferable`, only the issuer's `NFTokenMinter` can create the offer; if not → `tefNFTOKEN_IS_NOT_TRANSFERABLE`.
  - On buy offers, you must have available funds in that currency (`tecUNFUNDED_OFFER`).
  - `Destination` must exist (`tecNO_DST`) and not have `lsfDisallowIncomingNFTokenOffer` (`tecNO_PERMISSION`). The same applies to `Owner` (`tecNO_TARGET` if it doesn't exist).
  - With [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) active (yes on testnet), if the price is a token from an issuer with `lsfRequireAuth`, your trust line must be authorized (`tecNO_LINE` / `tecNO_AUTH`).

**`NFTokenCreateOffer::doApply`** (`nft::tokenOfferCreateApply`): checks the reserve for one more object (`tecINSUFFICIENT_RESERVE`), inserts the offer into your directory and into the token's sell or buy directory, and raises your `OwnerCount` by 1. The object stores `Owner`, `NFTokenID`, `Amount`, `Flags` (`lsfSellNFToken` if a sale), `Destination`, and `Expiration`.

## Key fields

- **NFTokenID** — the token. The node extracts the issuer, the flags, and the `TransferFee` from it without looking up anything else.
- **Amount** — price in drops (string) or a `{currency, issuer, value}` object. On sales it can be `"0"`.
- **Owner** — the NFT's current owner; only on buy offers.
- **Destination** — the only account allowed to accept the offer. Useful for private transfers.
- **Expiration** — seconds since the Ripple Epoch (2000-01-01). After that instant no one can accept it, though the object remains on the ledger until someone cancels it.

## Flags

- **tfSellNFToken** (1) — the offer is a sale. Without it, it's a purchase and you need `Owner`.

## Common errors

- **temMALFORMED** — you set `Owner` on a sale, omitted it on a purchase, or `Destination`/`Owner` is your own account.
- **temBAD_AMOUNT** — purchase with amount 0, or an issued token on an NFT with `tfOnlyXRP`.
- **tecNO_ENTRY** — the NFT isn't where you say it is (it's not yours if selling, or `Owner` no longer holds it).
- **tefNFTOKEN_IS_NOT_TRANSFERABLE** — the NFT doesn't have `tfTransferable` and you're neither the issuer nor its minter.
- **tecUNFUNDED_OFFER** — buy offer without sufficient funds.
- **tecNO_PERMISSION** — the `Destination` (or `Owner`) blocks incoming offers with `asfDisallowIncomingNFTokenOffer`.
- **tecINSUFFICIENT_RESERVE** — you don't cover the reserve for the new object.

## Example

```json
{
  "TransactionType": "NFTokenCreateOffer",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000",
  "Flags": 1
}
```

Sell offer for 1 XRP. For a buy offer, remove `Flags` and add `"Owner": "rYYYY_OTHER_ACCOUNT"`.

## Try it on testnet

1. Mint an NFT with [NFTokenMint](/tx/NFTokenMint) (`Flags: 8`) and copy its `NFTokenID` from `account_nfts`.
2. Load the example with that ID and submit. Look at the result's `CreatedNode` of type `NFTokenOffer`; its `LedgerIndex` is the offer's identifier.
3. Query `nft_sell_offers` with `nft_id`: you'll see the offer with `amount`, `flags: 1`, and `owner`.
4. `account_info`: your `OwnerCount` has risen by 1.
5. Try adding `"Destination": "rYYYY_OTHER_ACCOUNT"` and submit again: now only that account can accept it.
6. Cancel anything you won't use with [NFTokenCancelOffer](/tx/NFTokenCancelOffer) to recover the reserve.

## Related

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), [NFTokenMint](/tx/NFTokenMint)
- [NFTokenOffer](/objects/NFTokenOffer), [NFTokenPage](/objects/NFTokenPage)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2), [DisallowIncoming](/amendments/DisallowIncoming)
