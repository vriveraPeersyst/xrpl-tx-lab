---
title: Clawback
summary: Allows an issuer to claw back issued tokens from the accounts holding them, if the issuer enabled the option before issuing.
xls: XLS-0039
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0039-clawback
xrplDocs: https://xrpl.org/resources/known-amendments#clawback
introducedIn: 1.12.0
---

## What changes

Adds the `Clawback` transaction and the account flag `asfAllowTrustLineClawback` (`lsfAllowTrustLineClawback` in `AccountRoot`). An issuer can only enable that flag while it has no trust lines at all, i.e. before issuing anything; once enabled it cannot be disabled. With it, the issuer can withdraw up to the full balance of a token from any holder by specifying the amount in `Amount` and, in the `issuer` field of the amount, the holder's account.

The flag is incompatible with `asfNoFreeze`: if you have given up the ability to freeze, you cannot claw back, and vice versa. `Clawback` does not use the payment engine: it adjusts the trust line directly and does not generate offers or crossings.

## Affected transactions and objects

- New: [Clawback](/tx/Clawback).
- Modified: [AccountSet](/tx/AccountSet) supports `asfAllowTrustLineClawback`.
- Objects: [AccountRoot](/objects/AccountRoot) (new flag) and [RippleState](/objects/RippleState) (adjusted balance).

## Status and context

Issuers of stablecoins and regulated assets need to be able to reverse funds sent to sanctioned or stolen accounts in order to comply with regulations. Before this amendment, the XRPL only offered *freeze*, which immobilizes but does not recover funds. XLS-39 designed it as an explicit, irreversible opt-in by the issuer, so that anyone holding a token can know in advance whether the issuer reserves that power.

Later extensions: [MPTokensV1](/amendments/MPTokensV1) allows claiming back MPTs with the same transaction, [AMMClawback](/amendments/AMMClawback) covers tokens deposited in pools, and [SingleAssetVault](/amendments/SingleAssetVault) adds `VaultClawback`. This amendment is retired in rippled and is part of the base protocol.
