---
title: VaultCreate
summary: Creates a single-asset vault (XRP, IOU or MPT) with its pseudo-account and its shares issued as an MPT.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultcreate
xls: XLS-0065
amendment: SingleAssetVault
level: advanced
---

## What it does

**Notice: the [SingleAssetVault](/amendments/SingleAssetVault) amendment is NOT active on testnet.** The type exists in the server's definitions (rippled 3.4.0-rc6), but any `VaultCreate` you send today is rejected with `temDISABLED`. What follows describes the behavior of the code that will activate once the amendment is voted in.

`VaultCreate` creates a [Vault](/objects/Vault): an on-chain container that holds a single asset (XRP, an issued token, or an MPT) and distributes its value among depositors via *shares*. Think of an investment fund: you contribute assets and receive proportional shares; when you withdraw, you hand back shares and receive assets at the fund's current exchange rate.

The transaction creates three things at once. First, the `Vault` object in your account's directory. Second, a **pseudo-account** (an `AccountRoot` with no keys, with a `VaultID` field pointing to the vault) that actually custodies the assets. Third, an [MPTokenIssuance](/objects/MPTokenIssuance) issued by that pseudo-account: these are the shares. In addition, the owner receives an empty `MPToken` of those shares so they can deposit without any prior steps.

## When to use it

- Offering a yield product: depositors put in an asset and a [LoanBroker](/objects/LoanBroker) from the lending protocol (XLS-66) lends it out.
- Pooling funds from several participants under a single asset with proportional accounting and no human custodian.
- Private funds: with `tfVaultPrivate` and a `DomainID`, only accounts with credentials from the [PermissionedDomain](/objects/PermissionedDomain) can participate.

## How it works inside

`VaultCreate::checkExtraFeatures` requires [MPTokensV1](/amendments/MPTokensV1) (the shares are MPTs), [PermissionedDomains](/amendments/PermissionedDomains) if you use `DomainID`, and [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) if you use `VaultKind`, `SubscriptionDate` or `RedemptionDate`.

`VaultCreate::preflight` (static validation) returns `temMALFORMED` if: `Data` exceeds 256 bytes; `WithdrawalPolicy` isn't `1` (the only existing strategy, `vaultStrategyFirstComeFirstServe`); `DomainID` is zero or is specified without `tfVaultPrivate`; `AssetsMaximum` is negative; `MPTokenMetadata` is empty or exceeds 1024 bytes; `Scale` is specified for XRP or MPT (it only applies to IOU) or exceeds 18; or the combination of `VaultKind` with dates is inconsistent (a *closed-ended* vault needs both dates at least 180 seconds apart; an open one allows neither).

`VaultCreate::preclaim` (against the ledger): checks with `canAddHolding` that the pseudo-account will be able to hold the asset; rejects with `tecWRONG_ASSET` assets issued by another pseudo-account (shares of another vault or an AMM's LP tokens), because they could never be recovered via clawback; returns `tecFROZEN` (IOU) or `tecLOCKED` (MPT) if the asset is frozen for you; `tecOBJECT_NOT_FOUND` if the `DomainID` doesn't exist; `terADDRESS_COLLISION` if a free pseudo-account address can't be derived; and `tecEXPIRED` if the dates of a closed vault have already passed.

`VaultCreate::doApply`: links the `Vault` into your directory, **raises your OwnerCount by 2** (Vault + pseudo-account) and checks the reserve (`tecINSUFFICIENT_RESERVE`). It creates the pseudo-account and adds it an empty holding of the asset (trust line if IOU, MPToken if MPT). It then creates the share issuance with `MPTokenIssuanceCreate::create`: flags `lsfMPTCanEscrow | lsfMPTCanTrade | lsfMPTCanTransfer` unless you use `tfVaultShareNonTransferable`, and `lsfMPTRequireAuth` if the vault is private; `AssetScale` is 0 for XRP/MPT and `Scale` (default 6) for IOU; the `DomainID` is stored on the share issuance, not on the Vault. With [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), the issuance references the pseudo-account's holding via `ReferenceHolding`. Finally it fills in the Vault (`AssetsTotal`, `AssetsAvailable` and `LossUnrealized` at 0, `Owner`, `Account` = pseudo-account, `ShareMPTID`), authorizes an `MPToken` of shares for you and, if it's private, marks you as an authorized holder.

## Key fields

- **Asset** — the only asset the vault accepts: `{currency: "XRP"}`, `{currency, issuer}` or `{mpt_issuance_id}`. It can't be issued by a pseudo-account.
- **AssetsMaximum** — cap on `AssetsTotal`. `0` (default) means no limit; deposits that would exceed it fail with `tecLIMIT_EXCEEDED`.
- **Scale** — IOU only: the decimals used to compute shares (default 6, maximum 18). On the first deposit, shares = assets × 10^Scale, truncated.
- **DomainID** — permissioned domain whose credentials depositors need. Requires `tfVaultPrivate`.
- **WithdrawalPolicy** — only accepts `1` (first come, first served). If omitted, that value is stored.
- **MPTokenMetadata** — metadata (hex) for the share issuance.
- **Data** — up to 256 arbitrary bytes (hex) stored on the Vault.
- **VaultKind / SubscriptionDate / RedemptionDate** — closed-ended vaults from the lending protocol v1.1; they require that amendment.

## Flags

- **tfVaultPrivate** (0x00010000) — the vault is private: shares are issued with `lsfMPTRequireAuth`, and only the owner and accounts meeting the `DomainID` can deposit. It can't be made public later.
- **tfVaultShareNonTransferable** (0x00020000) — the shares don't carry `lsfMPTCanTransfer`, `CanTrade` or `CanEscrow`: they can only be deposited and withdrawn.

## Common errors

- **temDISABLED** — the amendment isn't active on the network. Today it's the only possible result on testnet.
- **temMALFORMED** — `DomainID` without `tfVaultPrivate`, `Scale` on an XRP/MPT vault, `WithdrawalPolicy` other than 1, or `Data` too long.
- **tecWRONG_ASSET** — the asset is issued by a pseudo-account (shares of another vault, an AMM's LP tokens).
- **tecFROZEN / tecLOCKED** — the issuer has frozen (IOU) or locked (MPT) that asset for you.
- **tecOBJECT_NOT_FOUND** — the `DomainID` doesn't exist on the ledger.
- **tecINSUFFICIENT_RESERVE** — you need reserve for two new objects (2 × 0.2 XRP on testnet) in addition to the base reserve.

## Example

```json
{
  "TransactionType": "VaultCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "AssetsMaximum": "1000000000",
  "Data": "7B7D",
  "Flags": 0
}
```

`AssetsMaximum` is in drops because the asset is XRP (1,000 XRP). `Data` is `{}` in hex.

## Try it on testnet

1. Open the builder with the example above and sign it with your account.
2. Today the result will be `temDISABLED`: `SingleAssetVault` shows as `supported` but not `enabled` on testnet. The transaction isn't included in any ledger and doesn't consume a fee.
3. Once the amendment is active, the expected flow is: `tesSUCCESS`; in `account_objects` with `type: "vault"` you'll see the object with `Owner` = your account and `Account` = the pseudo-account; the tx metadata will show three created nodes (`Vault`, `AccountRoot` and `MPTokenIssuance`) plus your shares `MPToken`; and your `OwnerCount` will have increased by 2.
4. Save the Vault's `index`: it's the `VaultID` needed by [VaultDeposit](/tx/VaultDeposit), [VaultSet](/tx/VaultSet) and [VaultDelete](/tx/VaultDelete).

## Related

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
- [VaultSet](/tx/VaultSet), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [LoanBrokerSet](/tx/LoanBrokerSet) (uses the vault as a liquidity source)
- [SingleAssetVault](/amendments/SingleAssetVault), [MPTokensV1](/amendments/MPTokensV1), [PermissionedDomains](/amendments/PermissionedDomains), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1)
