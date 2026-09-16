---
title: XChainOwnedClaimID
summary: A claim identifier for a cross-chain transfer via a bridge: it accumulates witness attestations until there are enough to release the funds.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/xchainownedclaimid
createdBy: XChainCreateClaimID
modifiedBy: XChainAddClaimAttestation, XChainClaim
reserve: 1
---

## What it represents

When someone moves funds from one chain to another through a [Bridge](/objects/Bridge) (for example, between XRPL mainnet and a sidechain), the process is not atomic: first a deposit is made on the source chain ([XChainCommit](/tx/XChainCommit)), and then enough witnesses (witness servers) need to attest to that deposit on the destination chain before the funds are released. `XChainOwnedClaimID` is the container for those attestations for a specific operation: until enough signatures come together (according to the quorum configured on the `Bridge`), the funds are not released.

The `XChainClaimID` itself (a number) is not chosen by the user: it is assigned incrementally by the destination chain when the object is created.

## Lifecycle

- **Creation**: [XChainCreateClaimID](/tx/XChainCreateClaimID), on the destination chain, before depositing on the source chain. Sets `OtherChainSource` (who is going to deposit on the source chain) and pays `SignatureReward` in advance, the reward that will be distributed among the witnesses who attest correctly.
- **Signature accumulation**: [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), sent by each witness (normally automatically by the witness software), adds an entry to `XChainClaimAttestations` with its signature over the deposit observed on the source chain.
- **Release**: [XChainClaim](/tx/XChainClaim), by the beneficiary, once `XChainClaimAttestations` reaches the quorum. Releases the funds to the final destination and deletes the object.
- **Cascading deletion**: [AccountDelete](/tx/AccountDelete) of the `Account` fails if it still has unresolved pending claim IDs.

## Key fields

- **Account** — who created the claim ID on the destination chain (not necessarily the final beneficiary).
- **XChainBridge** — which bridge (pair of door accounts and currencies on both chains) this claim uses.
- **XChainClaimID** — number assigned sequentially by the destination chain; together with `XChainBridge` it forms the object's key.
- **OtherChainSource** — the account expected to deposit on the source chain; only its deposit attestations are valid for this claim ID.
- **XChainClaimAttestations** — array of witness signatures received so far, each with the witness, the observed amount and its signature.
- **SignatureReward** — reward paid in advance, distributed among the witnesses whose attestations are used to complete the quorum.

## Flags

It has no `lsf*` flags.

## How to query it

`account_objects` with `type: "xchain_owned_claim_id"` returns it for `Account`. With `ledger_entry`, `xchain_owned_claim_id` accepts the `bridge` fields (`locking_chain_door`, `locking_chain_issue`, `issuing_chain_door`, `issuing_chain_issue`) plus `xchain_owned_claim_id` with the number:

```json
{ "method": "ledger_entry", "params": [{ "xchain_owned_claim_id": { "locking_chain_door": "rLockingChainDoorAddress", "locking_chain_issue": { "currency": "XRP" }, "issuing_chain_door": "rIssuingChainDoorAddress", "issuing_chain_issue": { "currency": "XRP" }, "xchain_owned_claim_id": 1 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0051 || source_door || source_asset || destination_door || destination_asset || XChainClaimID)` (`keylet::xChainClaimID`, namespace `'Q'`). Typical response:

```json
{
  "index": "6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A",
  "node": {
    "LedgerEntryType": "XChainOwnedClaimID",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "XChainClaimID": "1",
    "OtherChainSource": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "SignatureReward": "100",
    "XChainClaimAttestations": [],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet) from `Account`.

## Related

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim), [XChainCommit](/tx/XChainCommit)
- [Bridge](/objects/Bridge), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
