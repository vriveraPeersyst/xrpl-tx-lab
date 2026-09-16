---
title: NFTokenMintOffer
summary: Allows including a sell offer directly in the NFTokenMint transaction, without needing a separate NFTokenCreateOffer.
xrplDocs: https://xrpl.org/resources/known-amendments#nftokenmintoffer
introducedIn: 2.3.0
---

## What changes

Before this amendment, minting an NFT and putting it up for sale required two separate transactions: `NFTokenMint` to create the token and, afterward, `NFTokenCreateOffer` to publish a sell offer on it. With NFTokenMintOffer active, `NFTokenMint` accepts the optional fields `Amount`, `Destination` and `Expiration` in the same transaction. If `Amount` is present, the transactor automatically creates a sell offer (`NFTokenOffer`) for the newly minted NFT, with the specified price, the restricted buyer (`Destination`, optional), and the expiration (`Expiration`, optional).

This is controlled in the code by the `hasOfferFields` function, which detects whether the transaction carries `Amount`, `Destination` or `Expiration`: without the amendment active, any of those fields in an `NFTokenMint` causes the transaction to be rejected in `preflight` (`checkExtraFeatures` returns `false`). With the amendment, those fields are processed just like in a normal `NFTokenCreateOffer`, including the same price validation and issuance type rules (XRP or fungible token).

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint): supports the new optional fields `Amount`, `Destination` and `Expiration`.
- Object created indirectly: [NFTokenOffer](/objects/NFTokenOffer), the sell offer automatically generated at mint time if `Amount` is specified.
- Related: [NFTokenCreateOffer](/tx/NFTokenCreateOffer), whose function still exists for creating offers on already-minted NFTs or for adding further offers later.

## Status and context

The typical "mint and list for sale" flow was the most common use case for NFT creators, and doing it in two transactions doubled the fee cost and the complexity of the client application (it had to wait for the mint to be confirmed before it could reference the `NFTokenID` in the offer). NFTokenMintOffer collapses both steps into a single atomic transaction, simplifying the minting-with-immediate-sale experience without changing the business rules of offers themselves.
