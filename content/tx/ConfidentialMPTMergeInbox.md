---
title: ConfidentialMPTMergeInbox
summary: Consolidates the confidential balance received in your inbox with your spendable confidential balance.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptmergeinbox
amendment: ConfidentialTransfer
level: advanced
---

## What it does

When you convert a balance to confidential with [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) or receive a confidential transfer with [ConfidentialMPTSend](/tx/ConfidentialMPTSend), the encrypted amount doesn't land directly in your spendable balance: it accumulates in an inbox (`ConfidentialBalanceInbox`), separate from the "spendable" balance (`ConfidentialBalanceSpending`). This separation prevents every incoming transfer from forcing an immediate recalculation of your account's full encrypted state within the same transaction that generates it.

`ConfidentialMPTMergeInbox` is the transaction you send yourself to merge that inbox with your spendable balance: it cryptographically adds both commitments together (without revealing the amounts) and empties the inbox. It's a maintenance operation you need to run from time to time —or before any send that needs the recently received balance to be available.

**This transaction type depends on the `ConfidentialTransfer` amendment, which is not currently active on testnet.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- After receiving one or more `ConfidentialMPTSend` transactions, before you can spend that balance.
- After converting a public balance to confidential with `ConfidentialMPTConvert`.
- As periodic maintenance, so unconsolidated entries don't pile up in the inbox.

## How it works inside

**`ConfidentialMPTMergeInbox::preflight`** only validates form: that `MPTokenIssuanceID` is present and well-formed (`temMALFORMED` if not).

**`ConfidentialMPTMergeInbox::preclaim`** requires that the issuance allow confidential balances (`lsfMPTCanHoldConfidentialBalance`, `tecNO_PERMISSION` if not) and that your `MPToken` for that issuance exists (`tecOBJECT_NOT_FOUND` if not).

**`ConfidentialMPTMergeInbox::doApply`** adds the cryptographic commitment from `ConfidentialBalanceInbox` to that of `ConfidentialBalanceSpending`, zeroes out the inbox, and updates your encryption key (`HolderEncryptionKey`) if applicable. The operation itself doesn't change the issuance's total circulating supply: it only reorganizes your own encrypted balance.

## Key fields

- **MPTokenIssuanceID** — the issuance whose inbox you're merging with your spendable balance. You don't need to indicate amounts: the transaction operates on everything pending in the inbox.

## Common errors

- **tecNO_PERMISSION** — the issuance doesn't have confidential balances enabled.
- **tecOBJECT_NOT_FOUND** — you don't have an `MPToken` for that issuance.
- **temMALFORMED** — `MPTokenIssuanceID` is missing or invalid.

## Try it on testnet

The `ConfidentialTransfer` amendment isn't active on testnet today, so any submission of `ConfidentialMPTMergeInbox` from the builder will return a `temDISABLED` error. The example below is the minimum needed once the amendment is activated; unlike other confidential transactions, it doesn't require generating external cryptographic proofs.

## Example

```json
{
  "TransactionType": "ConfidentialMPTMergeInbox",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

Would merge your confidential inbox with your spendable balance for that issuance; today it fails with `temDISABLED`.

## Related

- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — generates entries in the inbox.
- [ConfidentialMPTSend](/tx/ConfidentialMPTSend) — also deposits into the recipient's inbox.
- [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — consumes the spendable balance to convert back to public.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer).
