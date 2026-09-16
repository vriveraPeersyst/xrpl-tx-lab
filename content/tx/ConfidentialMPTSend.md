---
title: ConfidentialMPTSend
summary: Sends confidential MPT balance to another account, without revealing the amount on the ledger.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptsend
amendment: ConfidentialTransfer
level: advanced
---

## What it does

`ConfidentialMPTSend` is the confidential equivalent of an MPT `Payment`: it moves value from your spendable confidential balance to the inbox (`ConfidentialBalanceInbox`) of the recipient, encrypted at all times. No one querying the ledger can see how much you've sent —not even the recipient, until they decrypt the amount with their own key— but the sender and, if one exists, the designated auditor can verify it with their keys.

The transaction travels with cryptographic commitments (`AmountCommitment`, `BalanceCommitment`) and versions of the amount encrypted under the key of each relevant party (sender, recipient, MPT issuer, auditor), plus a zero-knowledge proof that certifies everything is consistent without revealing the actual value.

**This transaction type depends on the `ConfidentialTransfer` amendment, which is not currently active on testnet.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- Settling a transaction between two institutions without exposing the amount to third parties querying the ledger.
- Paying payroll or internal transfers within an organization in an MPT, keeping each individual amount confidential.
- Any flow where the total supply must be auditable but individual movements must not be.

## How it works inside

**`ConfidentialMPTSend::checkExtraFeatures`** requires [Credentials](/amendments/Credentials) if you include `CredentialIDs` to access a destination with credential-based `DepositAuth`.

**`ConfidentialMPTSend::preflight`** validates that the ciphertext fields (`SenderEncryptedAmount`, `DestinationEncryptedAmount`, `IssuerEncryptedAmount`, `AuditorEncryptedAmount`, `AmountCommitment`, `BalanceCommitment`, `ZKProof`) have the expected cryptographic format (`temBAD_CIPHERTEXT` if not) and that the overall structure is correct (`temMALFORMED`).

**`ConfidentialMPTSend::calculateBaseFee`** also participates in verifying the cryptographic proof as part of the fee calculation.

**`ConfidentialMPTSend::preclaim`** requires that the destination exist (`terNO_ACCOUNT` if not) and not require a `DestinationTag` you haven't provided (`tecDST_TAG_NEEDED`), that the issuance allow confidential balances and transfers (`lsfMPTCanHoldConfidentialBalance`, `lsfMPTCanTransfer`), and that authorization isn't missing if the issuance requires it (`tecNO_AUTH`). It applies the issuance's `TransferFee` when applicable, just like a direct MPT `Payment`.

**`ConfidentialMPTSend::doApply`** deducts the commitment from your spendable confidential balance and adds the corresponding one to the recipient's inbox (`ConfidentialBalanceInbox`), who will need to merge it with [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) to be able to spend it.

## Key fields

- **Destination** — the account receiving the confidential transfer.
- **DestinationTag** — same as in a `Payment`, identifies the final beneficiary in shared accounts.
- **SenderEncryptedAmount** / **DestinationEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — the same amount encrypted under the key of each party that needs to be able to see it.
- **AmountCommitment** / **BalanceCommitment** — cryptographic commitments of the amount sent and of your resulting balance.
- **ZKProof** — proof that all of the above is consistent, without revealing the actual amount.
- **CredentialIDs** — optional, for accessing a destination with credential-based deposit preauthorization.

## Common errors

- **tecDST_TAG_NEEDED** — the destination requires a `DestinationTag` and you didn't include one.
- **tecNO_AUTH** — the issuance requires explicit authorization and you don't have it.
- **tecNO_PERMISSION** — the issuance doesn't allow confidential balances or transfers.
- **tecNO_TARGET** / **terNO_ACCOUNT** — the destination doesn't exist.
- **temBAD_CIPHERTEXT** — some encrypted field has an invalid format.

## Try it on testnet

The `ConfidentialTransfer` amendment isn't active on testnet today, so any submission of `ConfidentialMPTSend` from the builder will return a `temDISABLED` error. The cryptographic fields in the example are left empty because generating them requires external tools this site doesn't implement.

## Example

```json
{
  "TransactionType": "ConfidentialMPTSend",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "HolderEncryptedAmount": "",
  "DestinationEncryptedAmount": "",
  "IssuerEncryptedAmount": "",
  "AuditorEncryptedAmount": "",
  "ZKProof": ""
}
```

Would attempt to send confidential balance from that issuance to `rYYYY_OTHER_ACCOUNT`; today it fails with `temDISABLED`.

## Related

- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — the recipient consolidates what they received.
- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) and [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — entering and exiting confidential mode.
- [Payment](/tx/Payment) — the plaintext equivalent for MPT.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [Credentials](/amendments/Credentials).
