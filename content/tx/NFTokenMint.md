---
title: NFTokenMint
summary: Mints a new NFToken in the signing account (or on behalf of an issuer that has authorized it) and, optionally, publishes a sell offer in the same step.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: basic
---

## What it does

`NFTokenMint` creates a non-fungible token and stores it in an [NFTokenPage](/objects/NFTokenPage) of the minter. The NFT isn't an independent ledger object: it's a 32-byte identifier entry (plus the optional `URI`) inside a page that groups up to 32 tokens. That's why the reserve is paid per page, not per token: only when minting forces a new page to open does `OwnerCount` go up.

The generated `NFTokenID` encodes, in this order: the flags (16 bits), the `TransferFee`, the issuing account, the `NFTokenTaxon` encrypted with the sequence, and the issuer's token sequence number. This makes the flags and the resale fee **immutable** from the moment of minting.

If the tx includes `Amount` (and optionally `Destination` and `Expiration`), it creates an [NFTokenOffer](/objects/NFTokenOffer) sell offer in the same transaction, in addition to the token. This is enabled by the [NFTokenMintOffer](/amendments/NFTokenMintOffer) amendment, active on testnet.

## When to use it

- Issuing collectibles, tickets, certificates, or any unique asset.
- Minting on behalf of a third party: the issuer names you `NFTokenMinter` with AccountSet and you put their account in `Issuer`.
- Putting it up for sale in the same step with `Amount` to save one transaction.

## How it works inside

**`NFTokenMint::checkExtraFeatures`**: if you send `Amount`, `Destination`, or `Expiration` and the `NFTokenMintOffer` amendment weren't active, the tx would be rejected with `temDISABLED`. It's active on testnet.

**`NFTokenMint::getFlagsMask`**: the set of admissible flags depends on two amendments. With [fixRemoveNFTokenAutoTrustLine](/amendments/fixRemoveNFTokenAutoTrustLine) active (as on testnet), the `tfTrustLine` flag (4) is forbidden; with [DynamicNFT](/amendments/DynamicNFT) active, `tfMutable` (16) is admitted. A flag outside the mask returns `temINVALID_FLAG`.

**`NFTokenMint::preflight`** (static):
- `TransferFee` greater than 50000 → `temBAD_NFTOKEN_TRANSFER_FEE`. If greater than 0 without `tfTransferable` → `temMALFORMED`.
- `Issuer` equal to `Account` → `temMALFORMED` (if minting for yourself, simply omit it).
- `URI` empty or longer than 256 bytes → `temMALFORMED`.
- If there are offer fields, `Amount` is required and the rules from `nft::tokenOfferCreatePreflight` apply: non-negative amount, `Destination` different from your account, `Expiration` different from 0, and if the NFT carries `tfOnlyXRP` the amount must be XRP.

**`NFTokenMint::preclaim`** (against the ledger):
- With `Issuer`: the issuing account must exist (`tecNO_ISSUER`) and its `NFTokenMinter` field must be exactly your account (`tecNO_PERMISSION`).
- With `Amount`: an `Expiration` already past returns `tecEXPIRED`; `nft::tokenOfferCreatePreclaim` also checks that `Destination` exists and doesn't have `lsfDisallowIncomingNFTokenOffer`, and that, if the price is an issued token with `TransferFee` > 0, the NFT's issuer has a trust line for that currency.

**`NFTokenMint::doApply`**:
1. Takes the `AccountRoot` of the issuer (you or `Issuer`), initializes `FirstNFTokenSequence` if it's the first mint, and increases `MintedNFTokens`. If the counter wraps around → `tecMAX_SEQUENCE_REACHED`.
2. Computes the `NFTokenID` with `createNFTokenID` and inserts the token into your pages (`nft::insertToken`). Note: the token always goes to the signing account, even if `Issuer` is different.
3. If there's an `Amount`, creates the sell offer with `nft::tokenOfferCreateApply` (requires reserve for one more object).
4. If your `OwnerCount` has risen (new page), checks that the balance prior to the fee covers the reserve; if not, `tecINSUFFICIENT_RESERVE`.

## Key fields

- **NFTokenTaxon** — integer that groups tokens from the same collection. It's stored encrypted inside the ID, but `account_nfts` returns it in plain text.
- **TransferFee** — resale fee in units of 0.001% (500 = 0.5%, maximum 50000 = 50%). Only meaningful with `tfTransferable`, and only charged on sales with a nonzero price between accounts other than the issuer.
- **Issuer** — the account on whose behalf you're minting. It must have named you with `NFTokenMinter`. The ID will carry its address, not yours.
- **URI** — up to 256 bytes in hex. Usually points to the metadata (ipfs://, https://).
- **Amount / Destination / Expiration** — if you set them, the tx also creates a sell offer for that token (see [NFTokenCreateOffer](/tx/NFTokenCreateOffer)).

## Flags

- **tfBurnable** (1) — allows the issuer (or their `NFTokenMinter`) to burn the token even if they no longer hold it.
- **tfOnlyXRP** (2) — the token can only be sold for XRP, never for issued tokens.
- **tfTrustLine** (4) — obsolete; with `fixRemoveNFTokenAutoTrustLine` active it returns `temINVALID_FLAG`.
- **tfTransferable** (8) — without it, the token can only be transferred between the issuer and third parties, not between third parties (see `tefNFTOKEN_IS_NOT_TRANSFERABLE` in offers).
- **tfMutable** (16) — the `URI` can be changed afterward with [NFTokenModify](/tx/NFTokenModify). Requires `DynamicNFT`.

## Common errors

- **temBAD_NFTOKEN_TRANSFER_FEE** — `TransferFee` > 50000.
- **temMALFORMED** — `TransferFee` without `tfTransferable`, `Issuer` equal to `Account`, `URI` empty or too long, or offer fields without `Amount`.
- **temINVALID_FLAG** — you used `tfTrustLine` or a bit outside the mask.
- **tecNO_ISSUER** — the `Issuer` account doesn't exist.
- **tecNO_PERMISSION** — `Issuer` exists but hasn't named you `NFTokenMinter`.
- **tecINSUFFICIENT_RESERVE** — the mint opens a new page (or creates the offer) and you don't have enough balance for the reserve.
- **tecEXPIRED** — you included `Amount` with an `Expiration` that has already passed.

## Example

```json
{
  "TransactionType": "NFTokenMint",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "NFTokenTaxon": 0,
  "Flags": 8,
  "TransferFee": 500,
  "URI": "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E"
}
```

`Flags: 8` is `tfTransferable`; add `+1` if you want `tfBurnable` and `+16` if you want to be able to change the URI later.

## Try it on testnet

1. Connect your account and load the example. Leave `TransferFee` at 500 and `Flags` at 8.
2. Sign and submit. The result should be `tesSUCCESS`.
3. Query `account_nfts` with your account: you'll see the token with its `NFTokenID`, `Issuer`, `NFTokenTaxon` in plain text, and the `URI`.
4. Query `account_objects` with `type: "nft_page"`: the [NFTokenPage](/objects/NFTokenPage) that contains it appears. Notice that `OwnerCount` in `account_info` has risen by 1 only if it's your first page.
5. Repeat the submission changing `Flags` to 12 (includes `tfTrustLine`) and check that the node rejects it with `temINVALID_FLAG`.
6. Try the offer variant: add `"Amount": "1000000"` and then query `nft_sell_offers` with the new `NFTokenID`.

## Related

- [NFTokenBurn](/tx/NFTokenBurn), [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenModify](/tx/NFTokenModify)
- [AccountSet](/tx/AccountSet) to set `NFTokenMinter`
- [NFTokenPage](/objects/NFTokenPage), [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [DynamicNFT](/amendments/DynamicNFT), [NFTokenMintOffer](/amendments/NFTokenMintOffer), [fixRemoveNFTokenAutoTrustLine](/amendments/fixRemoveNFTokenAutoTrustLine)
