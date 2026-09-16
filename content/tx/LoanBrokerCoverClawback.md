---
title: LoanBrokerCoverClawback
summary: Lets the issuer of an IOU or MPT claw back the excess cover that a LoanBroker holds in its pseudo-account.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverclawback
xls: XLS-0066
amendment: LendingProtocol
level: advanced
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's activated.

`LoanBrokerCoverClawback` is the broker version of the traditional [Clawback](/tx/Clawback): the **issuer** of the Vault's asset withdraws tokens from a [LoanBroker](/objects/LoanBroker)'s pseudo-account, reducing `CoverAvailable`. It only works with IOU or MPT (XRP has no issuer) and only if the issuer has clawback enabled (`lsfAllowTrustLineClawback` without `lsfNoFreeze` for IOU; `lsfMPTCanClawback` on the issuance for MPT).

The amount that can be recovered is bounded: **never below the minimum cover** required by the outstanding debt (`CoverRateMinimum × DebtTotal`). An `Amount` of zero (or absent) means "all of the excess."

## When to use it

- You're the issuer of a regulated stablecoin and need to withdraw funds from a broker due to a legal order or a breach of your terms.
- You want to recover tokens from an abandoned broker without forcing the broker to perform a [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw).

## How it works inside

**preflight** (`LoanBrokerCoverClawback::preflight`):
- Either `LoanBrokerID` or `Amount` must be present (at least one); `LoanBrokerID` ≠ 0.
- `Amount` can't be XRP (`temBAD_AMOUNT`) or negative; zero is allowed ("all of it").
- If there is **no** `LoanBrokerID`, `Amount` must be an IOU whose `issuer` is the broker's pseudo-account (it can't be your own account or zero, and can't be MPT, `temINVALID`). The transactor derives the broker from that.

**preclaim** (`LoanBrokerCoverClawback::preclaim`):
- `determineBrokerID`: uses `LoanBrokerID` or, if missing, reads the AccountRoot of `Amount`'s `issuer`; if it doesn't exist, `tecNO_ENTRY`; if it exists but has no `LoanBrokerID` (not a broker pseudo-account), `tecOBJECT_NOT_FOUND`.
- The Vault's asset can't be XRP and **you must be its issuer** (`tecNO_PERMISSION`).
- `determineAsset`: accepts `Amount` with `issuer` = you or = the broker's pseudo-account; anything else, or a currency different from the Vault's, is `tecWRONG_ASSET`.
- `determineClawAmount`: `max = CoverAvailable − minimumBrokerCover(DebtTotal, CoverRateMinimum)` (minimum rounded up). If `max ≤ 0`, `tecINSUFFICIENT_FUNDS`. The effective amount is `min(Amount, max)`, or `max` if `Amount` is 0.
- `canApplyToBrokerCover` (with [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)): `tecPRECISION_LOSS` if the amount rounds down to zero.
- Checks the issuer's flags: IOU requires `lsfAllowTrustLineClawback` and no `lsfNoFreeze`; MPT requires `lsfMPTCanClawback` on the MPTokenIssuance (`tecNO_PERMISSION` / `tecOBJECT_NOT_FOUND`).

**doApply** (`LoanBrokerCoverClawback::doApply`): recalculates the amount, subtracts it from `CoverAvailable`, and performs `accountSend` from the broker's pseudo-account to the issuer with no transfer fee.

## Key fields

- **LoanBrokerID** — optional. If provided, `Amount` may carry `issuer` = your own account (normal token format).
- **Amount** — optional. Maximum amount to recover; 0 = all of the excess. If you omit `LoanBrokerID`, its `issuer` must be the broker's pseudo-account, following the classic Clawback convention (the Amount's "issuer" is the holder).

## Common errors

- **temDISABLED** — the amendment isn't active (current situation on testnet).
- **temINVALID** — both fields are missing, or `Amount` without `LoanBrokerID` is MPT or has an invalid `issuer`.
- **temBAD_AMOUNT** — `Amount` is XRP or negative.
- **tecNO_PERMISSION** — you're not the issuer of the Vault's asset, the asset is XRP, or you don't have clawback enabled.
- **tecINSUFFICIENT_FUNDS** — the cover is already at the required minimum; there's no excess to recover.
- **tecWRONG_ASSET** — the currency or issuer of `Amount` doesn't match the Vault's asset.
- **tecOBJECT_NOT_FOUND** — the account given as `issuer` isn't a broker pseudo-account (or the MPTokenIssuance is missing).

## Example

```json
{
  "TransactionType": "LoanBrokerCoverClawback",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Note: the drops-denominated `Amount` in this reference example **isn't valid**: the transactor rejects XRP with `temBAD_AMOUNT`. To actually test it you need a Vault of an IOU that you issue, for example `"Amount": { "currency": "USD", "issuer": "rXXXX_YOUR_ACCOUNT", "value": "10" }`, and a `LoanBrokerID` with the index of the broker (created by another account, rYYYY_OTHER_ACCOUNT) on that Vault.

## Try it on testnet

1. Today you'll get `temDISABLED`: `LendingProtocol` and `SingleAssetVault` aren't active on testnet.
2. Once activated: with your account as issuer, enable `asfAllowTrustLineClawback` via [AccountSet](/tx/AccountSet) **before** issuing anything.
3. From rYYYY_OTHER_ACCOUNT, create a Vault of your USD token, a broker with `CoverRateMinimum` (e.g. 1000), and deposit 10 USD of cover.
4. Send `LoanBrokerCoverClawback` from your account with `Amount: 0` in USD. You'll see in the broker's `account_objects` that `CoverAvailable` drops to the required minimum (0 if there's no debt) and your issuer balance decreases by that amount.
5. Repeat: you'll get `tecINSUFFICIENT_FUNDS` because there's no longer any excess.

## Related

- [Clawback](/tx/Clawback), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [VaultClawback](/tx/VaultClawback)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [LendingProtocol](/amendments/LendingProtocol), [Clawback](/amendments/Clawback), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
