---
title: LoanManage
summary: Lets the broker mark a loan as impaired, revert that, or declare a default that liquidates the cover.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanmanage
xls: XLS-0066
amendment: LendingProtocol
level: advanced
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanManage` is the tool the **LoanBroker's owner** uses to manage a loan that's going bad. It has three mutually exclusive actions, chosen by flag:

- **Impair** (`tfLoanImpair`): marks the [Loan](/objects/Loan) as impaired and records an "unrealized loss" (`LossUnrealized`) in the [Vault](/objects/Vault) for the exposed value. It doesn't move funds; it reduces the book value of the Vault's shares.
- **Unimpair** (`tfLoanUnimpair`): reverses the above. A [LoanPay](/tx/LoanPay) from the borrower also does this automatically.
- **Default** (`tfLoanDefault`): closes the loan as defaulted. Liquidates the broker's first-loss capital into the Vault, recognizes the remaining loss, and leaves the Loan zeroed out (`PaymentRemaining = 0`), ready for [LoanDelete](/tx/LoanDelete).

Without any flags it's a no-op that only updates metadata.

## When to use it

- The borrower has fallen behind and you want depositors in the Vault to see the exposure reflected (impair).
- The installment plus the `GracePeriod` has expired and you decide to execute the default.
- You mistakenly impaired a loan, or the borrower has caught up off-chain (unimpair).

## How it works inside

**preflight** (`LoanManage::preflight`): `LoanID` ≠ 0; at most one flag active (`temINVALID_FLAG`).

**preclaim** (`LoanManage::preclaim`), allowed transitions:
- A Loan with `lsfLoanDefault` can no longer be touched (`tecNO_PERMISSION`).
- You can't impair a loan twice, nor unimpair one that isn't impaired (`tecNO_PERMISSION`).
- A fully paid loan (`PaymentRemaining = 0`) isn't modified (`tecNO_PERMISSION`).
- `tfLoanDefault` requires that `NextPaymentDueDate + GracePeriod` has passed; if not, `tecTOO_SOON`.
- Only the broker's `Owner` can send it (`tecNO_PERMISSION`).

**doApply → `LoanManage::impairLoan`**: with [fixCleanup3_4_0](/amendments/fixCleanup3_4_0), only a loan whose payment is already overdue can be impaired (`tecTOO_SOON`). It adds `loanVaultExposure` (the value pending for the Vault) to `Vault.LossUnrealized`; if that loss would exceed `AssetsTotal − AssetsAvailable`, `tecLIMIT_EXCEEDED`. Sets `lsfLoanImpaired`. Before the fix, it also advanced `NextPaymentDueDate` to the current time.

**doApply → `LoanManage::unimpairLoan`**: subtracts the exposure from `LossUnrealized` and clears `lsfLoanImpaired`. Without `fixCleanup3_4_0`, it recalculates `NextPaymentDueDate`.

**doApply → `LoanManage::defaultLoan`**:
1. `totalDefaultAmount = loanVaultExposure(loan)`.
2. Liquidated cover = `min(CoverRateLiquidation × (CoverRateMinimum × DebtTotal), totalDefaultAmount)`, capped by `CoverAvailable`.
3. Vault: `AssetsTotal −= (total − covered)`; `AssetsAvailable += covered`. If the Loan was impaired, it's deducted from `LossUnrealized` (the loss moves from latent to realized).
4. Broker: `DebtTotal −= total`; `CoverAvailable −= covered`.
5. Loan: `lsfLoanDefault`, and `TotalValueOutstanding`, `PaymentRemaining`, `PrincipalOutstanding`, `ManagementFeeOutstanding`, and `NextPaymentDueDate` set to 0.
6. `accountSend` of the covered amount from the broker's pseudo-account to the Vault's (with `fixCleanup3_4_0` this transfer is exempt from freeze checks).

With [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), every successful path refreshes `associateAsset` on the Loan, broker, and Vault.

## Key fields

- **LoanID** — loan to manage.

## Flags

- **tfLoanDefault** (0x00010000) — executes the default. Irreversible.
- **tfLoanImpair** (0x00020000) — marks as impaired and records `LossUnrealized` on the Vault.
- **tfLoanUnimpair** (0x00040000) — reverses the impair.

You can only set one per transaction.

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **temINVALID_FLAG** — more than one flag at once.
- **tecNO_PERMISSION** — you're not the broker's owner, the loan is already in default or paid off, or the transition isn't allowed (impairing an already-impaired loan, unimpairing a healthy one).
- **tecTOO_SOON** — default before `NextPaymentDueDate + GracePeriod`, or impair (with `fixCleanup3_4_0`) before it's due.
- **tecLIMIT_EXCEEDED** — the latent loss would leave the Vault inconsistent.
- **tecNO_ENTRY** — the Loan doesn't exist.

## Example

```json
{
  "TransactionType": "LoanManage",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Flags": 65536
}
```

`Flags: 65536` is `tfLoanDefault`. Replace `LoanID` with the Loan's index; your account must be the owner of the broker that granted it.

## Try it on testnet

1. Today you'll get `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet.
2. Once active: create a short loan (`PaymentInterval: 60`, `GracePeriod: 60`) with [LoanSet](/tx/LoanSet) and don't pay it.
3. After 60 s, send `LoanManage` with `Flags: 131072` (impair). In the Vault's `ledger_entry` you'll see `LossUnrealized` > 0, and on the Loan the `lsfLoanImpaired` flag.
4. After 120 s from the start, send `Flags: 65536` (default). Observe: the broker's `CoverAvailable` drops, the Vault's `AssetsAvailable` rises by the covered amount, `AssetsTotal` drops by the uncovered amount, and the Loan ends up with `PaymentRemaining: 0` and `lsfLoanDefault`.
5. Finish with [LoanDelete](/tx/LoanDelete).

## Related

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanDelete](/tx/LoanDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
