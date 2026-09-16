---
title: XChainBridge
summary: Introduces the cross-chain bridge (sidechains), managed by a set of witness servers that attest to events on the source chain.
xls: XLS-0038
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0038-XChainBridge
xrplDocs: https://xrpl.org/resources/known-amendments#xchainbridge
---

## What changes

Adds the `Bridge` object (`ltBRIDGE`), which defines a bridge between two chains (for example, XRPL mainnet and a sidechain), with a `SignatureReward` that is split among the witness servers and an optional `MinAccountCreateAmount` for creating new accounts on the other side. `XChainCreateBridge` creates the object; `XChainModifyBridge` changes its parameters.

A normal crossing flow uses `XChainCreateClaimID`, which creates an `XChainOwnedClaimID` on the destination chain to claim a specific deposit, and `XChainCommit`, which locks the funds on the source chain by referencing that `XChainClaimID`. A set of witness servers observes the source chain and signs attestations with `XChainAddClaimAttestation`, which accumulate on the `XChainOwnedClaimID` until enough signatures are gathered to meet the bridge's quorum; then `XChainClaim` releases the funds on the destination chain. To create a new account directly via the bridge (when it does not yet exist on the destination chain), `XChainAccountCreateCommit` is used together with `XChainAddAccountCreateAttestation`, accumulated on an `XChainOwnedCreateAccountClaimID`.

Witness servers are not part of XRPL consensus: they are an external component that each bridge operator runs, and their collective signature is what authorizes the movement of funds between the two chains. The amendment only defines the mechanism on the ledger (objects and transactions); the bridge's security depends on the honesty of the configured witness set.

## Affected transactions and objects

- New: [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), and [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation).
- New objects: [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID), and [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID).

## Status and context

XChainBridge gives XRPL a native mechanism for moving XRP or issued tokens between XRPL mainnet and a sidechain (or between two sidechains), without relying on a generic external bridge. It is the foundation for projects such as XRPL's EVM sidechains, where witness servers watch both chains and coordinate locking on one and releasing on the other.
