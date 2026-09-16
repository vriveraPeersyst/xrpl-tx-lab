---
title: fixNFTokenPageLinks
summary: Fixes the linking between NFTokenPage pages when the last NFT on the directory's terminal page is deleted.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenpagelinks
---

## What changes

An account's [NFToken](/objects/NFTokenPage)s are stored in a linked list of pages ([NFTokenPage](/objects/NFTokenPage)), joined by `PreviousPageMin` and `NextPageMin`. The last page in that list always has the maximum possible key (the full `nft::kPageMask` range, all ones); it is a structural anchor of the directory, not just any page.

Before the fix, when the last NFT on that terminal page was burned while it also had a non-empty previous page, the code simply unlinked and deleted the now-empty page, leaving the previous page as the new "last" one. Since that previous page did not have the maximum key, this broke the invariant that the directory's terminal page always occupies that position, which could leave the NFT directory incorrectly linked.

With `fixNFTokenPageLinks` active, in that specific case (empty page, with a `prev`, and key equal to `kPageMask`) the code copies the contents of `prev` into the current page, adjusts the `PreviousPageMin` link of the new previous page, and deletes `prev` instead, always keeping the maximum-key page as the directory's terminal one.

## Affected transactions and objects

- [NFTokenBurn](/tx/NFTokenBurn) and [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): trigger page consolidation when an `NFTokenPage` becomes empty.
- [NFTokenPage](/objects/NFTokenPage): fixes the maintenance of its `PreviousPageMin`/`NextPageMin` links.

## Status and context

This is a structural fix to NFT directory maintenance: it prevents a sequence of token burns from leaving the page linking in a state inconsistent with the invariant that the terminal page always has the maximum key, an invariant also checked by `NFTInvariant`.
