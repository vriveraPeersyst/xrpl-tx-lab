---
title: ExpandedSignerList
summary: Expands the maximum number of signers on a SignerList from 8 to 32 entries.
xrplDocs: https://xrpl.org/resources/known-amendments#expandedsignerlist
---

## What changes

[SignerListSet](/tx/SignerListSet) creates or replaces an account's signer list, used for multi-signing. Before this amendment, a `SignerEntries` list could not have more than 8 entries. ExpandedSignerList raises that limit to 32, enabling governance schemes with many more signers or more granular weights (`SignerWeight`) distributed among more parties.

The owner reserve cost scales with the size of the list: rippled charges `OwnerCount` units proportional to the number of entries (an 8-entry `SignerList` already cost several times the reserve of a normal object), so a 32-signer list implies a notably larger reserve locked in the account that creates it.

## Affected transactions and objects

- [SignerListSet](/tx/SignerListSet): validates the maximum number of `SignerEntries` allowed.
- [SignerList](/objects/SignerList): can store up to 32 entries instead of 8.
- Indirectly, any transaction signed via `Signers` (multi-signing) that relies on a large `SignerList` to reach its `SignerQuorum`.

## Status and context

The original limit of 8 signers was insufficient for organizations with more complex custody or governance structures (for example, boards with more than 8 members, or signing schemes distributed among several custody providers). This amendment relaxes that limit without changing the multi-signing mechanism itself. It is retired (`XRPL_RETIRE_FEATURE` in `features.macro`): the 32-signer limit is today the only behavior possible on the network.
