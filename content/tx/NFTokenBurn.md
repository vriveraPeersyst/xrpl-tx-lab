---
title: NFTokenBurn
summary: Permanently destroys an NFToken and removes up to 500 offers associated with it.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenburn
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: basic
---

## What it does

`NFTokenBurn` removes a token from the [NFTokenPage](/objects/NFTokenPage) that contains it. If the page ends up empty, it's deleted and the owner's `OwnerCount` drops. It also increments `BurnedNFTokens` on the issuer's `AccountRoot` and clears the buy and sell offers that pointed at that token.

Normally the token's owner sends it. But if the NFT was minted with `tfBurnable`, the issuer (or the account the issuer has set as `NFTokenMinter`) can also burn it even if the token is held by another account: in that case the current owner is specified in `Owner`.

## When to use it

- Retiring a collectible or ticket that's already been redeemed.
- As an issuer with `tfBurnable`, revoking a certificate or license that's no longer valid.
- Freeing reserve: if it was the last token in a page, you recover 0.2 XRP of owner reserve.

## How it works inside

**`NFTokenBurn::preflight`** performs no checks of its own; only the generic ones apply (fee, signature, universal flags).

**`NFTokenBurn::preclaim`**:
1. Determines the owner: `Owner` if present, otherwise `Account`.
2. Looks up the token in that owner's pages (`nft::findToken`). If not found → `tecNO_ENTRY`.
3. If `Owner` differs from `Account`:
   - the token must carry the `kFlagBurnable` flag in its ID; if not → `tecNO_PERMISSION`;
   - `Account` must be the issuer encoded in the ID, or the account that issuer has set as `NFTokenMinter`; if not → `tecNO_PERMISSION`.

**`NFTokenBurn::doApply`**:
1. `nft::removeToken` removes the token from the owner's page (merging or deleting pages as needed).
2. Adds 1 to `BurnedNFTokens` on the issuer's account, if that account exists.
3. Deletes sell offers for the token (`keylet::nftSells`) up to a maximum of 500 entries (`kMaxDeletableTokenOfferEntries`); if there's room left, it continues with buy offers (`keylet::nftBuys`) up to that same limit. Offers that don't fit within the limit become orphaned and can be canceled afterward with [NFTokenCancelOffer](/tx/NFTokenCancelOffer).

There's no reserve check: burning only frees space.

## Key fields

- **NFTokenID** — the token's 64-character hex identifier. Remember it encodes the issuer and the flags; the node reads them directly from the ID without querying anything else.
- **Owner** — only when burning a token that isn't yours. Must be the account that currently holds it.

## Common errors

- **tecNO_ENTRY** — the token isn't in the specified owner's pages. Usually a mistyped `NFTokenID` or an outdated `Owner` (the token changed hands).
- **tecNO_PERMISSION** — you're trying to burn someone else's token without `tfBurnable`, or it has `tfBurnable` but you're neither its issuer nor the issuer's `NFTokenMinter`.
- **temDISABLED** — doesn't happen on testnet: the `NonFungibleTokensV1_1` amendment is active.

## Example

```json
{
  "TransactionType": "NFTokenBurn",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace `NFTokenID` with a real one from `account_nfts`. To burn someone else's token with `tfBurnable`, add `"Owner": "rYYYY_OTHER_ACCOUNT"`.

## Try it on testnet

1. Mint a token with [NFTokenMint](/tx/NFTokenMint) using `Flags: 9` (`tfBurnable` + `tfTransferable`).
2. Query `account_nfts` and copy the `NFTokenID`.
3. Optional: create a sell offer with [NFTokenCreateOffer](/tx/NFTokenCreateOffer) to see how burning removes it.
4. Load the example with that `NFTokenID`, sign, and submit.
5. Check `account_nfts` again: the token is gone. In `account_info` you'll see `BurnedNFTokens` incremented on the issuer, and if you only had one page, `OwnerCount` has dropped by 1.
6. If you created the offer, `nft_sell_offers` with that ID now returns an `objectNotFound` error.

## Related

- [NFTokenMint](/tx/NFTokenMint), [NFTokenCancelOffer](/tx/NFTokenCancelOffer)
- [NFTokenPage](/objects/NFTokenPage), [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1)
