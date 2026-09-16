---
title: DynamicMPT
summary: Makes an MPT's metadata, transfer fee and capability flags mutable by default, except for those the issuer declares immutable.
xls: XLS-0094
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0094-dynamic-MPT
xrplDocs: https://xrpl.org/resources/known-amendments#dynamicmpt
introducedIn: 3.3.0
---

## What changes

With [MPTokensV1](/amendments/MPTokensV1), an MPT issuance was fixed at the moment it was created: `MPTokenMetadata`, `TransferFee` and the capability flags (`CanLock`, `RequireAuth`, `CanEscrow`, `CanTrade`, `CanTransfer`, `CanClawback`) could not be changed. DynamicMPT reverses that default: all of that becomes modifiable via `MPTokenIssuanceSet`, except for what the issuer explicitly locks in the new `ImmutableFlags` field when creating the issuance.

`MPTokenIssuanceSet` gains the flags `tfMPTSetCanLock`/`tfMPTClearCanLock` and equivalents for each capability, plus the ability to submit new `MPTokenMetadata` and `TransferFee` values. `preflight` rules: a transaction cannot mix mutation with lock/unlock, it cannot carry `Holder` when mutating the issuance, and without the amendment any mutation returns `temDISABLED`. Attempting to change a field declared immutable fails with `tecNO_PERMISSION`. Without the amendment, `ImmutableFlags` in `MPTokenIssuanceCreate` is an unknown field and the transaction does not pass.

## Affected transactions and objects

- Modified: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) (`ImmutableFlags` field) and [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) (mutation flags and editable fields).
- Objects: [MPTokenIssuance](/objects/MPTokenIssuance).

## Status and context

Institutional issuers asked to be able to correct metadata (for example, a link to legal documentation) or adjust fees without destroying and reissuing the token, which was impossible once it was already circulating. At the same time, holders need assurance that certain properties will not change. XLS-94 combines both: mutable by default, with an irreversible per-property commitment. It coexists with [ConfidentialTransfer](/amendments/ConfidentialTransfer), whose `CanHoldConfidentialBalance` flag can likewise be set as immutable.
