---
title: fixCleanup3_1_3
summary: "Umbrella" amendment that groups a batch of small bug fixes spread across several ledger subsystems into a single activation.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_1_3
introducedIn: 3.1.3
---

## What changes

Unlike other `fix*` amendments that correct a single specific bug, fixCleanup3_1_3 groups several small, independent fixes accumulated for rippled version 3.1.3 under a single amendment, instead of publishing a separate amendment for each one. Among the fixes it gates (`ctx.view.rules().enabled(fixCleanup3_1_3)` in the code):

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): previously, accepting an expired offer failed in `preclaim` with `tecEXPIRED`; with the fix, the expired offer is detected and deleted from the ledger within the transaction itself instead of just being rejected.
- MPToken: adjusts how the `MaximumAmount` is aggregated and how the `LockedAmount` is checked in transfers.
- [PermissionedDEX](/objects/Offer) (hybrid offers): the malformed-offer check now also rejects a domain with size `0`, not only one that is missing or exceeds 1.
- Vault ([VaultClawback](/tx/VaultClawback)): removes an incorrect early return when the amount to claw back is zero.
- Lending ([LoanPay](/tx/LoanPay)): limits the number of applicable fee increments (`kMaxFeeIncrements`) and returns `tecNO_PERMISSION` instead of `temINVALID_FLAG` in the corresponding case.
- Credentials and PermissionedDomain: adjust the handling of expired credentials and permissioned domains.
- Several invariant checks (`InvariantCheck`, `PermissionedDEXInvariant`, `PermissionedDomainInvariant`) are tightened to detect these same corrected states.

## Affected transactions and objects

Affects [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), MPToken transactions, [VaultClawback](/tx/VaultClawback), [LoanPay](/tx/LoanPay), [PermissionedDomainSet](/tx/PermissionedDomainSet), and Credentials transactions, as well as the invariant checks that validate objects such as `MPToken`, `Vault`, `Loan`, `PermissionedDomain`, and hybrid offers in the `PermissionedDEX`.

## Status and context

This is a "version cleanup" amendment: instead of coordinating the voting of half a dozen tiny amendments separately, rippled packages them into one tied to its release number (3.1.3). Its `VoteBehavior::DefaultYes` in `features.macro` reflects that these are low-risk fixes intended to be activated quickly once the release has been validated.
