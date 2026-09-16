---
title: fixRemoveNFTokenAutoTrustLine
summary: Removes the ability to mint NFTokens with the tfTrustLine flag, which created trustlines to the issuer without their permission.
xrplDocs: https://xrpl.org/resources/known-amendments#fixremovenftokenautotrustline
---

## What changes

Before this fix, [NFTokenMint](/tx/NFTokenMint) accepted the `tfTrustLine` flag. An NFToken minted with that flag, when transferred between accounts using a payment token other than XRP, automatically created a trustline to the NFToken's issuer on the receiving account, without that account having requested it or the issuer having authorized it.

That allowed an attack: two accounts could repeatedly trade the same NFToken back and forth to keep generating arbitrary trustlines against an issuer, increasing its reserve without limit and without its consent. With fixRemoveNFTokenAutoTrustLine enabled, `NFTokenMint` rejects the `tfTrustLine` flag: it is removed from the valid flags mask (`tfNFTokenMintMask`/`tfNFTokenMintMaskWithoutMutable`, depending on whether [DynamicNFT](/amendments/DynamicNFT) is enabled), so any attempt to mint with that bit fails in `preflight`.

## Affected transactions and objects

- [NFTokenMint](/tx/NFTokenMint): `tfTrustLine` is no longer a valid flag.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): can no longer trigger the automatic creation of a trustline to the issuer as a side effect of accepting an offer in a token other than XRP.

## Status and context

Fixes an abuse vector against NFT issuers: forcing the creation of unsolicited trustlines inflated their reserve indefinitely at no real cost to the attacker. The fix closes the avenue by removing the flag that made it possible, rather than trying to limit the abuse after the fact.
