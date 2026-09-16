---
title: Credentials
summary: Adds on-chain verifiable credentials (CredentialCreate/Accept/Delete) and their use in DepositPreauth and payments.
xls: XLS-0070
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials
xrplDocs: https://xrpl.org/resources/known-amendments#credentials
introducedIn: 2.3.0
---

## What changes

Introduces the `Credential` object: an assertion signed by an issuer about a subject, identified by `Issuer`, `Subject`, and `CredentialType`. The issuer creates it with `CredentialCreate`; it doesn't count as valid until the subject accepts it with `CredentialAccept` (`lsfAccepted` flag), and either party can delete it with `CredentialDelete`. It can carry an `Expiration` and a `URI` with off-chain evidence.

Deposit authorization is no longer limited to per-account: `DepositPreauth` supports `AuthorizeCredentials`, a list of issuer/type pairs, so that any account presenting that set of credentials can deposit. To that end, `Payment`, `EscrowFinish`, `PaymentChannelClaim`, and `AccountDelete` gain the `CredentialIDs` field; the `credentials::valid` function checks in `preclaim` that the credentials exist, are accepted, have not expired, and belong to the sender. An expired credential that is presented is deleted from the ledger in the same transaction.

## Affected transactions and objects

- New: [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), and [CredentialDelete](/tx/CredentialDelete).
- Modified: [DepositPreauth](/tx/DepositPreauth), [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim), and [AccountDelete](/tx/AccountDelete). Later amendments reuse the mechanism in [PermissionedDomainSet](/tx/PermissionedDomainSet), [VaultWithdraw](/tx/VaultWithdraw), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), and [ConfidentialMPTSend](/tx/ConfidentialMPTSend).
- Objects: new [Credential](/objects/Credential); [DepositPreauth](/objects/DepositPreauth) can store credentials instead of an account.

## Status and context

[DepositAuth](/amendments/DepositAuth) required preauthorizing account by account, which was unworkable for a business with thousands of verified customers. XLS-70 separates "who has verified you" from "who pays you": a KYC provider issues the credential once, and any recipient who trusts that provider accepts it. It is the foundation for [PermissionedDomains](/amendments/PermissionedDomains) and, in turn, for the [PermissionedDEX](/amendments/PermissionedDEX) and the lending protocol.
