---
title: fixCleanup3_2_0
summary: Groups the set of behavior fixes accumulated for rippled version 3.2.0 into a single amendment.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_2_0
introducedIn: 3.2.0
---

## What changes

Instead of introducing a separate amendment for each minor fix, rippled periodically groups several unrelated fixes under a single "cleanup" amendment per version. `fixCleanup3_2_0` is the first in this series and simultaneously activates, among others: the new directory page limit ([DirectoryNode](/objects/DirectoryNode)), `Number` precision rules for vaults and loans (`MantissaScale::Large320`), the requirement for an authorized trustline for the issuer in [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), non-null `Channel`/`Amount` validations in [PaymentChannelClaim](/tx/PaymentChannelClaim) and [PaymentChannelFund](/tx/PaymentChannelFund), the rejection of malformed amounts in `preflightUniversal` (`temBAD_AMOUNT`), and adjustments to quality rounding in [OfferCreate](/tx/OfferCreate), along with several other changes to Vault, Lending, AMM, and MPT.

## Affected transactions and objects

Affects, across the board, [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PaymentChannel](/objects/PaymentChannel), [Escrow](/objects/Escrow), [DirectoryNode](/objects/DirectoryNode), [OfferCreate](/tx/OfferCreate), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), and the `LoanBroker*`, `VaultWithdraw`, `VaultDeposit`, and `VaultCreate` transactors.

## Status and context

This does not correspond to a single functional proposal but to rippled's practice of packaging dozens of small fixes, scattered across many subsystems, into a single amendment per release so as not to saturate the list of votable amendments. The code still checks `rules.enabled(fixCleanup3_2_0)` at each specific point it corrects, so the amendment functions as an umbrella: activating it activates all the fixes included in version 3.2.0 at once.
