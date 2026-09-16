---
title: VaultSet
summary: Modifies the mutable fields of an existing vault: asset cap, data, and permissioned domain.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultset
xls: XLS-0065
amendment: SingleAssetVault
level: intermediate
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** Any `VaultSet` you send today fails with `temDISABLED`. This page describes the code that will activate once the amendment is voted in.

`VaultSet` is the maintenance transaction for a [Vault](/objects/Vault). Only the vault's `Owner` can send it, and it only changes three things: the `AssetsMaximum` cap, the free-form `Data` field, and, in private vaults, the `DomainID` that decides who can participate. Everything else (asset, withdrawal policy, scale, whether it's private or not) is fixed in [VaultCreate](/tx/VaultCreate) and can't be touched.

An important detail: `DomainID` doesn't live on the Vault object but on the shares' [MPTokenIssuance](/objects/MPTokenIssuance). `VaultSet` updates that issuance (and also flags the Vault as modified so that invariants can verify it).

## When to use it

- Raising or lowering the capital limit the vault accepts, based on demand.
- Changing the permissioned domain of a private vault (for example, migrating to a new credential issuer), or removing it by sending an all-zero `DomainID`.
- Updating the descriptive `Data` (up to 256 bytes) seen by integrators.

## How it works inside

`VaultSet::checkExtraFeatures` requires [PermissionedDomains](/amendments/PermissionedDomains) if you send `DomainID`.

`VaultSet::preflight` (static validation) returns `temMALFORMED` if `VaultID` is zero, if `Data` is empty or exceeds 256 bytes, if `AssetsMaximum` is negative, or if **you don't send any** of the three mutable fields (a transaction that changes nothing isn't valid).

`VaultSet::preclaim` (against the ledger): looks up the Vault (`tecNO_ENTRY` if it doesn't exist) and checks that `Account` is its `Owner` (`tecNO_PERMISSION` if not). If you send `DomainID`, it requires the Vault to have `lsfVaultPrivate` (`tecNO_PERMISSION` otherwise: there's no way to convert a public vault into a private one) and, if `DomainID` is nonzero, that the [PermissionedDomain](/objects/PermissionedDomain) exists (`tecOBJECT_NOT_FOUND`).

`VaultSet::doApply`: copies `Data` if provided. If `AssetsMaximum` is provided and nonzero, it checks that it isn't lower than the current `AssetsTotal` (`tecLIMIT_EXCEEDED`); in other words, you can't set a cap below what's already deposited, though you can remove the cap with `0`. If `DomainID` is provided: a nonzero value is written to the share issuance (`sfDomainID`), and a zero value removes it from the issuance, leaving the private vault accessible only to the owner (the `lsfMPTRequireAuth` flag remains set, and `checkVaultDomain` returns `tecNO_AUTH` with no domain).

## Key fields

- **VaultID** — the Vault object's `index` (obtained from `VaultCreate`'s metadata or from `account_objects` with `type: "vault"`).
- **AssetsMaximum** — new cap on `AssetsTotal`. `0` = no limit. A positive value lower than the current total fails.
- **DomainID** — private vaults only. An all-zero 32-byte hash removes the current domain.
- **Data** — up to 256 bytes in hex; can't be sent empty.

## Common errors

- **temDISABLED** — the amendment isn't active on testnet; today it's the only possible result.
- **temMALFORMED** — you didn't include any field to modify, `VaultID` is all zeros, or `Data` is empty/too long.
- **tecNO_ENTRY** — no Vault exists with that `VaultID`.
- **tecNO_PERMISSION** — you're not the `Owner`, or you're trying to set `DomainID` on a vault that wasn't created with `tfVaultPrivate`.
- **tecOBJECT_NOT_FOUND** — the specified `DomainID` doesn't exist.
- **tecLIMIT_EXCEEDED** — `AssetsMaximum` is positive and lower than the current `AssetsTotal`.

## Example

```json
{
  "TransactionType": "VaultSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "AssetsMaximum": "2000000000"
}
```

Replace the all-zero `VaultID` with your vault's real `index` (the all-zero one fails in `preflight` with `temMALFORMED`). Since it's an XRP vault, `AssetsMaximum` is expressed in drops (2,000 XRP).

## Try it on testnet

1. Today: send the example from the builder and you'll see `temDISABLED`, because `SingleAssetVault` isn't enabled. No fee or Sequence is consumed.
2. Once the amendment is active: first create a vault with [VaultCreate](/tx/VaultCreate) and copy its `index`.
3. Send `VaultSet` with that `VaultID` and a larger `AssetsMaximum`. Query `ledger_entry` with `{"vault": "<VaultID>"}` or `account_objects` with `type: "vault"`: you'll see the new `AssetsMaximum`.
4. Try setting a cap lower than `AssetsTotal` after a deposit: you'll get `tecLIMIT_EXCEEDED`.
5. If the vault is private, change the `DomainID` and verify with `ledger_entry` on the `ShareMPTID` (type `mpt_issuance`) that the `DomainID` field has changed on the share issuance, not on the Vault.

## Related

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
- [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete)
- [PermissionedDomainSet](/tx/PermissionedDomainSet)
- [SingleAssetVault](/amendments/SingleAssetVault), [PermissionedDomains](/amendments/PermissionedDomains)
