---
title: fixBatchInnerSigs
summary: Fix for the original Batch amendment covering how inner-transaction signatures are validated.
xrplDocs: https://xrpl.org/resources/known-amendments
---

## What changes

Tightens signature validation for inner transactions of a [Batch](/tx/Batch): inner transactions must carry an empty `SigningPubKey` and no `TxnSignature`, and the outer Batch (plus `BatchSigners` for other accounts) is the only place where signatures are checked. The fix closes cases where a malformed inner signature could slip through the first Batch implementation.

## Affected transactions and objects

- [Batch](/tx/Batch) and any transaction used as an inner transaction.

## Status and context

Only exists on preview builds that ship the original `Batch` amendment (for example WASM Devnet). Current rippled builds fold this behaviour into [BatchV1_1](/amendments/BatchV1_1), so the identifier is absent from Testnet, Devnet and the `develop` branch.
