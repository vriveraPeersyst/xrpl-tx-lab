---
title: ConfidentialMPTClawback
summary: The issuer claws back confidential balance from an MPT holder, without needing to know the exact amount.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptclawback
amendment: ConfidentialTransfer
level: advanced
---

## What it does

`ConfidentialMPTClawback` is the confidential version of [Clawback](/tx/Clawback): it lets an MPT's issuer reclaim the balance (or part of it) that a holder keeps in confidential mode, as long as the issuance was created with the `lsfMPTCanClawback` capability. Like the rest of the operations on confidential balances, it travels with a zero-knowledge proof (`ZKProof`) that demonstrates the operation is consistent with the holder's encrypted state, without the issuer needing to know the exact balance beforehand.

This mechanism is essential for regulated issuers: balance privacy can't be a way to evade a garnishment order or the correction of an operational error, so the amendment keeps this backdoor under the exclusive control of the issuer.

**This transaction type depends on the `ConfidentialTransfer` amendment, which is not currently active on testnet.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- Complying with a court or regulatory garnishment order over a specific holder's confidential assets.
- Correcting an erroneous confidential MPT issuance without depending on the holder's cooperation.
- Any scenario where you'd already use `Clawback` on a public balance, but the holder keeps their position in confidential mode.

## How it works inside

**`ConfidentialMPTClawback::preflight`** validates form: `MPTAmount` other than zero (`temBAD_AMOUNT`) and cryptographic fields with a valid format (`temMALFORMED`).

**`ConfidentialMPTClawback::preclaim`** requires the issuance to have `lsfMPTCanClawback` enabled (`tecNO_PERMISSION` if not) and `lsfMPTCanHoldConfidentialBalance`, that the holder (`Holder`) has enough confidential balance to cover the claimed `MPTAmount` (`tecINSUFFICIENT_FUNDS`), and that both the issuance and the holder's `MPToken` exist (`tecOBJECT_NOT_FOUND`, `tecNO_TARGET`).

**`ConfidentialMPTClawback::doApply`** subtracts the corresponding commitment from the holder's confidential balance and reduces the issuance's total encrypted supply in circulation (`ConfidentialOutstandingAmount`); the reclaimed amount doesn't come back to you as a visible balance — it's removed from encrypted circulation, just as a normal `Clawback` reduces the public `OutstandingAmount`.

## Key fields

- **Holder** — the account whose confidential balance is being clawed back. Can never be the issuer itself.
- **MPTAmount** — the amount, in clear text within the issuer's transaction, claimed from the holder's encrypted balance.
- **ZKProof** — proof that the operation is consistent with the holder's encrypted balance, without the issuer needing to know that balance beforehand.

## Common errors

- **tecNO_PERMISSION** — the issuance doesn't have `lsfMPTCanClawback` enabled, or whoever sends the transaction isn't the issuer.
- **tecINSUFFICIENT_FUNDS** — the holder's confidential balance doesn't cover the claimed `MPTAmount`.
- **tecNO_TARGET** — the indicated `Holder` doesn't exist or doesn't have an `MPToken` for that issuance.
- **tecOBJECT_NOT_FOUND** — the issuance doesn't exist.
- **temBAD_AMOUNT** — `MPTAmount` is zero or invalid.

## Try it on testnet

The `ConfidentialTransfer` amendment isn't active on testnet today, so any `ConfidentialMPTClawback` submission from the builder will return a `temDISABLED` error. The `ZKProof` field in the example is left empty because generating it requires external cryptographic tools this site doesn't implement.

## Example

```json
{
  "TransactionType": "ConfidentialMPTClawback",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Holder": "rYYYY_OTHER_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100"
}
```

As the issuer, this would attempt to reclaim 100 units from `rYYYY_OTHER_ACCOUNT`'s confidential balance; today it fails with `temDISABLED`.

## Related

- [Clawback](/tx/Clawback) — the equivalent for public balance (IOU and MPT).
- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — how the confidential balance reclaimed here is generated.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [MPTokensV1](/amendments/MPTokensV1).
