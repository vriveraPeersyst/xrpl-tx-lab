---
title: VaultDeposit
summary: Deposits a vault's asset and receives shares (MPT) proportional to the value contributed in return.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultdeposit
xls: XLS-0065
amendment: SingleAssetVault
level: intermediate
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** Any `VaultDeposit` you send today fails with `temDISABLED`. This page describes the code that will activate once the amendment is voted in.

`VaultDeposit` transfers an amount of the vault's asset from your account to the [Vault](/objects/Vault)'s pseudo-account and, in exchange, the pseudo-account hands you shares: an [MPToken](/objects/MPToken) of the `ShareMPTID` issuance. The shares represent your proportional stake in the vault's total value. When the fund gains (for example, loan interest), each share is worth more assets; when it loses, less.

If this is your first deposit, the transaction automatically creates the shares `MPToken` in your account (consuming 1 unit of owner reserve). In private vaults, you also need to satisfy the permissioned domain unless you're the owner.

## When to use it

- Contributing liquidity to a lending fund (XLS-66) and earning yield via the shares.
- Participating in a private vault for which you hold credentials from the [PermissionedDomain](/objects/PermissionedDomain).
- Any scenario where you want to convert an asset into a fungible, transferable stake (if the owner didn't set `tfVaultShareNonTransferable`).

## How it works inside

`VaultDeposit::preflight` (static validation): `temMALFORMED` if `VaultID` is zero; `temBAD_AMOUNT` if `Amount` is zero or negative.

`VaultDeposit::preclaim` (against the ledger):
- Looks up the Vault (`tecNO_ENTRY`). With [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), a closed-ended vault in its investment or redemption phase rejects deposits with `tecEXPIRED`.
- `Amount` must exactly be the vault's `Asset` (`tecWRONG_ASSET`); you can't deposit shares.
- `canTransfer` checks that the asset can move from you to the pseudo-account (for MPT, `lsfMPTCanTransfer`; for IOU, rippling and freeze).
- With [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) (active on testnet), `checkDepositFreeze` rejects if the asset is frozen globally or for you (`tecFROZEN` for IOU, `tecLOCKED` for MPT).
- If the vault is private and you're not the owner, `checkVaultDomain` verifies that you hold an accepted credential for the share issuance's `DomainID`; without a domain, it returns `tecNO_AUTH`. An expired credential is tolerated here because `doApply` deletes it.
- `requireAuth`: if the asset is an MPT you already need to have the MPToken (and be authorized if the issuance requires it).
- With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), the amount is rounded down to `AssetsTotal`'s scale; if it comes out to zero, `tecPRECISION_LOSS`. It then checks that your balance covers the amount (`tecINSUFFICIENT_FUNDS`).

`VaultDeposit::doApply`: if you're the owner or the vault is public, it creates your shares `MPToken` if it doesn't exist; if it's private and you're not the owner, `enforceMPTokenAuthorization` authorizes you against the domain. It then computes the shares with `assetsToSharesDeposit` (`VaultHelpers.cpp`): if `AssetsTotal` is 0, shares = amount × 10^`Scale`, truncated; otherwise, shares = `OutstandingAmount` × amount / `AssetsTotal`, truncated to an integer. If that comes out to 0 shares, `tecPRECISION_LOSS`. It converts those shares back to assets to charge you only what they're actually worth (never more than what you offered). It adds the result to `AssetsTotal` and `AssetsAvailable`, and if `AssetsMaximum` ≠ 0 and the new total exceeds it, `tecLIMIT_EXCEEDED`. Finally it moves the assets from you to the pseudo-account and the shares from the pseudo-account to you, both without a transfer fee (`WaiveTransferFee::Yes`). A numeric overflow with large scales returns `tecPATH_DRY`.

## Key fields

- **VaultID** — the Vault object's `index`.
- **Amount** — amount of the vault's asset: drops if XRP, `{currency, issuer, value}` if IOU, `{mpt_issuance_id, value}` if MPT. What's actually charged may be slightly less due to truncation to whole shares.

## Common errors

- **temDISABLED** — the amendment isn't active on testnet; today it's the only possible result.
- **tecNO_ENTRY** — no vault exists with that `VaultID`.
- **tecWRONG_ASSET** — `Amount` isn't the vault's asset (different currency or issuer).
- **tecINSUFFICIENT_FUNDS** — your balance of the asset is less than the amount.
- **tecNO_AUTH / tecEXPIRED** — the vault is private and you don't have a valid domain credential (or the domain isn't configured).
- **tecLIMIT_EXCEEDED** — the deposit would exceed `AssetsMaximum`.
- **tecPRECISION_LOSS** — the amount is so small it doesn't generate even one whole share.
- **tecFROZEN / tecLOCKED** — the issuer has frozen the asset.

## Example

```json
{
  "TransactionType": "VaultDeposit",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "5000000"
}
```

Replace the all-zero `VaultID` with the vault's `index` (the all-zero one fails with `temMALFORMED`). `Amount` is in drops because the asset is XRP: 5 XRP.

## Try it on testnet

1. Today: send the example from the builder and you'll get `temDISABLED`, because `SingleAssetVault` isn't enabled on the network.
2. Once the amendment is active: create an XRP vault with [VaultCreate](/tx/VaultCreate) and use its `index` as `VaultID`.
3. Send the deposit. In the metadata you'll see the `Vault` modified (`AssetsTotal` and `AssetsAvailable` +5,000,000), the pseudo-account with +5 XRP, and an `MPToken` created or modified in your account with `MPTAmount` = 5,000,000 shares (scale 0 since it's XRP and the first deposit).
4. Query `account_objects` with `type: "mptoken"`: your shares balance. `ledger_entry` with `{"vault": "<VaultID>"}` shows the totals.
5. Make a second deposit from another account and verify it receives shares in the same proportion.

## Related

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [MPTokenIssuance](/objects/MPTokenIssuance)
- [VaultCreate](/tx/VaultCreate), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback)
- [CredentialAccept](/tx/CredentialAccept), [PermissionedDomainSet](/tx/PermissionedDomainSet)
- [SingleAssetVault](/amendments/SingleAssetVault), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
