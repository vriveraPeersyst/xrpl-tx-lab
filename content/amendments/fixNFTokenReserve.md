---
title: fixNFTokenReserve
summary: Makes an account's NFTokenPages count toward its owner reserve and validates the reserve when accepting offers.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenreserve
---

## What changes

Every object owned by an account on the ledger — trust lines, offers, NFT pages — increases its `OwnerCount` and, with it, the XRP reserve the account must keep locked. NFT storage uses pages (`NFTokenPage`) that group several tokens together, and a new page is only created or destroyed when more or less space is needed, not on every individual mint or burn.

The fix ensures that `OwnerCount` is updated correctly when creating or consolidating NFT pages (`increaseOwnerCount`/`decreaseOwnerCount` in `NFTokenHelpers`), so that owning NFTs consistently costs a real reserve, and it also adds a check in [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): after accepting a buy offer, it verifies that the number of objects the buyer ends up owning still satisfies their reserve, preventing the buyer from ending up with an account below the minimum required reserve.

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn): creation and consolidation of [NFTokenPage](/objects/NFTokenPage), with the corresponding `OwnerCount` adjustment.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): reserve check after transferring the NFT to the buyer.
- [AccountRoot](/objects/AccountRoot): `OwnerCount` field.

## Status and context

Without this reserve being properly accounted for, an account could accumulate NFTs without proportionally increasing the XRP the ledger requires to be locked, or accept a buy offer that left it with more objects than its balance can back. The fix aligns the cost of owning NFTs with the rest of the ledger's objects.
