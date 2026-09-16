---
title: VaultClawback
summary: Lets the issuer of the asset claw back funds deposited by a holder in a vault, or lets the owner burn orphaned shares.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultclawback
xls: XLS-0065
amendment: SingleAssetVault
level: advanced
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** Any `VaultClawback` you send today fails with `temDISABLED`. This page describes the code that will activate once the amendment is voted in.

`VaultClawback` extends token clawback to funds held in a [Vault](/objects/Vault). A holder who deposits an IOU or an MPT into a vault no longer has it in their account (the pseudo-account holds it), so a normal [Clawback](/tx/Clawback) doesn't reach it. With this transaction, the **issuer of the asset** burns the `Holder`'s shares and receives the equivalent asset back from the pseudo-account. XRP can never be clawed back.

It has a second, different use for the **vault's owner**: when the vault has run out of assets (`AssetsTotal` and `AssetsAvailable` at 0, for example after a total loss on loans) but shares still exist, the owner can burn all of a holder's shares in order to reach [VaultDelete](/tx/VaultDelete).

## When to use it

- Regulatory compliance: a stablecoin issuer must freeze/recover funds from an account even when they're inside a vault.
- MPT issuers with `lsfMPTCanClawback` who need to reverse a deposit.
- Cleanup by the owner: removing worthless shares from an empty vault before deleting it.

## How it works inside

`VaultClawback::preflight` (static validation): `temMALFORMED` if `VaultID` is zero or if `Amount` is XRP; `temBAD_AMOUNT` if `Amount` is negative. An `Amount` of zero is valid and means "all".

`VaultClawback::preclaim` (against the ledger):
- Looks up the Vault (`tecNO_ENTRY`) and its share issuance. With [fixCleanup3_4_0](/amendments/fixCleanup3_4_0), if `Holder` is a pseudo-account, `tecPSEUDO_ACCOUNT`.
- If you omit `Amount`, `clawbackAmount` infers it: if you're the vault's `Owner`, it means "shares"; if not, "the asset". Ambiguous case: if the asset's issuer is also the owner you must specify `Amount` (`tecWRONG_ASSET`).
- **Shares path** (`Amount` in shares, or implicit for the owner): only the `Owner` (`tecNO_PERMISSION`); only if shares are outstanding and `AssetsTotal` = `AssetsAvailable` = 0 (`tecNO_PERMISSION`); and if you specify a nonzero `Amount` it must be exactly the holder's full share balance (`tecLIMIT_EXCEEDED`).
- **Asset path** (`Amount` in the vault's asset): `tecNO_PERMISSION` if the asset is XRP, if you're not its issuer, or if `Holder` is yourself. For MPT, the issuance must have `lsfMPTCanClawback`; for IOU, your account must have `lsfAllowTrustLineClawback` and not `lsfNoFreeze` (in both cases `tecNO_PERMISSION` if not met).
- Any other asset: `tecWRONG_ASSET`.

`VaultClawback::doApply`: in the owner path, it burns the holder's entire share balance without moving assets. In the issuer path, `assetsToClawback` computes the pair (assets recovered, shares destroyed): with `Amount` = 0 it uses all of the holder's shares and converts them to assets with `sharesToAssetsWithdraw`; with a specific amount it converts assets → shares (truncating with fixCleanup3_4_0) and back to assets. The result is **capped at `AssetsAvailable`**: if part of the capital is lent out by a [LoanBroker](/objects/LoanBroker), you only recover what's in the till, and the shares are re-derived. If the holder is the sole shareholder, `LossUnrealized` isn't deducted. If the shares to be destroyed come out to 0, `tecPRECISION_LOSS`. It then subtracts what was recovered from `AssetsTotal` and `AssetsAvailable`, moves the holder's shares to the pseudo-account (deleting their `MPToken` if it's left empty and they're not the owner), and sends the assets from the pseudo-account to the issuer, always without a transfer fee. A numeric overflow produces `tecPATH_DRY`.

## Key fields

- **VaultID** — the Vault's `index`.
- **Holder** — the account whose shares are burned. Can't be the issuer or a pseudo-account.
- **Amount** — optional. In the vault's asset (issuer only): amount to recover, `0` or omitted = everything backed by the holder's shares, always capped at `AssetsAvailable`. In shares (owner only, empty vault): `0` or the holder's exact balance.

## Common errors

- **temDISABLED** — the amendment isn't active on testnet; today it's the only possible result.
- **temMALFORMED** — `Amount` is XRP or `VaultID` is all zeros.
- **tecNO_PERMISSION** — you're not the asset's issuer (or the asset is XRP); the issuer lacks `lsfAllowTrustLineClawback` / the MPT issuance lacks `lsfMPTCanClawback`; or you're trying to burn shares without being the owner or while assets remain in the vault.
- **tecWRONG_ASSET** — `Amount` in a different currency, or you're both issuer and owner and haven't specified `Amount`.
- **tecLIMIT_EXCEEDED** — as owner, the `Amount` in shares doesn't match the holder's total balance.
- **tecPRECISION_LOSS** — the holder has no shares, or the amount amounts to 0 shares.
- **tecPSEUDO_ACCOUNT** — `Holder` is a pseudo-account.

## Example

```json
{
  "TransactionType": "VaultClawback",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Holder": "rYYYY_OTHER_ACCOUNT"
}
```

Replace the all-zero `VaultID` with the real `index`. This example, without `Amount`, works either as the issuer of an IOU/MPT that is the vault's asset (recovers everything backed by the holder's shares) or, if you're the owner of an empty vault, burns all the holder's shares. For an XRP vault, clawback always fails.

## Try it on testnet

1. Today: send the example from the builder and you'll get `temDISABLED`, because `SingleAssetVault` isn't enabled on the network.
2. Once the amendment is active: from an issuing account, enable `asfAllowTrustLineClawback` with [AccountSet](/tx/AccountSet) (before issuing anything), issue a USD token to another account, and use that issuer to create a `VaultCreate` for `{currency: "USD", issuer: rXXXX_YOUR_ACCOUNT}`. Note: since you'll be both issuer and owner, you'll need to specify an explicit `Amount`.
3. Have the other account deposit USD with [VaultDeposit](/tx/VaultDeposit).
4. Send `VaultClawback` with `Holder` = that account and `Amount: {currency: "USD", issuer: rXXXX_YOUR_ACCOUNT, value: "0"}`. In the metadata you'll see the holder's shares `MPToken` deleted, the `Vault`'s `AssetsTotal` reduced, and the trust line between the pseudo-account and the issuer with a lower balance.
5. Try the same against an XRP vault: with `Amount` in drops it fails in `preflight` with `temMALFORMED`; without `Amount` and not being the owner, `preclaim` infers "the asset" and responds `tecNO_PERMISSION` because XRP has no issuer. In XRP vaults only the owner path exists (burning shares once no assets remain).

## Related

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [RippleState](/objects/RippleState)
- [Clawback](/tx/Clawback), [AMMClawback](/tx/AMMClawback), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete)
- [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [SingleAssetVault](/amendments/SingleAssetVault), [Clawback](/amendments/Clawback), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
