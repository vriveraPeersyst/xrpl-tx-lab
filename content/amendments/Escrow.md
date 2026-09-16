---
title: Escrow
summary: Introduces XRP escrows conditioned on time or on a crypto-condition, with the EscrowCreate, EscrowFinish and EscrowCancel transactions.
xrplDocs: https://xrpl.org/resources/known-amendments#escrow
---

## What changes

This amendment adds the [Escrow](/objects/Escrow) object and the three transactions that manage it. [EscrowCreate](/tx/EscrowCreate) sets aside an amount of XRP from the sender and locks it until a condition is met: a minimum time (`FinishAfter`), a crypto-condition (`Condition`, verified with a `Fulfillment` at finish time), or both. It can also carry `CancelAfter`, after which anyone can cancel the escrow and return the funds to the creator.

[EscrowFinish](/tx/EscrowFinish) releases the XRP to the `Destination` set at creation, once `FinishAfter` has passed (if present) and, if there is a `Condition`, upon presenting a valid `Fulfillment` for it. [EscrowCancel](/tx/EscrowCancel) returns the XRP to the original creator, and is only available after `CancelAfter`. While the escrow is pending, the XRP does not count as the creator's available balance, but it does increase their `OwnerCount` and therefore their reserve.

## Affected transactions and objects

- New: [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish) and [EscrowCancel](/tx/EscrowCancel).
- New object: [Escrow](/objects/Escrow), linked in the owner directories of both the creator and the destination.
- [AccountRoot](/objects/AccountRoot): `OwnerCount` increases while the escrow exists.

## Status and context

It is one of the XRPL's foundational amendments for conditional payments: it allows building escrow deposits, scheduled deferred payments, or releases contingent on a third party presenting a cryptographic proof, all without intermediaries or smart contracts. It should not be confused with [TokenEscrow](/amendments/TokenEscrow), a later amendment that extends this same mechanism to issued tokens (IOUs) in addition to XRP. Being retired (`XRPL_RETIRE_FEATURE` in `features.macro`), its behavior has for years been the only one available on any active XRPL network.
