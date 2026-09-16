---
title: fixPreviousTxnID
summary: Adds PreviousTxnID and PreviousTxnLgrSeq to ledger object types that previously lacked them.
xrplDocs: https://xrpl.org/resources/known-amendments#fixprevioustxnid
---

## What changes

Almost all ledger objects store `PreviousTxnID` (the hash of the last transaction that modified them) and `PreviousTxnLgrSeq` (the ledger in which that occurred), which allows reconstructing their history by walking backward from the current state. Before this fix, five object types fell outside that rule: `DIR_NODE`, `AMENDMENTS`, `FEE_SETTINGS`, `NEGATIVE_UNL`, and `AMM`. `STLedgerEntry::isThreadedType` explicitly excluded those types even though they had the `PreviousTxnID` field in their template, so they were never updated or linked into the account's transaction chain.

With fixPreviousTxnID enabled, that exclusion disappears: the five types now update `PreviousTxnID`/`PreviousTxnLgrSeq` just like the rest of the objects every time a transaction modifies them.

## Affected transactions and objects

- [DirectoryNode](/objects/DirectoryNode): now records its last modification.
- Objects of type `AMENDMENTS`, `FEE_SETTINGS`, `NEGATIVE_UNL`, and `AMM`, which until now lacked a trace of the transaction that last touched them.

## Status and context

Without this fix, tools and explorers that reconstruct an object's history by following `PreviousTxnID` would hit a gap: those five object types never pointed to the transaction that had actually changed them. The fix does not alter business rules, it only completes the historical trace so that it is consistent across the entire ledger.
