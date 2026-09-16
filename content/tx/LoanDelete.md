---
title: LoanDelete
summary: Deletes a Loan object that has no pending installments left (repaid or in default) and frees its reserve.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loandelete
xls: XLS-0066
amendment: LendingProtocol
level: intermediate
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanDelete` removes a [Loan](/objects/Loan) object whose lifecycle has ended: either the borrower paid all installments with [LoanPay](/tx/LoanPay), or the broker declared it in default with [LoanManage](/tx/LoanManage). In both cases the Loan ends up with `PaymentRemaining = 0`, which is the only condition the transactor requires.

It can be sent by either the **borrower** or the **owner of the LoanBroker**. When deleted, the Loan is removed from the borrower's directory and from the broker's pseudo-account directory, both parties' `OwnerCount` drops by 1, and, if it was the broker's last loan, any remaining `DebtTotal` (rounding dust) is set to zero.

## When to use it

- Recover the owner reserve unit the borrower was paying for the Loan.
- Clean up defaulted loans so the broker can be deleted with [LoanBrokerDelete](/tx/LoanBrokerDelete), which requires `OwnerCount = 0`.

## How it works inside

**preflight** (`LoanDelete::preflight`): `LoanID` ≠ 0 (`temINVALID`). Before that, `checkExtraFeatures` returns `temDISABLED` if the amendments are missing.

**preclaim** (`LoanDelete::preclaim`):
- The Loan must exist (`tecNO_ENTRY`).
- `PaymentRemaining` must be 0; an active loan returns `tecHAS_OBLIGATIONS`.
- The Loan's broker is read; `Account` must be the broker's `Owner` or the Loan's `Borrower` (`tecNO_PERMISSION`).

**doApply** (`LoanDelete::doApply`):
1. `dirRemove` of the Loan from the broker's pseudo-account directory (`LoanBrokerNode`) and from the borrower's (`OwnerNode`).
2. `view.erase(loan)`.
3. `adjustLoanBrokerOwnerCount(-1)` on the broker. If its `OwnerCount` ends up at 0 and `DebtTotal` isn't exactly zero, it's forced to 0: there are no loans left to collect that residual debt from.
4. `decreaseOwnerCountForObject` on the borrower (frees the reserve).

No funds move: any pending balance was already settled in the last `LoanPay` or absorbed in the default.

## Key fields

- **LoanID** — index of the Loan object (32 bytes). It's computed from `LoanBrokerID` and `LoanSequence`; you'll see it in `account_objects` with `type: "loan"`.

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **temINVALID** — `LoanID` is zero.
- **tecNO_ENTRY** — no Loan exists with that ID.
- **tecHAS_OBLIGATIONS** — the loan still has pending installments (`PaymentRemaining > 0`). Pay it off with [LoanPay](/tx/LoanPay) or declare default with [LoanManage](/tx/LoanManage).
- **tecNO_PERMISSION** — you're neither the borrower nor the broker's owner.

## Example

```json
{
  "TransactionType": "LoanDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace `LoanID` with the `index` of the Loan created with [LoanSet](/tx/LoanSet).

## Try it on testnet

1. Today you'll get `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet.
2. Once active: create a loan with `PaymentTotal: 1` via [LoanSet](/tx/LoanSet) and pay it off with a single [LoanPay](/tx/LoanPay).
3. Query `account_objects` with `type: "loan"`: `PaymentRemaining` will be 0 and `PrincipalOutstanding` 0.
4. Send `LoanDelete` with that `LoanID`. The object disappears and your `OwnerCount` drops by 1.
5. If you try it before paying it off, you'll see `tecHAS_OBLIGATIONS`.

## Related

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanBrokerDelete](/tx/LoanBrokerDelete)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker)
- [LendingProtocol](/amendments/LendingProtocol)
