---
title: ConfidentialMPTConvertBack
summary: Converts an MPT's confidential balance back into public balance, visible on the ledger.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptconvertback
amendment: ConfidentialTransfer
level: advanced
---

## What it does

`ConfidentialMPTConvertBack` is the reverse operation of [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert): it takes an amount from your spendable confidential balance (`ConfidentialBalanceSpending`) and reveals it as public balance in your `MPToken`, so it stops being encrypted. It's the step you need when you want to, for example, withdraw funds to an exchange or a counterparty that doesn't operate with confidential balances.

As with the rest of confidential operations, the transaction travels with a cryptographic commitment (`BalanceCommitment`) and a zero-knowledge proof (`ZKProof`) that prove the decrypted amount really corresponds to your previous encrypted balance, without validators needing to see that balance at any point in the process.

**This transaction type depends on the `ConfidentialTransfer` amendment, which is not currently active on testnet.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- Withdrawing funds from your confidential position into a public balance you can send to any holder, even one that doesn't support confidential balances.
- Closing a confidential position ahead of an event that requires transparency (a liquidation, a one-off audit).
- Combining it with [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) to move funds in and out of confidential mode as your need for privacy changes.

## How it works inside

**`ConfidentialMPTConvertBack::preflight`** validates form: `MPTAmount` other than zero (`temBAD_AMOUNT`) and the cryptographic fields (`ZKProof`, `BalanceCommitment`) with the expected format (`temMALFORMED` if not).

**`ConfidentialMPTConvertBack::calculateBaseFee`** verifies the zero-knowledge proof as part of computing the transaction's fee (`tecBAD_PROOF` if it isn't valid) — a pattern different from most transactors, where that verification usually lives in `preclaim`.

**`ConfidentialMPTConvertBack::preclaim`** requires the issuance to allow confidential balance (`lsfMPTCanHoldConfidentialBalance`), that you have enough spendable confidential balance (`tecINSUFFICIENT_FUNDS`), and that your `MPToken` and the issuance exist (`tecOBJECT_NOT_FOUND`).

**`ConfidentialMPTConvertBack::doApply`** subtracts the corresponding commitment from your `ConfidentialBalanceSpending`, adds `MPTAmount` to your public balance, and reduces the issuance's total encrypted supply in circulation (`ConfidentialOutstandingAmount`).

## Key fields

- **MPTAmount** — the amount, in clear text, that leaves the confidential balance and appears as public balance.
- **HolderEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — encrypted versions of the amount under each relevant key, used to verify consistency with your previous encrypted balance.
- **BalanceCommitment** — cryptographic commitment of your resulting confidential balance after the operation.
- **BlindingFactor** — blinding factor of the commitment.
- **ZKProof** — proof that the revealed amount is consistent with your encrypted balance.

## Common errors

- **tecBAD_PROOF** — the zero-knowledge proof isn't valid.
- **tecINSUFFICIENT_FUNDS** — your spendable confidential balance doesn't cover the requested `MPTAmount`.
- **tecNO_PERMISSION** — the issuance doesn't allow confidential balance.
- **tecOBJECT_NOT_FOUND** — the issuance or your `MPToken` doesn't exist.
- **temBAD_AMOUNT** — `MPTAmount` is zero or invalid.

## Try it on testnet

The `ConfidentialTransfer` amendment isn't active on testnet today, so any `ConfidentialMPTConvertBack` submission from the builder will return a `temDISABLED` error. The cryptographic fields in the example are left empty because generating them requires external tools this site doesn't implement.

## Example

```json
{
  "TransactionType": "ConfidentialMPTConvertBack",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100",
  "ZKProof": ""
}
```

This would attempt to reveal 100 units of confidential balance as public balance; today it fails with `temDISABLED`.

## Related

- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — the reverse operation.
- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — consolidates the balance you can later revert.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer).
