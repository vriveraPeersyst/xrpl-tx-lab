---
title: fixFrozenLPTokenTransfer
summary: Prevents moving an AMM's LP tokens when any of the underlying assets is frozen by its issuer.
xrplDocs: https://xrpl.org/resources/known-amendments#fixfrozenlptokentransfer
---

## What changes

An [AMM](/objects/AMM)'s LP tokens are represented as a special trustline between the AMM account and each liquidity provider. Before this fix, checking whether that trustline was frozen only looked at the freeze flags of the LP token line itself, not at whether either of the two assets that make up the pool (`Asset`/`Asset2`) was frozen by its issuer. This allowed transferring or withdrawing LP tokens from a pool whose underlying assets were frozen, bypassing the purpose of the freeze. With `fixFrozenLPTokenTransfer` active, `accountHolds` and the payment steps (`StepChecks`) also check the freeze status of the AMM's underlying assets before allowing the LP token to be moved, and the distribution of funds to an account that turns out to be an AMM (`sfAMMID` present) also validates the status of the associated pool.

## Affected transactions and objects

- [AMM](/objects/AMM): its LP tokens become subject to the freeze of the assets they represent.
- [TrustSet](/tx/TrustSet) (freeze), [Payment](/tx/Payment), and any transaction that moves LP tokens as part of a payment or a `Clawback`.

## Status and context

An issuer freezes a line to block the movement of its tokens, for example for regulatory compliance. If that freeze did not propagate to the LP token of an AMM containing that asset, the freeze could be bypassed simply by depositing into the pool and moving the LP token instead. The fix closes that evasion path by ensuring that freezing an asset also immobilizes the LP tokens of any AMM that contains it.
