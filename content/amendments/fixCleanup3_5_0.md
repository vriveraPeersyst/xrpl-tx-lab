---
title: fixCleanup3_5_0
summary: Groups the set of behavior fixes accumulated for rippled version 3.5.0 into a single amendment.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_5_0
introducedIn: 3.5.0
---

## What changes

Fifth installment in the series following [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), and [fixCleanup3_4_0](/amendments/fixCleanup3_4_0). It activates a batch of unrelated fixes gated for rippled 3.5.0. `XRPAmount` and `MPTAmount` now throw `std::overflow_error` on arithmetic overflow instead of silently wrapping, and `Quality` absorbs the equivalent overflow for XRP instead of rethrowing. `TokenHelpers` and `Payment::doApply` compute MPT transfer fees and delivery costs with exact integer arithmetic instead of `Number`-based rounding, which could otherwise overcharge the sender on large MPT amounts. `LoanSet::preclaim` and `LoanBrokerSet::preclaim` reject values that aren't representable in the vault's asset type instead of letting them throw later. `LoanBrokerDelete::doApply` runs the broker's cover payout through the same transfer-rate and authorization checks as a cover withdrawal, creates the owner's MPToken holding first if it doesn't have one, and drops the owner count for the deleted pseudo-account before paying out the cover so the freed reserve covers that new holding. `SponsorshipTransfer::preflight` rejects a zero `sfObjectID`. `VaultClawback::preclaim` rejects a non-existent holder up front instead of failing later in `doApply` after the fee was already charged. `VaultWithdraw` now charges the transfer rate when a holder withdraws to a different third-party holder, instead of always waiving it. `EscrowFinish::preflightSigValidated` re-validates a cached-invalid condition's own well-formedness on every node, so a malformed condition returns `temMALFORMED` deterministically regardless of whether the result was already cached. On the invariant side, `ValidMPTIssuance::finalize` rejects clearing any `MPTokenIssuance` flag other than `lsfMPTLocked` and rejects erasing an `MPToken` with a non-zero `sfMPTAmount`, while `ValidPseudoAccounts::finalize` restricts a pseudo-account's owner directory to the entries that belong to its own AMM, Vault, or LoanBroker.

## Affected transactions and objects

[Payment](/tx/Payment), [LoanSet](/tx/LoanSet), [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerDelete](/tx/LoanBrokerDelete), [VaultCreate](/tx/VaultCreate), [VaultSet](/tx/VaultSet), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback), [SponsorshipTransfer](/tx/SponsorshipTransfer), and [EscrowFinish](/tx/EscrowFinish), plus the ledger objects the invariants cover: [MPToken](/objects/MPToken), [MPTokenIssuance](/objects/MPTokenIssuance), and the pseudo-accounts of [AMM](/objects/AMM), [Vault](/objects/Vault), and [LoanBroker](/objects/LoanBroker).

## Status and context

Like the rest of the `fixCleanupX_Y_Z` series, this does not correspond to a single design proposal but to the periodic packaging of scattered bug fixes from different subsystems under one votable amendment per rippled version. The code checks `rules.enabled(fixCleanup3_5_0)` (or the no-view `isFeatureEnabled` variant) independently at each of these sites, so activating the amendment turns on the entire batch of 3.5.0 fixes at once.
