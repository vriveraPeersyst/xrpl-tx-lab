---
title: NonFungibleTokensV1_1
summary: Consolidates and fixes the original non-fungible token package (NFTokenMint, NFTokenBurn, offers) before its activation on mainnet.
xrplDocs: https://xrpl.org/resources/known-amendments#nonfungibletokensv1_1
introducedIn: 1.11.0
---

## What changes

NonFungibleTokensV1_1 is the revised version of the original NFT amendment (`NonFungibleTokensV1`, which never ended up activating on mainnet). It completely replaced the initial amendment: it bundles a series of fixes to the design of `NFTokenPage` (the directory pages where an account's NFTs are stored, sorted by `NFTokenID`), to the calculation of owner reserves associated with holding NFTs, and to the behavior of burning (`NFTokenBurn`) and offers (`NFTokenCreateOffer`, `NFTokenCancelOffer`, `NFTokenAcceptOffer`), including the handling of brokered sales (intermediated sale, where a third party matches a buy offer with a sell offer while charging a fee).

In practice, it is the amendment that defines the set of transactions and the `NFTokenPage` object as they exist in the protocol today: since it is already integrated as baseline code behavior (the original amendment was withdrawn and replaced), the very operation of minting, transferring, burning and trading NFTs is the implementation of this v1.1, and later improvements (such as `NFTokenMintOffer` or `fixNonFungibleTokensV1_2`) are built on top of it.

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn), [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer) and [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): the complete set of transactions for an NFT's lifecycle.
- Objects: [NFTokenPage](/objects/NFTokenPage), the linked directory structure that stores an account's NFTs, and [NFTokenOffer](/objects/NFTokenOffer), the buy or sell offers.

## Status and context

The first attempt to standardize NFTs in the protocol (`NonFungibleTokensV1`) was found to have design issues before its mainnet deployment and was replaced by this revised version, which is the one that was ultimately activated. It is the foundation on which all subsequent improvements to the XRPL NFT ecosystem rest, including the various numbered fixes (`fixNFTokenRemint`, `fixNFTokenDirV1`, etc.) and amendments such as [NFTokenMintOffer](/amendments/NFTokenMintOffer).
