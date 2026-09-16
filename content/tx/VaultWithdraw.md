---
title: VaultWithdraw
summary: Returns shares to the vault and receives the underlying asset in return, to your own account or another destination.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultwithdraw
xls: XLS-0065
amendment: SingleAssetVault
level: advanced
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** Any `VaultWithdraw` you send today fails with `temDISABLED`. This page describes the code that will activate once the amendment is voted in.

`VaultWithdraw` is the reverse operation of [VaultDeposit](/tx/VaultDeposit): you burn shares and the [Vault](/objects/Vault)'s pseudo-account pays you the equivalent asset. You can express `Amount` in two ways: in the **asset** (I want 1 XRP; the transactor computes how many shares to burn) or in **shares** (I want to redeem 500 shares; the transactor computes how much asset you receive). The exchange rate is always the vault's current one: `AssetsTotal` (minus `LossUnrealized`) divided by the shares outstanding.

The payment can go to your own account or to a `Destination`. Withdrawing to yourself is never blocked by losing access to a private vault: if you have shares, it's because you were authorized, and that entitles you to recover your funds.

## When to use it

- Fully or partially exiting a lending fund and collecting the accrued yield.
- Paying a third party directly with assets you hold in a vault, without routing through your own account.
- Returning a frozen asset to the issuer (the issuer is always a valid destination).

## How it works inside

`VaultWithdraw::checkExtraFeatures`: using `CredentialIDs` requires [Credentials](/amendments/Credentials) and [fixCleanup3_4_0](/amendments/fixCleanup3_4_0).

`VaultWithdraw::preflight` (static validation): `temMALFORMED` if `VaultID` or `Destination` are zero; `temBAD_AMOUNT` if `Amount` ≤ 0; plus the format checks from `credentials::checkFields`.

`VaultWithdraw::preclaim` (against the ledger):
- Looks up the Vault (`tecNO_ENTRY`). With [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), a closed-ended vault in its investment phase returns `tecTOO_SOON`.
- `Amount` must be the vault's asset or its share (`tecWRONG_ASSET`).
- `canTransfer` verifies that the asset can move from the pseudo-account to the destination. With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), `lsfMPTCanTransfer` is ignored: withdrawing is a recovery path, and an issuer can't trap other people's funds.
- Validates the supplied credentials and, with fixCleanup3_4_0, rejects destinations that are pseudo-accounts (`tecPSEUDO_ACCOUNT`).
- `canWithdraw` (`View.cpp`) applies the same rules to the destination as a payment: `DestinationTag` mandatory if required (`tecDST_TAG_NEEDED`), and `lsfDepositAuth` satisfied via preauthorization or credentials (`tecNO_PERMISSION`). With [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), if `Amount` is in shares it's converted to assets first to perform this check.
- `requireAuth` on the destination: if you withdraw to another account, it must already have a trust line or MPToken for the asset (`StrongAuth`); if you withdraw to yourself, it's created in `doApply`.
- Private vault and destination ≠ you and ≠ issuer: with fixCleanup3_4_0, both you and the destination must satisfy the `DomainID`.
- With [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), `checkWithdrawFreeze` checks freezes on the pseudo-account, you, and the destination.

`VaultWithdraw::doApply`: if `Amount` is in the asset, `assetsToSharesWithdraw` computes the shares (truncated with fixCleanup3_4_0, so you never get charged more shares than needed); if it comes out to 0, `tecPRECISION_LOSS`. If `Amount` is in shares, `sharesToAssetsWithdraw` = `AssetsTotal` × shares / `OutstandingAmount`. If you're the sole shareholder (`isSoleShareholder`), `LossUnrealized` isn't deducted: you also take the future value. It checks that you have the shares (`tecINSUFFICIENT_FUNDS`) and that `AssetsAvailable` covers the payment (`tecINSUFFICIENT_FUNDS`: capital lent out by a LoanBroker isn't available). If you burn **all** the outstanding shares, the payment is set to the entirety of `AssetsAvailable` and both totals go to zero, leaving no dust. It moves the shares from you to the pseudo-account, deletes your shares `MPToken` if it's left empty (unless you're the owner), and `doWithdraw` pays the destination, creating your trust line/MPToken if needed.

## Key fields

- **VaultID** — the Vault's `index`.
- **Amount** — in the vault's asset (fixed amount of assets, variable shares) or in shares as `{mpt_issuance_id: <ShareMPTID>, value}` (fixed shares, variable assets).
- **Destination** — the account receiving the asset. If omitted, it's you. It must be able to receive it (trust line/MPToken, DepositAuth, tag).
- **DestinationTag** — mandatory if the destination has `lsfRequireDestTag`.
- **CredentialIDs** — credentials to satisfy the destination's `lsfDepositAuth`.

## Common errors

- **temDISABLED** — the amendment isn't active on testnet; today it's the only possible result.
- **tecNO_ENTRY** — the `VaultID` doesn't exist.
- **tecWRONG_ASSET** — `Amount` is neither the asset nor the share of that vault.
- **tecINSUFFICIENT_FUNDS** — you don't have that many shares, or the vault doesn't have available liquidity (`AssetsAvailable` < payment) because the capital is on loan.
- **tecPRECISION_LOSS** — the amount is so small it amounts to 0 shares or 0 assets.
- **tecNO_AUTH** — the destination has no trust line/MPToken for the asset, or doesn't satisfy a private vault's domain.
- **tecNO_PERMISSION** — the destination requires DepositAuth and you aren't preauthorized.
- **tecPSEUDO_ACCOUNT** — the destination is a pseudo-account (AMM, another vault).

## Example

```json
{
  "TransactionType": "VaultWithdraw",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Replace the all-zero `VaultID` with your vault's real `index`. `Amount` is in drops (1 XRP) since it's an XRP vault; the transactor will burn the equivalent shares.

## Try it on testnet

1. Today: send the example from the builder and you'll get `temDISABLED`, because `SingleAssetVault` isn't enabled on the network.
2. Once the amendment is active: create an XRP vault with [VaultCreate](/tx/VaultCreate) and deposit 5 XRP with [VaultDeposit](/tx/VaultDeposit).
3. Withdraw 1 XRP with the example. In the metadata you'll see your shares `MPToken` reduced by 1,000,000 and the `Vault`'s `AssetsTotal`/`AssetsAvailable` reduced by 1,000,000 drops.
4. Repeat with `Amount` in shares: `{"mpt_issuance_id": "<ShareMPTID>", "value": "4000000"}`. By burning all outstanding shares, the payment will be exactly the remaining `AssetsAvailable`, and both totals will end at 0.
5. Try a `Destination` with another account that has `lsfRequireDestTag` without setting `DestinationTag`: `tecDST_TAG_NEEDED`.

## Related

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [DepositPreauth](/objects/DepositPreauth)
- [VaultDeposit](/tx/VaultDeposit), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [DepositPreauth](/tx/DepositPreauth), [CredentialCreate](/tx/CredentialCreate)
- [SingleAssetVault](/amendments/SingleAssetVault), [Credentials](/amendments/Credentials), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
