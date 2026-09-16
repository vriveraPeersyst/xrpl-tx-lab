---
title: DynamicNFT
summary: Allows marking an NFToken as mutable at the moment it is minted and later updating its URI with a new transaction.
xls: XLS-0046
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0046-dynamic-NFT
xrplDocs: https://xrpl.org/resources/known-amendments#dynamicnft
---

## What changes

Before this amendment, the `URI` of an NFToken was fixed forever at the moment it was minted. DynamicNFT adds the `tfMutable` flag to [NFTokenMint](/tx/NFTokenMint): when you enable it, `NFTokenMint::getFlagsMask` extends the allowed flag mask (`tfNFTokenMintMask` instead of the mask without mutable) and the token is born with `nft::kFlagMutable` (`0x0010`) set in the NFT identifier.

Only tokens minted with that flag can later be updated with the new [NFTokenModify](/tx/NFTokenModify) transaction, which this amendment also introduces. In `preclaim`, `NFTokenModify` checks that the `kFlagMutable` flag is present in the `NFTokenID` (otherwise it fails with `tecNO_PERMISSION`) and that the signer is the issuer or the `NFTokenMinter` authorized by the issuer; the current owner of the NFT does not necessarily need to be the one modifying it. The transaction replaces the `URI` field stored in the corresponding `NFTokenPage` without touching any other data of the token.

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint): new `tfMutable` flag in the allowed flag mask.
- New: [NFTokenModify](/tx/NFTokenModify), delegable, which updates the `URI`.
- Object [NFToken](/objects/NFToken) (inside [NFTokenPage](/objects/NFTokenPage)): the identifier encodes the mutability flag, and the `URI` stops being immutable for tokens that carry it.

## Status and context

NFTs on the XRPL often represent assets whose metadata changes over time: the state of an evolving collectible, a certificate that gets updated, a ticket that goes from "valid" to "used". Without this amendment, any metadata change required burning the NFT and minting a new one, breaking its identity and history. DynamicNFT solves this explicitly and optionally: mutability is declared at mint time, so a buyer always knows whether the token they are acquiring can change its content later.
