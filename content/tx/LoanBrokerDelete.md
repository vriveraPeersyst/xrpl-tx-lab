---
title: LoanBrokerDelete
summary: Deletes a LoanBroker with no outstanding loans, returns the remaining cover to the owner, and removes its pseudo-account.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokerdelete
xls: XLS-0066
amendment: LendingProtocol
level: intermediate
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanBrokerDelete` removes a [LoanBroker](/objects/LoanBroker) object that no longer has any associated loans. In the same transaction, all the first-loss capital remaining in the broker's pseudo-account (`CoverAvailable`) is transferred to the owner, the pseudo-account's empty holding is deleted, the pseudo-account itself is deleted, and the two owner reserve units the broker consumed are released.

This is the inverse operation of [LoanBrokerSet](/tx/LoanBrokerSet) in creation mode. It does not affect the underlying [Vault](/objects/Vault), which continues to exist.

## When to use it

- You've wound down lending activity: all [Loan](/objects/Loan) objects have been repaid or have gone into default and been deleted with [LoanDelete](/tx/LoanDelete).
- You want to recover deposited cover without going through [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw) and free the reserve.
- Before deleting the Vault with [VaultDelete](/tx/VaultDelete), which requires that the Vault's pseudo-account directory contain no objects.

## How it works inside

**preflight** (`LoanBrokerDelete::preflight`): only checks that `LoanBrokerID` isn't zero (`temINVALID`). Before that, `checkExtraFeatures` requires the protocol's amendments or returns `temDISABLED`.

**preclaim** (`LoanBrokerDelete::preclaim`):
- The broker must exist (`tecNO_ENTRY`) and you must be its `Owner` (`tecNO_PERMISSION`).
- The broker's `OwnerCount` (number of outstanding loans) must be 0; otherwise `tecHAS_OBLIGATIONS`.
- Defensive check: if `DebtTotal` rounded to the Vault's scale isn't zero, `tecHAS_OBLIGATIONS` (in practice the last [LoanDelete](/tx/LoanDelete) already sets it to zero).
- If `CoverAvailable > 0` remains, the owner will receive funds: they cannot be *deep frozen* for that asset. With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), it also checks that the broker's pseudo-account isn't frozen or locked.

**doApply** (`LoanBrokerDelete::doApply`):
1. Removes the broker from the owner's directory and from the Vault's pseudo-account directory (`VaultNode`).
2. `accountSend` of `CoverAvailable` from the broker's pseudo-account to the owner, with no transfer fee.
3. `removeEmptyHolding` of the pseudo-account (deletes the trust line or MPToken).
4. Checks that the pseudo-account has zero XRP balance, `OwnerCount` 0, and no directory; if not, `tecHAS_OBLIGATIONS`. Then deletes it.
5. Reduces the owner's `OwnerCount` by 2 and deletes the broker.

## Key fields

- **LoanBrokerID** — ID of the LoanBroker object to delete (32-byte hash). You get it from `account_objects` with `type: "loan_broker"` after the `LoanBrokerSet`.

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **temINVALID** — `LoanBrokerID` is zero.
- **tecNO_ENTRY** — no LoanBroker exists with that ID.
- **tecNO_PERMISSION** — you're not the broker's `Owner`.
- **tecHAS_OBLIGATIONS** — there are still loans (`OwnerCount > 0`). Delete them first with [LoanDelete](/tx/LoanDelete) (requires that they be repaid or in default).
- **tecFROZEN / tecLOCKED** — your account is deep frozen for the Vault's asset (or the pseudo-account is frozen) and there's cover to return.

## Example

```json
{
  "TransactionType": "LoanBrokerDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace `LoanBrokerID` with the `index` of the LoanBroker object you created with [LoanBrokerSet](/tx/LoanBrokerSet).

## Try it on testnet

1. Today the builder will return `temDISABLED`: neither `LendingProtocol` nor `SingleAssetVault` is active on testnet.
2. Once active: create a Vault, a broker with [LoanBrokerSet](/tx/LoanBrokerSet), and deposit some cover with [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit).
3. Query `account_objects` with `type: "loan_broker"` and copy the `index` into `LoanBrokerID`.
4. Send `LoanBrokerDelete`. Afterward, `account_objects` will no longer show the broker, your `OwnerCount` will have dropped by 2, and your balance of the asset will have increased by the `CoverAvailable` that remained.
5. If you try to delete it with an outstanding loan, you'll observe `tecHAS_OBLIGATIONS`.

## Related

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanDelete](/tx/LoanDelete), [VaultDelete](/tx/VaultDelete)
- [LoanBroker](/objects/LoanBroker), [Loan](/objects/Loan), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
