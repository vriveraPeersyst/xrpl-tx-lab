---
title: NegativeUNL
summary: Allows temporarily marking UNL validators that are not validating on the ledger, in order to maintain the effective quorum.
xrplDocs: https://xrpl.org/resources/known-amendments#negativeunl
introducedIn: 1.7.0
---

## What changes

Introduces the singleton object `NegativeUNL` (`ltNEGATIVE_UNL`, only one can exist on the ledger), with the fields `DisabledValidators` (the current list of validators marked as inactive), `ValidatorToDisable` and `ValidatorToReEnable` (the proposed changes for the flag ledger, not yet applied). It is not a transaction a user can submit: the validators themselves, when closing each flag ledger (one out of every 256), vote on which UNL validators have gone a number of consecutive ledgers without validating and propose adding or removing them from the negative list. If enough validators agree, the change is applied automatically to the ledger via an internal protocol pseudo-transaction.

The practical effect is that the consensus quorum (normally 80% of the UNL) is calculated excluding the validators on the negative list, rather than over the nominal size of the UNL. So, if several validators temporarily stop functioning, the network does not need more "healthy" validators to survive than are strictly necessary to keep reaching the real 80%.

## Affected transactions and objects

- New object: [NegativeUNL](/objects/NegativeUNL), a ledger singleton.
- Does not add user transactions; the state change occurs through the validator voting mechanism on flag ledgers, managed internally by the consensus protocol.

## Status and context

Before this amendment, if a sufficient number of UNL validators stopped validating (due to outages, maintenance, network issues), the network could lose the ability to reach the 80% quorum needed to close ledgers, even if the remaining validators were perfectly in sync with each other. NegativeUNL resolves this by making the quorum be calculated over the actually active validators, rather than over the nominal UNL set, improving network availability against partial outages without compromising the security of consensus.
