---
title: NFTokenModify
summary: Changes or clears the URI of an NFT minted with tfMutable; only its issuer or authorized minter can do this.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenmodify
xls: XLS-0046
amendment: DynamicNFT
level: intermediate
---

## What it does

`NFTokenModify` updates the `URI` field of a token that already exists inside an [NFTokenPage](/objects/NFTokenPage). It's the only property of an NFT that can change after minting: the `NFTokenID` (and with it the flags, the issuer, the taxon, and the `TransferFee`) is immutable.

It only works on tokens minted with the `tfMutable` flag (16), and only the issuer encoded in the ID or the account that issuer has set as `NFTokenMinter` can send it. The token's current owner has no part in this and signs nothing; if they're not the issuer, they're specified in `Owner`.

It's introduced by the [DynamicNFT](/amendments/DynamicNFT) amendment, active on testnet.

## When to use it

- Evolving metadata: a game character that levels up, a certificate that renews, a "living" artwork.
- Migrating metadata from one server to another (for example, from https to ipfs) without reminting.
- Removing the URI entirely (by omitting the field) if the metadata is to be resolved off-chain.

## How it works inside

**`NFTokenModify::preflight`**:
- `Owner` equal to `Account` → `temMALFORMED` (if the token is yours, omit `Owner`).
- `URI` present but empty or longer than 256 bytes → `temMALFORMED`.

**`NFTokenModify::preclaim`**:
1. Determines the owner: `Owner` if present, otherwise `Account`. Looks up the token in their pages; if not found → `tecNO_ENTRY`.
2. The ID must carry `kFlagMutable` (`tfMutable`); if not → `tecNO_PERMISSION`.
3. If the issuer encoded in the ID isn't your account, it reads the issuer's `AccountRoot` and requires their `NFTokenMinter` to be your account; if not → `tecNO_PERMISSION`.

**`NFTokenModify::doApply`** calls `nft::changeTokenURI` on the owner's pages with the tx's `URI`. If you omit `URI`, the field is removed from the token. There's no change to reserve or `OwnerCount`.

## Key fields

- **NFTokenID** — the token to modify. It must have the `tfMutable` bit among its 16 flag bits (the first 4-hex-digit group of the ID will end in 1 in the corresponding nibble).
- **Owner** — current owner if it's not you. Required when the token has already been sold or gifted.
- **URI** — new URI in hex (1-256 bytes). If you omit it, the current URI is removed.

## Common errors

- **tecNO_PERMISSION** — the NFT isn't mutable, or you're neither its issuer nor the issuer's `NFTokenMinter`. Tokens minted without `tfMutable` can never be modified.
- **tecNO_ENTRY** — the token isn't in the specified `Owner`'s pages (or you omitted `Owner` and it's no longer yours).
- **temMALFORMED** — `URI` empty or too long, or `Owner` equal to your own account.
- **temDISABLED** — doesn't happen on testnet, `DynamicNFT` is active.

## Example

```json
{
  "TransactionType": "NFTokenModify",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000",
  "URI": "68747470733A2F2F6578616D706C652E636F6D2F76322E6A736F6E"
}
```

The example URI is `https://example.com/v2.json`. If the token is in another account, add `"Owner": "rYYYY_OTHER_ACCOUNT"`.

## Try it on testnet

1. Mint an NFT with [NFTokenMint](/tx/NFTokenMint) using `Flags: 24` (`tfTransferable` + `tfMutable`) and any `URI`.
2. Query `account_nfts` and copy the `NFTokenID`. Note the current `URI`.
3. Load the example with that ID and submit. Check `account_nfts` again: the `URI` has changed and the `NFTokenID` is the same.
4. Submit again without the `URI` field: in `account_nfts` the token no longer has a `URI`.
5. Mint another token with `Flags: 8` (without `tfMutable`) and try to modify it: you'll get `tecNO_PERMISSION`.
6. Gift the mutable token to the other account (sell offer at 0 + acceptance) and modify it from your account by adding `Owner`: it still works because you're the issuer.

## Related

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn)
- [NFTokenPage](/objects/NFTokenPage)
- [DynamicNFT](/amendments/DynamicNFT), [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1)
