---
title: fixTokenEscrowV1
summary: Fixes the accounting of the issuer's locked amount when releasing an escrow of a token with TransferRate.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtokenescrowv1
---

## What changes

The TokenEscrow amendment allows locking issued tokens (IOU or MPT), not just XRP, in an [EscrowCreate](/tx/EscrowCreate). If the token's issuer has a `TransferRate` configured, the amount the recipient receives when the escrow finishes (`netAmount`, after deducting the transfer fee) is smaller than the gross amount originally locked (`grossAmount`).

Before this fix, unlocking the escrow via `unlockEscrowMPT` reduced the `LockedAmount` recorded on the token's issuance object using the same amount in both cases, implicitly assuming `netAmount == grossAmount`. That threw off the issuer's accounting whenever a `TransferRate` was involved: the amount actually locked (gross) did not match the amount subtracted when it was released (net). With fixTokenEscrowV1 enabled, the function no longer requires that equality and correctly adjusts the issuer's `LockedAmount` using the corresponding net amount.

## Affected transactions and objects

- [EscrowFinish](/tx/EscrowFinish): when releasing an escrow of a token with `TransferRate`, fixes how much is subtracted from the issuer's locked amount.
- Token issuance object (MPTokenIssuance): its `LockedAmount` field is correctly balanced after releasing the escrow.

## Status and context

This is a specific fix to TokenEscrow's internal accounting for tokens with a transfer fee; it does not introduce new user-facing behavior, but it prevents the issuer's locked amount from becoming unbalanced when the locked gross amount and the delivered net amount differ.
