---
title: fixCleanup3_3_0
summary: Groups the set of behavior fixes accumulated for rippled version 3.3.0 into a single amendment.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_3_0
introducedIn: 3.3.0
---

## What changes

Continues the series started by [fixCleanup3_2_0](/amendments/fixCleanup3_2_0): a single amendment simultaneously activates several unrelated fixes introduced for rippled 3.3.0. Among them: a new precision scale for `Number` (`MantissaScale::Large330`, which replaces `Large320`), blocking a pseudo-account (for example, that of a `Vault` or a `LoanBroker`) from signing transactions in `Transactor::checkSign`, and additional adjustments to `AMMWithdraw`, `AMMDeposit`, `AMMClawback`, `VaultDeposit`/`VaultWithdraw`, `CheckCash`/`CheckCancel`, `CredentialCreate`, `DepositPreauth`, and payment routing (`BookStep`, `OfferStream`).

## Affected transactions and objects

[AMMWithdraw](/tx/AMMWithdraw), [AMMDeposit](/tx/AMMDeposit), [AMMClawback](/tx/AMMClawback), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel), [CredentialCreate](/tx/CredentialCreate), [DepositPreauth](/tx/DepositPreauth), and pseudo-account objects such as [Vault](/objects/Vault) and `LoanBroker`.

## Status and context

Like the rest of the `fixCleanupX_Y_Z` series, this is not a single functional proposal but the mechanism by which rippled packages, per version, all the behavior bug fixes that would otherwise each require a separate votable amendment. The code checks `rules.enabled(fixCleanup3_3_0)` independently at each of these points, so activating the amendment activates the entire batch of 3.3.0 fixes at once.
