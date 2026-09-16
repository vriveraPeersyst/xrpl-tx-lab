---
title: SortedDirectories
summary: Deterministically sorts the entries within each page of an owner directory as they are inserted.
xrplDocs: https://xrpl.org/resources/known-amendments#sorteddirectories
---

## What changes

Owner directories (and other ledger directories, such as offer directories) are split into pages as they grow; each page is a list of indexes pointing to other objects that belong to the same owner. Before this amendment, a new entry was simply inserted at the end of the page with free space, with no particular order among entries. SortedDirectories changes the insertion logic so that entries within each page end up deterministically ordered by their key, rather than by arrival order.

The change does not touch the object format or introduce new fields: it is purely a change to the insertion and lookup algorithm for `SLE::pointer` within a `Directory`. It does not affect which objects an account can own, nor the business rules of any transaction; it only determines the exact position within which page each directory entry ends up, which makes directory traversal reproducible across implementations.

## Affected transactions and objects

- Introduces no new transactions: it affects any transaction that adds or removes an entry from an owner directory, such as [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet), [EscrowCreate](/tx/EscrowCreate), [CheckCreate](/tx/CheckCreate), or [NFTokenMint](/tx/NFTokenMint).
- Objects: [DirectoryNode](/objects/DirectoryNode), the page structure where the indexes of the objects an account owns are stored.

## Status and context

Because it no longer depends on insertion order, deterministic ordering means that two nodes reconstructing the same state from the same transactions arrive at exactly the same internal page layout, which simplifies state verification and avoids subtle divergences caused by the specific history of insertions and deletions, rather than by the final content of the directory.
