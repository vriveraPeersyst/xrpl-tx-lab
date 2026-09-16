---
title: TokenEscrow
summary: Allows an Escrow's Amount to be an IOU or MPT token, in addition to XRP.
xrplDocs: https://xrpl.org/resources/known-amendments#tokenescrow
---

## What changes

Until now, [EscrowCreate](/tx/EscrowCreate) only accepted XRP in the `Amount` field. With TokenEscrow, `Amount` can also be an issued IOU or an MPT: with `featureTokenEscrow` active, `EscrowCreate` checks whether the amount is non-native and, if so, handles it as an `STAmount` of type `Issue` or `MPTIssue` instead of rejecting it, and validates, for example, that an MPT does not exceed `kMaxMpTokenAmount` and that the amount is strictly positive. The trustlines or MPTokens involved must exist and be authorized just as in any other transfer of those token types; if the IOU issuer has `RequireAuth`, the same authorization checks apply as in a `Payment`.

`EscrowFinish` and `EscrowCancel` release or return the amount in the same asset type the escrow was created with, moving trustline or MPToken balance instead of XRP drops. The rest of the escrow mechanics (cryptographic condition, `CancelAfter`/`FinishAfter`, or the optional execution of a `FinishFunction` if `featureSmartEscrow` is active) remain unchanged: only the type of value that can be held is generalized.

This amendment depends on `fixTokenEscrowV1` to behave correctly in edge cases involving issuers with clawback or freeze enabled; without that fix, some IOU/MPT escrow scenarios can leave the state inconsistent.

## Affected transactions and objects

- [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish), and [EscrowCancel](/tx/EscrowCancel): `Amount` now supports IOU and MPT in addition to XRP.
- [Escrow](/objects/Escrow) object: the held amount can represent a token instead of XRP.
- Interacts with [TrustSet](/tx/TrustSet)/[RippleState](/objects/RippleState) and [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate)/[MPToken](/objects/MPToken) depending on the escrowed asset type.

## Status and context

Extends one of the protocol's oldest mechanisms, the conditional or time-locked escrow, to any token issued on the ledger (IOU) or MPT, not just XRP. This enables use cases such as payroll, project token vesting, or conditional payments in stablecoins issued on XRPL, which previously could only be built with native XRP or required an external contract.
