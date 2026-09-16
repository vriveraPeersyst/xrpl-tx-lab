---
title: Batch
summary: Original XLS-56 Batch amendment (superseded on Testnet/Devnet by BatchV1_1); groups several transactions into one atomic or sequential Batch.
xls: XLS-0056
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0056-batch
xrplDocs: https://xrpl.org/resources/known-amendments#batch
---

## What changes

Introduces the [Batch](/tx/Batch) transaction type: an outer transaction whose `RawTransactions` array carries up to 8 inner transactions flagged with `tfInnerBatchTxn`, executed under one of four modes (`tfAllOrNothing`, `tfOnlyOne`, `tfUntilFailure`, `tfIndependent`). Inner transactions pay no fee of their own (the outer Batch pays `base × (2 + n)` plus signer fees) and can come from several accounts through `BatchSigners`.

## Affected transactions and objects

- [Batch](/tx/Batch): the new type itself.
- Every submittable transaction can be an inner transaction, except nested Batch and the pseudo-transactions.

## Status and context

This is the first shipped version of the Batch amendment. It is only enabled on preview networks that run older builds (for example WASM Devnet, rippled 3.2.0-b0). On current rippled builds this identifier no longer exists: a critical fix led to its replacement by [BatchV1_1](/amendments/BatchV1_1), which is the amendment Testnet and Devnet vote on. When comparing networks, treat `Batch` (old) and `BatchV1_1` (new) as the same feature at different revisions.
