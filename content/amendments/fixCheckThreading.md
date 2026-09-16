---
title: fixCheckThreading
summary: Makes check transactions update the receiving account's metadata, so that they appear in its history.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcheckthreading
introducedIn: 1.5.0
---

## What changes

Each [AccountRoot](/objects/AccountRoot) stores `PreviousTxnID` and `PreviousTxnLgrSeq`, which point to the last transaction that modified the account. That chain ("threading") is what allows `account_tx` to walk an account's history backwards. Before this fix, [CheckCreate](/tx/CheckCreate) linked the new [Check](/objects/Check) into the recipient's directory but did not update the `PreviousTxnID` of its `AccountRoot`. Result: the recipient did not see the check issued to them in their history, even though it did appear in `account_objects`.

With fixCheckThreading active, `CheckCreate` also marks the destination account as modified (updates its threading), and so do [CheckCash](/tx/CheckCash) and [CheckCancel](/tx/CheckCancel) with the counterparty when applicable. The visible effect is that both accounts have the transaction in `account_tx`.

## Affected transactions and objects

- [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel).
- [AccountRoot](/objects/AccountRoot) of the recipient: `PreviousTxnID` / `PreviousTxnLgrSeq` fields.
- [Check](/objects/Check): no format changes.

## Status and context

It was introduced in rippled 1.5.0 and is retired in the code (`XRPL_RETIRE_FIX(CheckThreading)`). Checks had arrived with the Checks amendment in 1.2.0, and this was the first necessary adjustment in production. The same family of issues (objects that "touch" an account without leaving a trace in its history) was fixed for payment channels with [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir).
