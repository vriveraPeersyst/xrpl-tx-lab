---
title: LoanBrokerSet
summary: Creates or modifies a LoanBroker, the intermediary that grants loans using a Vault's capital and contributes first-loss capital.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokerset
xls: XLS-0066
amendment: LendingProtocol
level: advanced
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today any `LoanBrokerSet` fails in `preflight` with `temDISABLED`. This page describes what it will do once it's active.

`LoanBrokerSet` creates a [LoanBroker](/objects/LoanBroker) object associated with a [Vault](/objects/Vault) you already own, or modifies an existing one. The broker is the "bank" of the lending protocol: it uses the assets deposited in the Vault by investors to fund loans ([LoanSet](/tx/LoanSet)) and, in exchange, charges a management fee (`ManagementFeeRate`) on the interest.

To protect the Vault's depositors, the broker must hold **first-loss capital** (or *cover*) in its own pseudo-account. If a loan defaults, that cover is liquidated before the Vault absorbs losses. `CoverRateMinimum` sets how much cover must exist relative to outstanding debt, and `CoverRateLiquidation` sets what fraction of that minimum is liquidated on a default.

When creating the broker, `doApply` also creates a **pseudo-account** (an AccountRoot with `LoanBrokerID`) that holds the cover and acts as the owner of [Loan](/objects/Loan) objects. The broker is linked to the owner's directory and to the Vault's pseudo-account directory.

## When to use it

- You own a Vault and want to offer loans to third parties using its liquidity.
- You want to adjust the debt limit (`DebtMaximum`) or metadata (`Data`) of an existing broker.
- As a step before [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) and [LoanSet](/tx/LoanSet).

## How it works inside

**preflight** (`LoanBrokerSet::preflight`, static validation):
- `checkExtraFeatures` requires `SingleAssetVault` and `MPTokensV1` to be active (and `PermissionedDomains` if there's a `DomainID`); otherwise `temDISABLED`.
- `Data` up to 256 bytes; `ManagementFeeRate` ≤ 10,000 (units of 1/10 basis point, i.e. ≤ 10%); `CoverRateMinimum` and `CoverRateLiquidation` ≤ 100,000 (100%); `DebtMaximum` ≥ 0 and within an MPT's range.
- If you include `LoanBrokerID` (modification), you **cannot** include `ManagementFeeRate`, `CoverRateMinimum`, or `CoverRateLiquidation`: these are fixed for the broker's entire lifetime.
- `CoverRateMinimum` and `CoverRateLiquidation` must both be zero or both nonzero. `VaultID` and `LoanBrokerID` cannot be zero.

**preclaim** (`LoanBrokerSet::preclaim`, against the ledger):
- The Vault must exist (`tecNO_ENTRY`) and you must be its `Owner` (`tecNO_PERMISSION`).
- If modifying: the broker must exist, belong to you, and point to the same `VaultID`. You cannot lower `DebtMaximum` below the current `DebtTotal` (`tecLIMIT_EXCEEDED`), except by setting it to 0 (no limit).
- If creating: with [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) active, the Vault must be *closed-ended*; additionally, the asset must be able to accept new holdings (`canAddHolding`), and the Vault's pseudo-account cannot be frozen.
- `DebtMaximum` must be representable in the Vault's asset (`tecPRECISION_LOSS`).

**doApply**:
- Modification: only `Data` and `DebtMaximum` are written.
- Creation: increases the owner's `OwnerCount` by **2** (object + pseudo-account) and checks the reserve (`tecINSUFFICIENT_RESERVE`); creates the pseudo-account with an empty holding of the Vault's asset; initializes `LoanSequence = 1`, `Sequence`, `VaultID`, `Owner`, `Account` (the pseudo-account), and the transaction's optional fields.

## Key fields

- **VaultID** — ID of the Vault whose asset will be lent. Required even when modifying (must match the stored value).
- **LoanBrokerID** — if present, you're modifying that broker; if not, you're creating a new one.
- **ManagementFeeRate** — percentage of interest kept by the broker, in 1/10 basis point (100 = 1%). Maximum 10,000. Immutable.
- **CoverRateMinimum** — minimum cover required as a fraction of `DebtTotal`, in 1/10 bp (10,000 = 10%). Immutable. If 0, no cover is required.
- **CoverRateLiquidation** — fraction of the minimum cover liquidated on a default, in 1/10 bp. Immutable.
- **DebtMaximum** — cap on the broker's `DebtTotal`; 0 means no limit.
- **Data** — up to 256 arbitrary bytes (hex).

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **temINVALID** — a rate out of range, `Data` too long, you're trying to change a fixed field when modifying, or only one of the two `CoverRate*` fields is zero.
- **tecNO_ENTRY** — the Vault (or the broker being modified) doesn't exist.
- **tecNO_PERMISSION** — you're not the owner of the Vault or the broker, the `VaultID` doesn't match, or the Vault isn't closed-ended (V1_1).
- **tecLIMIT_EXCEEDED** — `DebtMaximum` is lower than outstanding debt.
- **tecINSUFFICIENT_RESERVE** — creation consumes two owner reserve units.
- **tecPRECISION_LOSS** — `DebtMaximum` not representable in the asset.

## Example

```json
{
  "TransactionType": "LoanBrokerSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "ManagementFeeRate": 100,
  "CoverRateMinimum": 1000,
  "Data": "7B7D"
}
```

Replace `VaultID` with the ID of the Vault you created with [VaultCreate](/tx/VaultCreate) (you'll see it in `account_objects` with `type: "vault"`). Note: this example includes `CoverRateMinimum` without `CoverRateLiquidation`; `preflight` requires both to be zero or both nonzero, so add `"CoverRateLiquidation": 1000` (or remove the minimum) to make it valid.

## Try it on testnet

1. Today, any submission returns `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet. You can send it from the builder to see it.
2. Once active: create a Vault with [VaultCreate](/tx/VaultCreate) and note its ID.
3. Send `LoanBrokerSet` with that `VaultID`, `ManagementFeeRate`, `CoverRateMinimum`, and `CoverRateLiquidation`.
4. Query your account's `account_objects`: you'll see a `LoanBroker` object with `Account` (the pseudo-account), `LoanSequence: 1`, `DebtTotal: 0`, and `CoverAvailable: 0`. Your `OwnerCount` will have risen by 2.
5. Deposit cover with [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) before granting loans.

## Related

- [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [LoanSet](/tx/LoanSet), [VaultCreate](/tx/VaultCreate)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [SingleAssetVault](/amendments/SingleAssetVault)
