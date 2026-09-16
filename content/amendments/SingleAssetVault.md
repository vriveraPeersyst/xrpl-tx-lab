---
title: SingleAssetVault
summary: Introduces the Vault object, a container for a single asset (XRP, IOU, or MPT) that issues tokenized shares to its depositors.
xls: XLS-0065
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0065-Vault
xrplDocs: https://xrpl.org/resources/known-amendments#singleassetvault
---

## What changes

Adds the `Vault` object (`ltVAULT`), managed by six new transactions: `VaultCreate`, `VaultSet`, `VaultDelete`, `VaultDeposit`, `VaultWithdraw`, and `VaultClawback`. A Vault holds a single `Asset` (XRP, an issued IOU, or an MPT) and tracks accounting in `AssetsTotal`, `AssetsAvailable`, `AssetsMaximum`, and `LossUnrealized`. In exchange for depositing into the Vault, the depositor receives "shares" represented as an MPToken over the Vault's own `ShareMPTID`: the fraction of the pool that corresponds to them, not a separate accounting promise.

`VaultCreate` sets the underlying asset, the `WithdrawalPolicy` (for example, strict FIFO or proportional), and optionally a `PermissionedDomainID` that restricts who may enter as a depositor. `VaultDeposit` mints shares when assets are deposited; `VaultWithdraw` burns them to withdraw the proportional asset amount, and may require `CredentialIDs` if the Vault lives within a permissioned domain. `VaultClawback` lets the issuer of the underlying asset recover funds from a specific depositor, just like `Clawback` on a normal IOU, but deducting from their shares. `VaultDelete` only works when the Vault is empty (`AssetsTotal` at zero).

The object has no `SharesTotal` field of its own: that data lives in the `OutstandingAmount` of the shares' own MPTIssuance, avoiding duplicated accounting between two ledger objects.

## Affected transactions and objects

- New: [VaultCreate](/tx/VaultCreate), [VaultSet](/tx/VaultSet), [VaultDelete](/tx/VaultDelete), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), and [VaultClawback](/tx/VaultClawback).
- New object: [Vault](/objects/Vault).
- Related: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) and [MPTokenAuthorize](/tx/MPTokenAuthorize) for the shares; [TrustSet](/tx/TrustSet) and [Clawback](/tx/Clawback) share code with the underlying asset's trustlines when it is an IOU.

## Status and context

SingleAssetVault is the base building block on which [LendingProtocol](/amendments/LendingProtocol) is built: a Vault pools the liquidity that a LoanBroker then lends out, and the Vault's shares serve as a tokenized, transferable receipt of the depositor's position. Outside the lending context, it also serves as a generic "single-asset pool with shares" primitive for any shared-treasury use case directly on the ledger, without needing an external contract.
