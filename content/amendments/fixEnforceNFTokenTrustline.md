---
title: fixEnforceNFTokenTrustline
summary: Fixes an issue where accepting an NFToken offer with a transfer fee could create an unwanted trustline for the NFT's issuer.
xrplDocs: https://xrpl.org/resources/known-amendments#fixenforcenftokentrustline
---

## What changes

When an [NFToken](/objects/NFToken) has a nonzero `TransferFee` and is paid for in an issued token (not XRP), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) has to send that fee to the NFT's issuer (the "minter"). Before this fix, if the minter did not have a trustline with the issuer of the payment token, rippled would automatically create one in order to credit them the fee, imposing a reserve obligation and a trust line they had not requested. With `fixEnforceNFTokenTrustline` active, the transaction instead fails with `tecNO_LINE` when the NFT does not carry the `tfTransferable`/`kFlagCreateTrustLines` flag that authorizes that automatic creation, the minter is not the issuer of the payment token itself, and a trustline does not already exist between the two.

## Affected transactions and objects

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): adds the trustline check before settling the `TransferFee`.
- [RippleState](/objects/RippleState): is no longer implicitly created for the minter in this flow.

## Status and context

Fixes a bug in the implementation of NFTs with a transfer fee: automatically creating trustlines without the holder's consent contradicts XRPL's general principle that trustlines (and their reserve cost) are explicitly decided by each account. [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) later extends this fix by also adding a check that the payment token's issuer authorizes receiving it.
