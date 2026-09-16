---
title: LoanBrokerCoverDeposit
summary: Deposits first-loss capital (cover) into a LoanBroker's pseudo-account to back its loans.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverdeposit
xls: XLS-0066
amendment: LendingProtocol
level: intermediate
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's activated.

`LoanBrokerCoverDeposit` moves assets from a [LoanBroker](/objects/LoanBroker) owner's account to the broker's pseudo-account and increases the `CoverAvailable` field by that same amount. That balance is the **first-loss capital**: in a default ([LoanManage](/tx/LoanManage) with `tfLoanDefault`) it's liquidated before [Vault](/objects/Vault) depositors lose anything.

The deposited asset must be exactly the asset of the Vault the broker belongs to (XRP, an IOU, or an MPT). Only the broker's owner can deposit.

## When to use it

- Before granting loans: [LoanSet](/tx/LoanSet) fails with `tecINSUFFICIENT_FUNDS` if `CoverAvailable` doesn't reach `CoverRateMinimum × DebtTotal` after adding the new loan.
- To replenish cover after a default has consumed it.
- To raise the broker's debt capacity without touching `DebtMaximum`.

## How it works inside

**preflight** (`LoanBrokerCoverDeposit::preflight`): `LoanBrokerID` different from zero (`temINVALID`); `Amount` strictly positive and correctly formatted (`temBAD_AMOUNT`).

**preclaim** (`LoanBrokerCoverDeposit::preclaim`):
- The broker must exist (`tecNO_ENTRY`) and be yours (`tecNO_PERMISSION`).
- `Amount.asset()` must match `Vault.Asset` (`tecWRONG_ASSET`).
- `canTransfer`: the asset must be transferable between you and the pseudo-account (for MPT, `lsfMPTCanTransfer`).
- Freezes: with [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), `checkDepositFreeze` is used; before that, your account can't be frozen and the pseudo-account can't be deep frozen.
- `requireAuth` with `StrongAuth`: if the issuer requires authorization, you must be authorized.
- With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), the amount is rounded **down** to `CoverAvailable`'s scale; if it ends up at zero, `tecPRECISION_LOSS`. This prevents "dust" deposits that don't move anything.
- Your available balance of the asset (accounting for freeze and authorization) must cover the rounded amount (`tecINSUFFICIENT_FUNDS`).

**doApply** (`LoanBrokerCoverDeposit::doApply`): recalculates the rounded amount, performs `accountSend` from your account to the broker's pseudo-account with no transfer fee, and adds that same value to `CoverAvailable`.

## Key fields

- **LoanBrokerID** — ID of the broker (index of the LoanBroker object).
- **Amount** — amount to deposit in the Vault's asset. In drops if XRP; `{currency, issuer, value}` object for IOU; `{mpt_issuance_id, value}` for MPT. With `fixCleanup3_2_0`, decimals exceeding the cover's scale are discarded (rounded down).

## Common errors

- **temDISABLED** — the amendment isn't active (current situation on testnet).
- **temBAD_AMOUNT** — `Amount` is zero or negative.
- **tecNO_ENTRY** — the `LoanBrokerID` doesn't exist.
- **tecNO_PERMISSION** — you're not the broker's `Owner`.
- **tecWRONG_ASSET** — `Amount`'s asset isn't the Vault's.
- **tecINSUFFICIENT_FUNDS** — you don't have enough balance of the asset.
- **tecPRECISION_LOSS** — the amount rounded to the cover's scale is zero.
- **tecFROZEN / tecNO_AUTH** — the trust line is frozen or you're not authorized by the issuer.

## Example

```json
{
  "TransactionType": "LoanBrokerCoverDeposit",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

`Amount` in drops (1 XRP) assumes an XRP Vault. Replace `LoanBrokerID` with the `index` of the object created with [LoanBrokerSet](/tx/LoanBrokerSet).

## Try it on testnet

1. Today you'll get `temDISABLED`: `LendingProtocol` and `SingleAssetVault` aren't active on testnet.
2. Once activated: create an XRP Vault with [VaultCreate](/tx/VaultCreate) and a broker with [LoanBrokerSet](/tx/LoanBrokerSet).
3. Query `account_objects` with `type: "loan_broker"` and note the `index` and `Account` (the pseudo-account).
4. Send `LoanBrokerCoverDeposit` with 1,000,000 drops.
5. Query the broker again: `CoverAvailable` will be `1000000`. An `account_info` of the pseudo-account will show that XRP; your balance will have dropped by 1 XRP plus the fee.

## Related

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback), [LoanSet](/tx/LoanSet), [LoanManage](/tx/LoanManage)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)
