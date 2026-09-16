---
title: fixNFTokenRemint
summary: Prevents an NFTokenID reused after burning a token and deleting the account from being generated again with the same data.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenremint
---

## What changes

An NFT's `NFTokenID` is computed by combining several fields, including a sequence number derived from the issuing account's `Sequence` at mint time. Before the fix, that sequence number depended directly on the issuing account's `Sequence`, which can be reset: if an account burned all its NFTs and was then deleted with [AccountDelete](/tx/AccountDelete), its `AccountID` could be reused after the waiting period and its `Sequence` could start again from a low value. This allowed re-minting an NFT with exactly the same `NFTokenID` as one already burned, reusing old metadata or taxonomies under an identifier that should be unique forever.

`fixNFTokenRemint` introduces the `FirstNFTokenSequence` field in [AccountRoot](/objects/AccountRoot): the first time an account mints an NFT, it is set to its current `Sequence`. The actual sequence number of each token is now computed as `FirstNFTokenSequence + MintedNFTokens`, a counter (`MintedNFTokens`) that only ever increases and never resets even if the account is deleted and its address reused, preventing two distinct mints from producing the same `NFTokenID`.

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint): computes the `NFTokenID` via `FirstNFTokenSequence` and `MintedNFTokens`.
- [AccountRoot](/objects/AccountRoot): new `FirstNFTokenSequence` and `MintedNFTokens` fields.
- [AccountDelete](/tx/AccountDelete): interaction with sequence reset when deleting and reusing an account.

## Status and context

Closes a "re-mint" path: without this fix, it was possible to recreate an already-burned NFT with an identical `NFTokenID`, which broke the assumption that an `NFTokenID` uniquely and permanently identifies a given token — an assumption marketplaces and indexers take for granted.
