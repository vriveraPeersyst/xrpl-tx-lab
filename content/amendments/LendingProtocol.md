---
title: LendingProtocol
summary: Lays the internal groundwork for the XRPL lending protocol (rounding and invariants shared with the Single Asset Vault) on which the Loan and LoanBroker transactions are built.
xrplDocs: https://xrpl.org/resources/known-amendments#lendingprotocol
---

## What changes

LendingProtocol is the first piece of XRPL's native lending protocol: a system in which a [Vault](/objects/Vault) (introduced by [SingleAssetVault](/amendments/SingleAssetVault)) acts as a liquidity source that a `LoanBroker` lends to third parties via `Loan` objects, charging interest that flows back to the vault's depositors.

This particular amendment does not yet enable the `Loan`/`LoanBroker` transactions — that is done by [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) — but adjusts the internal behavior those transactions need to work correctly: rounding rules in `STAmount` and in the `AccountRoot`, `RippleState`, and MPT helpers that the vault and loans share, and several ledger invariants (checked in `InvariantCheck` and `MPTInvariant`) that start being applied in enforcement mode, not just detection mode, when the amendment is active.

## Affected transactions and objects

It does not introduce its own transactions or objects. It lays the groundwork for [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete), and for the transactions that do arrive with LendingProtocolV1_1, such as `LoanSet`, `LoanDelete`, `LoanBrokerSet`, and `LoanBrokerDelete`. It also interacts with [MPTokensV1](/amendments/MPTokensV1), since the asset deposited in a vault is typically represented as an MPT.

## Status and context

This is an infrastructure amendment: it introduces the rounding corrections and accounting invariants that an interest-bearing lending system needs in order not to lose or generate value due to precision errors, before exposing the transaction surface that an end user would use. It pairs with [SingleAssetVault](/amendments/SingleAssetVault) and is a prerequisite for [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), which adds the concrete lending transactions.
