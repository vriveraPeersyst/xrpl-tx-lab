---
title: fixBatchV1_2
summary: Reserved follow-up fix for the Batch feature; the amendment ID is registered on Testnet and Devnet, but no implementing code has landed in rippled yet.
xrplDocs: https://xrpl.org/resources/known-amendments#fixbatchv1_2
---

## What changes

`fixBatchV1_2` is the next fix amendment planned for [BatchV1_1](/amendments/BatchV1_1). Its ID already appears, disabled, in the amendment table of Testnet and Devnet, but no implementing code has merged into rippled: the `develop` branch (`features.macro`) still only defines `BatchV1_1`, with no trace of `fixBatchV1_2`. Because of that, the exact `preflight`/`preclaim`/`doApply` changes can't be documented from the source yet.

Two open pull requests in the rippled repository touch Batch and could end up under this amendment ID: one adds support for queuing `Batch` transactions in the TxQ, and another allows lending-protocol transactions (`LoanSet`) as inner transactions. Neither has merged, so treat this as unconfirmed scope, not shipped behavior.

## Affected transactions and objects

- [Batch](/tx/Batch): the transaction this fix targets.
- Possibly [LoanSet](/tx/LoanSet) as an inner transaction, if the open lending-in-batch proposal lands under this amendment ID.

## Status and context

`fixBatchV1_2` is in active development upstream (open pull requests, no merges yet). It isn't active on any network this site tracks: it shows up disabled on Testnet and Devnet, and is absent from Mainnet and WASM Devnet. Revisit this page once code lands in rippled's `develop` branch for a concrete description of the fix.
