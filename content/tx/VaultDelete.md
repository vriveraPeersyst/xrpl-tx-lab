---
title: VaultDelete
summary: Deletes an empty vault along with its pseudo-account and share issuance, returning the reserve to the owner.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultdelete
xls: XLS-0065
amendment: SingleAssetVault
level: intermediate
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** Any `VaultDelete` you send today fails with `temDISABLED`. This page describes the code that will activate once the amendment is voted in.

`VaultDelete` destroys a [Vault](/objects/Vault) that no longer has anything inside it. It removes the three objects created by [VaultCreate](/tx/VaultCreate): the Vault itself, the pseudo-account that custodied the asset, and the shares' [MPTokenIssuance](/objects/MPTokenIssuance). It also deletes the pseudo-account's empty asset holding (trust line or MPToken) and, if it still exists, your own shares `MPToken`. Your account's `OwnerCount` drops by 2 and you recover the reserve.

Only the `Owner` can delete it, and only when the vault is completely empty: no assets (`AssetsTotal` and `AssetsAvailable` at zero) and no shares outstanding (`OutstandingAmount` of the issuance at zero). If depositors remain, each must withdraw with [VaultWithdraw](/tx/VaultWithdraw), or the issuer must claw back with [VaultClawback](/tx/VaultClawback).

## When to use it

- Closing a yield product that has ended and from which all participants have already exited.
- Recovering the 2 units of owner reserve locked up by the vault.
- Cleaning up test vaults you created and no longer use.

## How it works inside

`VaultDelete::preflight` (static validation) returns `temMALFORMED` if `VaultID` is zero. If you include `MemoData` (a deletion reason of up to 256 bytes), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) is required; without that amendment the field triggers `temDISABLED`.

`VaultDelete::preclaim` (against the ledger): looks up the Vault (`tecNO_ENTRY`), checks that `Account` is the `Owner` (`tecNO_PERMISSION`) and that `AssetsAvailable` and `AssetsTotal` are zero (`tecHAS_OBLIGATIONS`). It then reads the share issuance (`ShareMPTID`), verifies that its issuer is the Vault's pseudo-account and that `OutstandingAmount` is zero (`tecHAS_OBLIGATIONS` if shares remain in anyone's hands).

`VaultDelete::doApply` performs the cleanup in order: (1) `removeEmptyHolding` on the pseudo-account to delete its trust line or MPToken for the asset; (2) if you, the owner, still have a shares `MPToken`, it's removed; (3) removes the share issuance from the pseudo-account's directory, decrements its `OwnerCount` and deletes it; (4) checks that the pseudo-account has no balance, no objects and no directory (otherwise `tecHAS_OBLIGATIONS`) and deletes its `AccountRoot`; (5) removes the Vault from your directory, lowers your `OwnerCount` by 2 and deletes the Vault. Any ledger inconsistency produces `tefBAD_LEDGER` or `tefINTERNAL`, codes you shouldn't see in practice.

Note: if the vault is linked to a [LoanBroker](/objects/LoanBroker) with active loans, `AssetsTotal` isn't zero (it includes the lent-out capital), so deletion fails until the broker returns everything.

## Key fields

- **VaultID** — the `index` of the Vault object you want to delete.
- **MemoData** — reason for the deletion, up to 256 bytes in hex. Only with [LendingProtocolV1_1](/amendments/LendingProtocolV1_1).

## Common errors

- **temDISABLED** — the amendment isn't active on testnet (or you used `MemoData` without LendingProtocolV1_1).
- **temMALFORMED** — `VaultID` is all zeros, or `MemoData` is too long.
- **tecNO_ENTRY** — no vault exists with that `VaultID`.
- **tecNO_PERMISSION** — you're not the `Owner`.
- **tecHAS_OBLIGATIONS** — assets remain (`AssetsTotal`/`AssetsAvailable` ≠ 0) or shares are outstanding. Withdraw everything first.

## Example

```json
{
  "TransactionType": "VaultDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace the all-zero `VaultID` with your vault's real `index`; the all-zero one is rejected in `preflight`.

## Try it on testnet

1. Today: send the example from the builder and you'll get `temDISABLED`, because `SingleAssetVault` isn't enabled on the network.
2. Once the amendment is active: create a vault with [VaultCreate](/tx/VaultCreate), deposit with [VaultDeposit](/tx/VaultDeposit) and try deleting it. You'll see `tecHAS_OBLIGATIONS`.
3. Withdraw everything with [VaultWithdraw](/tx/VaultWithdraw) (for example specifying all your shares in `Amount`) and resend `VaultDelete`. Now you'll get `tesSUCCESS`.
4. Query `account_objects` with `type: "vault"`: the vault is gone. In `account_info` your `OwnerCount` has dropped by 2, and `ledger_entry` on the old pseudo-account returns `entryNotFound`.

## Related

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [VaultCreate](/tx/VaultCreate), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback)
- [LoanBrokerDelete](/tx/LoanBrokerDelete)
- [SingleAssetVault](/amendments/SingleAssetVault), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1)
