---
title: ConfidentialMPTConvert
summary: Converts an MPT's public balance into confidential balance, encrypted with EC-ElGamal.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptconvert
amendment: ConfidentialTransfer
level: advanced
---

## What it does

`ConfidentialMPTConvert` moves an amount from your public balance of a Multi-Purpose Token into a confidential balance: a balance encrypted under the EC-ElGamal key of the issuer (and, if one exists, the auditor), so that neither the amount nor your position is visible on the ledger, while the total supply remains verifiable. It's the entry point into the confidential MPT system introduced by the `ConfidentialTransfer` amendment.

The converted amount doesn't land directly in your "spendable" balance: it first enters your inbox (`ConfidentialBalanceInbox`) encrypted, and you have to consolidate it with [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) before you can send it with [ConfidentialMPTSend](/tx/ConfidentialMPTSend). The transaction requires a zero-knowledge proof (`ZKProof`) demonstrating that the encrypted amount really corresponds to the declared `MPTAmount`, without revealing that amount to the validators.

**This transaction type depends on the `ConfidentialTransfer` amendment, which is not currently active on testnet.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- An institution moves part of its balance of an MPT into confidential mode before dealing with counterparties that shouldn't see the amounts.
- A holder wants to hide their position from other participants, while keeping the total in circulation auditable for the designated regulator.

## How it works inside

**`ConfidentialMPTConvert::preflight`** validates form: `MPTAmount` can't be zero or negative (`temBAD_AMOUNT`), and the other cryptographic fields (`ZKProof`, keys) must have the expected format (`temMALFORMED` if not).

**`ConfidentialMPTConvert::preclaim`** requires the issuance to allow confidential balance (`lsfMPTCanHoldConfidentialBalance`, `tecNO_PERMISSION` if not), that you have enough public funds (`tecINSUFFICIENT_FUNDS`), and verifies the zero-knowledge proof against your current encrypted balance (`tecBAD_PROOF` if it doesn't check out) and that the operation isn't a replay of one already processed (`tecDUPLICATE`).

**`ConfidentialMPTConvert::doApply`** subtracts `MPTAmount` from your public balance, adds the encrypted amount to your `ConfidentialBalanceInbox`, and updates the issuance's total encrypted supply in circulation (`ConfidentialOutstandingAmount`).

## Key fields

- **MPTAmount** — the public amount (in clear text, visible in the transaction) you want to convert to confidential.
- **HolderEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — the same amount, encrypted under each of the relevant keys, so each party can decrypt it with their private key.
- **BlindingFactor** — the blinding factor used in the cryptographic commitment of the amount.
- **ZKProof** — proof that the encrypted amount matches `MPTAmount` without revealing it.

## Common errors

- **tecNO_PERMISSION** — the issuance doesn't have `lsfMPTCanHoldConfidentialBalance` enabled.
- **tecINSUFFICIENT_FUNDS** — your public balance doesn't cover the `MPTAmount` to convert.
- **tecBAD_PROOF** — the zero-knowledge proof isn't valid for the submitted values.
- **tecOBJECT_NOT_FOUND** — the issuance or your `MPToken` doesn't exist.
- **temBAD_AMOUNT** — `MPTAmount` is zero or invalid.

## Try it on testnet

The `ConfidentialTransfer` amendment isn't active on testnet today, so any `ConfidentialMPTConvert` submission from the builder will return a `temDISABLED` error. You can verify this with the example below (the encryption fields are left empty because generating them requires external cryptographic tools this site doesn't implement); once the network activates the amendment, you'll need to compute those values outside this builder.

## Example

```json
{
  "TransactionType": "ConfidentialMPTConvert",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100",
  "HolderElGamalPublicKey": "",
  "IssuerElGamalPublicKey": ""
}
```

This would attempt to convert 100 units of the indicated MPT into confidential balance; the key/encryption fields must be computed with external tools and it will fail today with `temDISABLED`.

## Related

- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — consolidates the amount received in your inbox.
- [ConfidentialMPTSend](/tx/ConfidentialMPTSend) — sends confidential balance to another account.
- [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — reverts to public balance.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [MPTokensV1](/amendments/MPTokensV1).
