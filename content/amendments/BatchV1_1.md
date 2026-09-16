---
title: BatchV1_1
summary: Allows grouping several transactions into an atomic or sequential Batch; replaces the original Batch amendment, withdrawn due to a critical bug.
xls: XLS-0056
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0056-batch
xrplDocs: https://xrpl.org/resources/known-amendments#batchv1_1
introducedIn: 3.3.0
---

## What changes

Introduces the `Batch` transaction, which wraps up to eight inner transactions (`RawTransactions`) and applies them within the same ledger according to the mode chosen via flags: `tfAllOrNothing` (all or nothing), `tfOnlyOne` (the first one that succeeds is applied), `tfUntilFailure` (in order until the first failure), or `tfIndependent` (each applied on its own). Inner transactions carry the `tfInnerBatchTxn` flag, are not signed, and do not pay their own `Fee`: the signature and the fee are provided by the outer transaction. If the inner transactions belong to several accounts, each one signs the set in `BatchSigners`.

In `Transactor::preflight`, a transaction with `tfInnerBatchTxn` that arrives outside a Batch is rejected with `temINVALID_FLAG` if the amendment is not active, and with `temINVALID_INNER_BATCH` if it has no `parentBatchId`. Since inner transactions are applied over a closed view, several `tel*` codes that are not valid there are replaced with `tef*` codes (for example `tefNO_DST_PARTIAL` or `tefBAD_PATH_COUNT` in `Payment::preclaim`). The amendment also activates the rule that pseudo-accounts cannot sign transactions (`tefBAD_AUTH`).

## Affected transactions and objects

- New: [Batch](/tx/Batch).
- Modified: any transactor can be accepted as an inner transaction; [Payment](/tx/Payment) and [LoanSet](/tx/LoanSet) have specific rules for that case (an inner LoanSet without `Counterparty` returns `temBAD_SIGNER`).
- Does not create new objects; consumes a `Sequence` for each inner transaction of the account.

## Status and context

Until now there was no way to guarantee that two operations happened together: if a dApp needed to create a trust line and make a payment at the same instant, it depended on two separate submissions. XLS-56 provides atomicity for flows such as swaps between two parties, account creation with initial setup, or minting and selling.

The original `Batch` amendment arrived in rippled 2.5.0 but was disabled in 3.1.1 after a critical bug was discovered (see also `fixBatchInnerSigs`). BatchV1_1 is the corrected reimplementation with a new amendment ID.
