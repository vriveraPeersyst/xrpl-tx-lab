---
title: AMMClawback
summary: Allows tokens with clawback to be used in AMMs and adds AMMClawback so the issuer can recover tokens deposited in a pool.
xls: XLS-0073
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0073-amm-clawback
xrplDocs: https://xrpl.org/resources/known-amendments#ammclawback
introducedIn: 2.3.0
---

## What changes

Before this amendment, `AMMCreate` rejected any token whose issuer had `lsfAllowTrustLineClawback` enabled: since the pool is a keyless pseudo-account, the issuer had no way to recover the tokens once they were inside. AMMClawback removes that restriction and adds a dedicated transaction so the issuer can withdraw from the pool the tokens belonging to a specific liquidity provider.

The operation does not act on the raw pool: the issuer specifies the holder (`Holder`) and the asset, and the ledger burns that holder's LP tokens in the necessary proportion and returns to the issuer the corresponding share of its token. With the `tfClawTwoAssets` flag, an issuer who has issued both assets in the pool can recover both at once.

It also modifies `AMMDeposit` to prevent depositing frozen tokens (a trust line with freeze) into a pool.

## Affected transactions and objects

- New: [AMMClawback](/tx/AMMClawback).
- Modified: [AMMCreate](/tx/AMMCreate) accepts tokens with clawback enabled; [AMMDeposit](/tx/AMMDeposit) rejects frozen assets.
- Objects: [AMM](/objects/AMM) and the [RippleState](/objects/RippleState) lines between the issuer and the pool's pseudo-account.

## Status and context

[Clawback](/amendments/Clawback) was designed for regulated issuers (stablecoins, tokenized assets) that need to recover funds by court order or sanctions. However, it left a gap: simply depositing the token into an AMM was enough to put it out of the issuer's reach. XLS-73 closes that gap and, at the same time, allows those same issuers to provide liquidity in AMMs without giving up their compliance obligations.

A rounding error in the calculation of the recovered amount was later fixed with `fixAMMClawbackRounding`.
