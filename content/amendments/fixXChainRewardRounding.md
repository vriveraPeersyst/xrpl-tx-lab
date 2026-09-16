---
title: fixXChainRewardRounding
summary: Fixes rounding when distributing an XChainBridge's SignatureReward among the witnesses that sign the attestations.
xrplDocs: https://xrpl.org/resources/known-amendments#fixxchainrewardrounding
---

## What changes

An [XChainBridge](/objects/Bridge) distributes its `SignatureReward` among the witness accounts that provide valid attestations to complete a crossing. The distribution is calculated by dividing the total reward by the number of signers who participated; before this fix, that division could leave remainders unassigned or distribute amounts slightly different from what was expected due to rounding down in integer arithmetic.

With fixXChainRewardRounding enabled, the calculation of each witness's share is fixed so that rounding is consistent and the sum of the distributed shares does not deviate from the total available in the bridge's account (nor leave residual dust locked indefinitely).

## Affected transactions and objects

- [XChainCreateBridge](/tx/XChainCreateBridge) and [XChainModifyBridge](/tx/XChainModifyBridge): define the `SignatureReward` to be distributed.
- [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) and [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation): trigger the distribution when quorum is reached.
- [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim), and [XChainCreateClaimID](/tx/XChainCreateClaimID): part of the crossing flow whose final payment includes this distribution.
- [Bridge](/objects/Bridge) object.

## Status and context

This is a precision fix to the reward mechanism introduced by [XChainBridge](/amendments/XChainBridge). Without correct rounding, witnesses could collectively receive somewhat less than expected from the `SignatureReward`, which is an economic problem for those operating the bridge infrastructure between XRPL and a sidechain or EVM-compatible sidechain.
