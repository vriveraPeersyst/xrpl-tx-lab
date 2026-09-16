---
title: LoanBrokerCoverWithdraw
summary: Withdraws first-loss capital from a LoanBroker, provided the minimum required by outstanding debt remains.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverwithdraw
xls: XLS-0066
amendment: LendingProtocol
level: intermediate
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanBrokerCoverWithdraw` takes assets out of a [LoanBroker](/objects/LoanBroker)'s pseudo-account and reduces `CoverAvailable`. It's the inverse of [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit). The core rule: after withdrawing, the remaining cover must still be **at least `CoverRateMinimum × DebtTotal`**; the protocol never lets the broker become undercapitalized while it has outstanding loans.

Funds go to the broker's owner or, if you specify `Destination`, to a third party. In that second case, the same checks apply as in a normal payment (strong authorization, DepositAuth, credentials).

## When to use it

- Recover surplus cover once outstanding debt has gone down (loans repaid).
- Collect fees that [LoanPay](/tx/LoanPay) sent to the pseudo-account instead of to your account (this happens when cover was below the minimum or you couldn't receive the asset).
- Empty the cover before a [LoanBrokerDelete](/tx/LoanBrokerDelete) (although that already returns the remainder automatically).

## How it works inside

**preflight** (`LoanBrokerCoverWithdraw::preflight`): `LoanBrokerID` ≠ 0 (`temINVALID`); `Amount` > 0 and legal (`temBAD_AMOUNT`); `Destination`, if present, ≠ the zero account (`temMALFORMED`); `CredentialIDs` well-formed. `checkExtraFeatures` additionally requires `Credentials` + [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) if you include `CredentialIDs`.

**preclaim** (`LoanBrokerCoverWithdraw::preclaim`):
- The destination cannot be a pseudo-account (`tecPSEUDO_ACCOUNT`).
- The broker must exist and be yours; `Amount` must be in the Vault's asset (`tecWRONG_ASSET`).
- `canApplyToBrokerCover` (with [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)): if the amount rounds to zero at the cover's scale, `tecPRECISION_LOSS`.
- `canTransfer` from the pseudo-account to the destination. With `fixCleanup3_2_0`, `lsfMPTCanTransfer` is **ignored**: an MPT issuer cannot trap the broker's cover. NoRipple, freeze, and authorization still apply.
- If `Destination` ≠ your account: `canWithdraw` (destination's DepositAuth / preauthorization / credentials) and `requireAuth` with `StrongAuth` (the destination must already have a trust line or MPToken). If the destination is you, `WeakAuth` suffices, and with `fixCleanup3_4_0` the holding is created if missing.
- Freeze: with [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), `checkWithdrawFreeze` is used; before that, the pseudo-account cannot be frozen nor the destination deep frozen (unless the destination is the issuer).
- Limits: `CoverAvailable ≥ Amount` and `CoverAvailable − Amount ≥ minimumBrokerCover(DebtTotal, CoverRateMinimum)`, rounded up; otherwise `tecINSUFFICIENT_FUNDS`. Finally it verifies that the pseudo-account actually has the balance.

**doApply** (`LoanBrokerCoverWithdraw::doApply`): subtracts `Amount` from `CoverAvailable` and calls `doWithdraw`, which transfers from the pseudo-account to the destination (creating the holding if needed) with no transfer fee.

## Key fields

- **LoanBrokerID** — the broker's ID.
- **Amount** — amount to withdraw, in the Vault's asset.
- **Destination** — receiving account; defaults to your own account. Cannot be a pseudo-account.
- **DestinationTag** — tag for the destination, if it requires one.
- **CredentialIDs** — credentials to pass the destination's DepositAuth (requires `Credentials` and `fixCleanup3_4_0`).

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **tecINSUFFICIENT_FUNDS** — you're requesting more than available, or it would leave cover below the minimum required by outstanding debt.
- **tecNO_PERMISSION** — you're not the broker's `Owner`, or the destination has DepositAuth and you're not preauthorized.
- **tecWRONG_ASSET** — asset different from the Vault's.
- **tecPSEUDO_ACCOUNT** — `Destination` is a pseudo-account (Vault, AMM, broker…).
- **tecNO_AUTH / tecNO_LINE** — the third-party destination doesn't have a trust line or authorized MPToken for the asset.
- **tecPRECISION_LOSS** — amount that rounds to zero.

## Example

```json
{
  "TransactionType": "LoanBrokerCoverWithdraw",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Replace `LoanBrokerID` with the `index` of the broker you created with [LoanBrokerSet](/tx/LoanBrokerSet).

## Try it on testnet

1. Today the builder will return `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet.
2. Once active: create a Vault and broker, and deposit 2 XRP of cover with [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit).
3. Send `LoanBrokerCoverWithdraw` with `Amount: "1000000"`. In `account_objects` (`type: "loan_broker"`) you'll see `CoverAvailable` reduced to 1,000,000 and your XRP balance will rise by 1 XRP minus the fee.
4. Grant a loan with [LoanSet](/tx/LoanSet) and try withdrawing all the cover: it will fail with `tecINSUFFICIENT_FUNDS` because `DebtTotal × CoverRateMinimum` locks part of the balance.

## Related

- [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback), [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanPay](/tx/LoanPay)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [Credentials](/amendments/Credentials), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
