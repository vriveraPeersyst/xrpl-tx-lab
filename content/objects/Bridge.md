---
title: Bridge
summary: Defines a bridge between two XRPL chains: the door account, the asset that crosses, the reward for witnesses, and the claim counters.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/bridge
createdBy: XChainCreateBridge
modifiedBy: XChainModifyBridge, XChainCreateClaimID, XChainAccountCreateCommit, XChainAddAccountCreateAttestation
reserve: 1
---

## What it represents

A `Bridge` is one half of a bridge between two XRPL networks (for example, mainnet and a sidechain). Each chain has its own `Bridge` object on the *door account* for that side. The object states which asset is locked on one chain and issued on the other, how much witnesses charge for attesting, and keeps track of claims so that no crossing is charged twice.

A bridge is of the "lock and issue" type: on the source chain the funds stay in the door (`LockingChainDoor`) and on the destination chain the issuing door (`IssuingChainDoor`) creates the equivalent token. Witnesses watch one chain and sign attestations for the other.

**Status on testnet**: the [XChainBridge](/amendments/XChainBridge) amendment is not enabled, so you cannot create this object on public testnet today. The code remains in rippled and we describe it for completeness.

## Lifecycle

- **Creation**: [XChainCreateBridge](/tx/XChainCreateBridge), sent by the door account. `XChainCreateBridge::preclaim` requires the account to be one of the two doors and that no bridge already exist for that door/currency pair; `doApply` creates the object with the counters at zero and adds 1 to `OwnerCount`.
- **Modification**: [XChainModifyBridge](/tx/XChainModifyBridge) changes `SignatureReward` and `MinAccountCreateAmount`. [XChainCreateClaimID](/tx/XChainCreateClaimID) increments `XChainClaimID` on the destination chain; [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit) increments `XChainAccountCreateCount` on the source chain, and [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) advances `XChainAccountClaimCount` on the destination chain when an account creation completes.
- **Deletion**: there is no transaction to delete it, and it blocks [AccountDelete](/tx/AccountDelete) of the door.

## Key fields

- **XChainBridge** — the full definition of the bridge: `LockingChainDoor`, `LockingChainIssue`, `IssuingChainDoor`, `IssuingChainIssue`. It's the same on both chains and forms part of the object's key.
- **Account** — this chain's door (one of the two in `XChainBridge`).
- **SignatureReward** — XRP (or the asset) distributed among the witnesses whose attestations count toward a claim. Paid by whoever creates the [XChainOwnedClaimID](/objects/XChainOwnedClaimID).
- **MinAccountCreateAmount** — minimum for [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit); if absent, account creation through the bridge is disabled.
- **XChainClaimID** — last claim identifier issued. Each `XChainCreateClaimID` uses the next one.
- **XChainAccountCreateCount** — how many `XChainAccountCreateCommit` have been sent from this chain.
- **XChainAccountClaimCount** — how many account creations have completed on this chain. They must be processed in strict order.

## Flags

It has no `lsf*` flags.

## How to query it

With `ledger_entry`, pass the bridge definition and the door account:

```json
{ "method": "ledger_entry", "params": [{
  "bridge_account": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
  "bridge": {
    "LockingChainDoor": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rDoorIssuingChainxxxxxxxxxxxxxxxxxxxx",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "ledger_index": "validated"
}] }
```

The key is `SHA512Half(0x0042 || this_chain's_door || currency)` (`keylet::bridge`). In `account_objects`, use `type: "bridge"`. Typical response:

```json
{
  "node": {
    "LedgerEntryType": "Bridge",
    "Account": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
    "XChainBridge": {
      "LockingChainDoor": "rDoorLockingChainxxxxxxxxxxxxxxxxxxxx",
      "LockingChainIssue": { "currency": "XRP" },
      "IssuingChainDoor": "rDoorIssuingChainxxxxxxxxxxxxxxxxxxxx",
      "IssuingChainIssue": { "currency": "XRP" }
    },
    "SignatureReward": "100",
    "MinAccountCreateAmount": "1000000",
    "XChainClaimID": "0",
    "XChainAccountCreateCount": "3",
    "XChainAccountClaimCount": "3",
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Counts as 1 in the door account's `OwnerCount`.

## Related

- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
- [XChainBridge](/amendments/XChainBridge)
