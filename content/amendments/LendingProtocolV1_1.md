---
title: LendingProtocolV1_1
summary: Activates the concrete transactions of the XRPL lending protocol, LoanBroker and Loan, on the foundation laid by LendingProtocol and SingleAssetVault.
xrplDocs: https://xrpl.org/resources/known-amendments#lendingprotocolv1_1
---

## What changes

While [LendingProtocol](/amendments/LendingProtocol) only prepared the internal groundwork (rounding and invariants), LendingProtocolV1_1 is the amendment that actually enables the lending transactions. With it, any account can create a `LoanBroker` on top of an existing [Vault](/objects/Vault): the LoanBroker is the entity that manages loans granted using that vault's liquidity and needs its own capital buffer, the "First Loss Capital", which its operator deposits and which absorbs losses first if a loan defaults.

On top of an already-created LoanBroker, the `LoanSet` transaction creates (or updates) a concrete `Loan`: a loan with its principal, interest terms, and repayment schedule against the underlying vault's liquidity. `LoanDelete` closes a loan that has been paid off. The broker's operator manages its capital buffer with `LoanBrokerCoverDeposit`, `LoanBrokerCoverWithdraw`, and `LoanBrokerCoverClawback` (the latter allows the asset's issuer to recover capital from the buffer, just like a regular [Clawback](/tx/Clawback)), and can withdraw the entire broker with `LoanBrokerDelete` once it has no outstanding loans or capital left.

## Affected transactions and objects

- New: `LoanBrokerSet`, `LoanBrokerDelete`, `LoanBrokerCoverDeposit`, `LoanBrokerCoverWithdraw`, `LoanBrokerCoverClawback`, `LoanSet`, and `LoanDelete`.
- New objects: `LoanBroker` and `Loan`.
- Related: [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit), and [VaultWithdraw](/tx/VaultWithdraw), which provide the liquidity the LoanBroker lends out; it can also use [Credential](/objects/Credential) and [PermissionedDomains](/amendments/PermissionedDomains) to restrict who can take out a loan.

## Status and context

This is the first functional version of XRPL's native lending protocol: it brings a collateralized credit mechanism with default management down to the base ledger layer, something previously reserved for lending protocols built on EVM or sidechains. `LendingProtocolV1_2`, still under development, is the next planned iteration on this design.
