---
title: NFTokenCancelOffer
summary: Removes one or more NFT offers (up to 500) that are yours, name you as destination, or have expired.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokencanceloffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: basic
---

## What it does

`NFTokenCancelOffer` deletes [NFTokenOffer](/objects/NFTokenOffer) objects from the ledger and returns the reserve they occupied to their creator. It's a cleanup transaction: it accepts a list of identifiers in `NFTokenOffers` and deletes all of them that exist, as long as you have rights over each one.

You have the right to cancel an offer if any of these conditions hold: you're its `Owner` (you created it), you're its `Destination`, or its `Expiration` has already passed. This last case lets anyone remove expired offers that are occupying someone else's reserve.

## When to use it

- Withdrawing a sell or buy offer you're no longer interested in.
- As the recipient of a private offer, rejecting it explicitly.
- Cleaning up expired offers left by third parties (for example, after a burn that had more than 500 offers, leaving the remainder orphaned).

## How it works inside

**`NFTokenCancelOffer::preflight`**:
- `NFTokenOffers` empty or with more than 500 entries (`kMaxTokenOfferCancelCount`) → `temMALFORMED`.
- With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) active (yes on testnet), any identifier of all zeros → `temMALFORMED`.
- Duplicate identifiers in the list → `temMALFORMED` (the list is sorted and checked for equal neighbors).

**`NFTokenCancelOffer::preclaim`** walks the list and returns `tecNO_PERMISSION` as soon as it finds an entry you can't cancel. For each ID:
- If no object exists with that ID, it's ignored (not an error).
- If it exists but isn't of type `NFTokenOffer` → `tecNO_PERMISSION`.
- If its `Expiration` has already passed → allowed.
- If `Owner` is your account → allowed.
- If `Destination` is your account → allowed.
- In any other case → `tecNO_PERMISSION`.

**`NFTokenCancelOffer::doApply`**: for each ID, if the offer exists it's deleted with `nft::deleteTokenOffer`, which removes it from its owner's directory and from the token's buy/sell directory and decrements the owner's `OwnerCount`. A deletion failure returns `tefBAD_LEDGER`.

It neither consumes nor requires reserve. Since nonexistent IDs are ignored, the transaction succeeds even if part of the list has already been canceled or consumed by an acceptance.

## Key fields

- **NFTokenOffers** — array of 64-hex-character hashes. These are the `LedgerIndex` values of the `NFTokenOffer` objects, not the `NFTokenID` values. You get them from `nft_sell_offers`, `nft_buy_offers`, or the `CreatedNode` of the transaction that created the offer. Maximum 500, no duplicates or zeros.

## Common errors

- **temMALFORMED** — empty list, more than 500 entries, duplicates, or a zero hash (the default example carries zeros; replace it).
- **tecNO_PERMISSION** — some entry points to an offer that isn't yours, doesn't name you as destination, and hasn't expired, or to an object that isn't an NFT offer.

## Example

```json
{
  "TransactionType": "NFTokenCancelOffer",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenOffers": [
    "0000000000000000000000000000000000000000000000000000000000000000"
  ]
}
```

Replace the hash with the real `nft_offer_index`. You can list several.

## Try it on testnet

1. Create a sell offer with [NFTokenCreateOffer](/tx/NFTokenCreateOffer) on an NFT of yours.
2. Query `nft_sell_offers` with the `NFTokenID` and copy the `nft_offer_index`.
3. Load the example, paste that index into `NFTokenOffers`, and submit.
4. Check `nft_sell_offers` again: it returns `objectNotFound`. In `account_info`, `OwnerCount` has dropped by 1.
5. Resubmit the same transaction: it still returns `tesSUCCESS` because nonexistent IDs are ignored.
6. To see `tecNO_PERMISSION`, have another account create an offer without a `Destination` and try to cancel it yourself.

## Related

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenBurn](/tx/NFTokenBurn)
- [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
