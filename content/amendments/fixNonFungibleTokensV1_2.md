---
title: fixNonFungibleTokensV1_2
summary: Bundles several fixes to the original NFT support, including preventing tokens that could not be burned and errors in offer brokering.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnonfungibletokensv1_2
---

## What changes

After the first version of NFT support on XRPL (NonFungibleTokensV1_1), several issues were found that this fix addresses together: NFTs that became effectively impossible to burn under certain associated-offer conditions, errors in the brokering logic when matching a buy offer and a sell offer through a third party, incorrect handling of the issuer's transfer fees (`TransferRate`) in some sale flows, and the inability of an issuer to trade its own NFTs. It also closes the possibility that, through brokering, the same account could execute an operation with itself to manipulate the state of its offers.

Being a package of fixes to the same subsystem, it does not introduce new fields or objects: it adjusts the internal logic of [NFTokenBurn](/tx/NFTokenBurn), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), and [NFTokenCreateOffer](/tx/NFTokenCreateOffer) so they behave as intended in the edge cases described.

## Affected transactions and objects

- [NFTokenBurn](/tx/NFTokenBurn): ensures an NFT with active offers can be burned correctly.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): fixes brokering (matching a buy and a sell offer through a third party) and the application of `TransferRate`.
- [NFTokenCreateOffer](/tx/NFTokenCreateOffer): allows the issuer to trade its own tokens and prevents self-trading via brokering.
- [NFTokenOffer](/objects/NFTokenOffer): object affected by these fixes.

## Status and context

This is a consolidation fix: it arrived shortly after NFTs launched on mainnet to resolve several behavioral bugs discovered in production all at once, before the marketplace and wallet ecosystem settled on faulty behavior.
