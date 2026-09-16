---
title: ConfidentialTransfer
summary: Confidential MPT transfers with EC-ElGamal encryption and zero-knowledge proofs; hidden balances and amounts, auditable supply.
xls: XLS-0096
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0096-confidential-mpt
xrplDocs: https://xrpl.org/resources/known-amendments#confidentialtransfer
introducedIn: 3.3.0
---

## What changes

Allows a Multi-Purpose Token to have, in addition to the public balance, an encrypted balance per holder. The issuer enables the capability at issuance with the `tfMPTCanHoldConfidentialBalance` flag and publishes an EC-ElGamal key (`IssuerElGamalKey`); it can optionally designate an auditor with their own key (`AuditorElGamalKey`). Both are managed in `MPTokenIssuanceCreate` and `MPTokenIssuanceSet`, and without the amendment they are rejected with `temDISABLED`.

Holders convert public balance into confidential balance (`ConfidentialMPTConvert`), send it encrypted (`ConfidentialMPTSend`), consolidate what they receive in their inbox (`ConfidentialMPTMergeInbox`), and convert it back to clear balance (`ConfidentialMPTConvertBack`). Each operation attaches zero-knowledge proofs that validators verify without knowing the amounts. The issuer retains the ability to claw back with `ConfidentialMPTClawback`.

The issuance tracks the total encrypted amount in circulation (`ConfidentialOutstandingAmount`); while it is not zero, `MPTokenAuthorize` does not allow the issuer to remove certain relationships.

## Affected transactions and objects

- New: [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert), [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox), [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack), [ConfidentialMPTSend](/tx/ConfidentialMPTSend), and [ConfidentialMPTClawback](/tx/ConfidentialMPTClawback).
- Modified: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), and [MPTokenAuthorize](/tx/MPTokenAuthorize).
- Objects: [MPTokenIssuance](/objects/MPTokenIssuance) and [MPToken](/objects/MPToken) gain encrypted fields.

## Status and context

Institutions tokenizing assets cannot publicly expose their clients' balances or the size of each operation, but they do need regulators and auditors to be able to verify total supply and, where applicable, decrypt specific operations. XLS-96 provides that "audit-gated" privacy on top of MPT, without touching trust-line tokens. It builds on [MPTokensV1](/amendments/MPTokensV1) and coexists with [DynamicMPT](/amendments/DynamicMPT) (the confidential flag can be declared immutable in `ImmutableFlags`). Key rotation is proposed separately in XLS-99 (`ConfidentialMPTKeyRotation`, not yet supported).
