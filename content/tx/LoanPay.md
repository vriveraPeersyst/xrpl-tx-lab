---
title: LoanPay
summary: Pays one or more loan installments, a late payment, an early payoff, or an overpayment, splitting between the Vault and the broker.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanpay
xls: XLS-0066
amendment: LendingProtocol
level: advanced
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanPay` is the transaction the **borrower** uses to repay a [Loan](/objects/Loan). Depending on the flag, it makes a regular payment (one or several installments at once), a late payment with penalties, a full early payoff, or a regular payment with a principal overpayment. Each payment is split into two parts: principal and interest, which go back to the [Vault](/objects/Vault)'s pseudo-account, and the broker's fees (`ManagementFeeRate` on the interest plus `LoanServiceFee`, `LatePaymentFee`, etc.), which go to the [LoanBroker](/objects/LoanBroker)'s owner.

An important detail: if the broker doesn't have the minimum cover, or can't receive the asset (deep frozen, unauthorized), the fee isn't lost: it's deposited into the broker's pseudo-account and added to `CoverAvailable`. And if the loan was *impaired*, a payment restores it automatically (`unimpairLoan`) before being applied.

## When to use it

- Pay the period's installment (or advance several in a single transaction, up to 100).
- Catch up after a delay (`tfLoanLatePayment`), before the broker declares default.
- Pay off the entire loan early (`tfLoanFullPayment`).
- Reduce principal beyond the installment (`tfLoanOverpayment`), if the loan allows it.

## How it works inside

**preflight** (`LoanPay::preflight`): `LoanID` ≠ 0; `Amount` > 0 (`temBAD_AMOUNT`); at most one of the three flags (`temINVALID_FLAG`).

**calculateBaseFee** (`LoanPay::calculateBaseFee`): a regular payment can process several installments, so the minimum fee scales: one base fee for every 5 estimated installments (`Amount / (installment + LoanServiceFee)`), capped at 20 base fees (100 installments). Late and full payments cost a single base fee.

**preclaim** (`LoanPay::preclaim`):
- The Loan must exist and `Borrower` must be your account (`tecNO_PERMISSION`).
- `tfLoanOverpayment` on a loan without `lsfLoanOverpayment` → `tecNO_PERMISSION` (with [fixCleanup3_1_3](/amendments/fixCleanup3_1_3); before that, `temINVALID_FLAG`).
- If `PaymentRemaining = 0` or `PrincipalOutstanding = 0`, `tecKILLED` (already paid off).
- `Amount` must be in the Vault's asset (`tecWRONG_ASSET`); you must not be frozen; the Vault's pseudo-account must not be deep frozen; issuer authorization applies.
- You must have **all** of `Amount` available even if the payment consumes less: there are no partial payments (`tecINSUFFICIENT_FUNDS`).

**doApply** (`LoanPay::doApply` and `loanMakePayment` in `LendingHelpers.cpp`):
- If the payment is overdue (`isPaymentLate`) and you don't include `tfLoanLatePayment`, `tecEXPIRED`.
- **Regular**: a loop applies full installments while `Amount` covers `PeriodicPayment + LoanServiceFee`, there are payments left, and it hasn't exceeded 100. If it doesn't cover even one installment, `tecINSUFFICIENT_PAYMENT`. The remainder is ignored except with overpayment.
- **Overpayment**: after the full installments, the rest (rounded to `LoanScale`) is applied to principal with `OverpaymentFee` and `OverpaymentInterestRate`, and the schedule is recalculated.
- **Late**: one installment plus the delay interest (`LateInterestRate` on the delay) and `LatePaymentFee`. If `Amount` doesn't cover the total, `tecINSUFFICIENT_PAYMENT`.
- **Full**: only if `PaymentRemaining > 1` (`tecKILLED` on the last installment). Pays the theoretical outstanding principal plus accrued interest and closing interest (`CloseInterestRate`) plus `ClosePaymentFee`.
- Afterward it updates `PrincipalOutstanding`, `TotalValueOutstanding`, `NextPaymentDueDate`, `PaymentRemaining`; `Vault.AssetsAvailable += principal + interest`; `Vault.AssetsTotal` according to the accrual or cash-basis model; `Broker.DebtTotal −= delta`.
- `accountSendMulti` from your account to the Vault's pseudo-account and to the broker's payee, with no transfer fee. If `AssetsAvailable` doesn't change due to rounding, `tecPRECISION_LOSS`.

## Key fields

- **LoanID** — loan to pay.
- **Amount** — amount you're making available, in the Vault's asset. Must cover at least one installment (regular), or the full amount required (late/full). Any surplus isn't charged (except on overpayment).

## Flags

- **tfLoanOverpayment** (0x00010000) — regular payment plus a principal overpayment. Requires `lsfLoanOverpayment` on the Loan.
- **tfLoanFullPayment** (0x00020000) — cancels the loan in full before the last installment.
- **tfLoanLatePayment** (0x00040000) — mandatory if `NextPaymentDueDate` has already passed.

They're mutually exclusive.

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **tecNO_PERMISSION** — you're not the borrower, or you're requesting an overpayment on a loan that doesn't allow it.
- **tecEXPIRED** — the payment is overdue and you didn't use `tfLoanLatePayment`.
- **tecINSUFFICIENT_PAYMENT** — `Amount` doesn't cover the installment (or the late/full total).
- **tecINSUFFICIENT_FUNDS** — your available balance is less than `Amount`.
- **tecKILLED** — the loan is already paid off, or you're attempting `tfLoanFullPayment` on the last installment.
- **tecWRONG_ASSET** — `Amount` isn't the Vault's asset.
- **telINSUF_FEE_P** — the fee doesn't cover the increase for the number of installments.

## Example

```json
{
  "TransactionType": "LoanPay",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "2500000"
}
```

A regular payment of 2.5 XRP (one installment of the 10 XRP, 4-installment loan from the [LoanSet](/tx/LoanSet) example; adjust to the actual Loan's `PeriodicPayment + LoanServiceFee`). Replace `LoanID` with the Loan's index.

## Try it on testnet

1. Today the builder will return `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet.
2. Once active: create a loan with [LoanSet](/tx/LoanSet) and read `PeriodicPayment`, `LoanServiceFee`, and `NextPaymentDueDate` in `account_objects` (`type: "loan"`).
3. Before it's due, send `LoanPay` with `Amount` ≥ `PeriodicPayment + LoanServiceFee`. You'll see `PaymentRemaining` drop by 1, `NextPaymentDueDate` advance by one `PaymentInterval`, the Vault's `AssetsAvailable` rise, and the broker's owner receive their fee.
4. Send double that amount: two installments will be applied in a single transaction.
5. Let the due date pass and pay without a flag: `tecEXPIRED`. Repeat with `Flags: 262144` and observe that `LatePaymentFee` and delay interest are charged.

## Related

- [LoanSet](/tx/LoanSet), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
