---
title: fixDirectoryLimit
summary: Removes the artificial limit of 262144 pages in ledger directories.
xrplDocs: https://xrpl.org/resources/known-amendments#fixdirectorylimit
---

## What changes

Each [DirectoryNode](/objects/DirectoryNode) (owner directory or book directory) links its pages via `sfIndexNext`/`sfIndexPrevious`, using a 64-bit page counter. Before this fix, `dirAdd` additionally checked an independent constant, `kDirNodeMaxPages` (262144), and refused to create a new page above that number even though the data type could represent many more. With `fixDirectoryLimit` active, that additional check disappears: the only real limit becomes the overflow of the page counter itself (`page == 0` after incrementing), far above the previous limit.

## Affected transactions and objects

- [DirectoryNode](/objects/DirectoryNode): removes the artificial cap on chained pages.
- Indirectly, any transaction that adds entries to an owner directory or order book, such as [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet), or [NFTokenMint](/tx/NFTokenMint), which previously could fail with `tecDIR_FULL` upon reaching the page limit of an account or a book with a very large number of entries.

## Status and context

The 262144-page limit (with 32 entries per page, about 8.4 million objects per directory) was a conservative value set years ago that in practice should never be reached by a single account, but could become a problem for order books or owner directories with a very high volume of entries, causing avoidable `tecDIR_FULL` failures. The fix removes that obsolete defensive cap and leaves the page counter's own data type as the limit.
