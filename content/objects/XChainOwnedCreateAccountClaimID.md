---
title: XChainOwnedCreateAccountClaimID
summary: Like XChainOwnedClaimID, but for creating a new account on the destination chain from a deposit on the source chain, via a bridge.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/xchainownedcreateaccountclaimid
createdBy: sistema (XChainAddAccountCreateAttestation)
modifiedBy: XChainAddAccountCreateAttestation
reserve: 1
---

## What it represents

When someone uses a [Bridge](/objects/Bridge) to send funds to an account that **does not exist yet** on the destination chain, claiming a payment is not enough: the account has to be created first. `XChainOwnedCreateAccountClaimID` is the equivalent of [XChainOwnedClaimID](/objects/XChainOwnedClaimID) for that case: it accumulates witness attestations about an "account create" type deposit, and when the quorum is reached, the destination chain itself creates the account and credits the funds to it automatically. Unlike the normal flow, no claim transaction from the beneficiary is needed here: the process completes on its own, which is why `modifiedBy` does not include a final "claim" transaction.

The sequence number (`XChainAccountCreateCount`) is a strictly increasing counter per bridge, to guarantee that account creations are processed in the same order in which they were deposited on the source chain.

## Lifecycle

- **Creation**: automatic, triggered by the first [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) that a witness sends about an "account create" type deposit observed on the source chain (originated by [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)). There is no user transaction that creates it explicitly, unlike `XChainCreateClaimID`.
- **Signature accumulation**: successive [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation) transactions from different witnesses keep adding entries to `XChainCreateAccountAttestations`.
- **Automatic resolution**: upon reaching the quorum configured on the `Bridge`, the destination chain creates the destination `AccountRoot` (if it did not exist) and credits it with the deposited amount minus the bridge's account creation fee. The object is deleted in the same step.

## Key fields

- **Account** — the bridge's door account on the destination chain, the technical owner of the object.
- **XChainBridge** — the bridge this account creation belongs to.
- **XChainAccountCreateCount** — strict sequential counter: account creations are resolved in this order, not in the order attestations arrive.
- **XChainCreateAccountAttestations** — array of witness signatures, each with the account to create, the deposited amount, and the witness's signature.

## Flags

It has no `lsf*` flags.

## How to query it

`account_objects` with `type: "xchain_owned_create_account_claim_id"` returns it for the door account. With `ledger_entry`, it accepts the same `bridge` fields as `XChainOwnedClaimID`, plus `xchain_owned_create_account_claim_id` with the counter:

```json
{ "method": "ledger_entry", "params": [{ "xchain_owned_create_account_claim_id": { "locking_chain_door": "rLockingChainDoorAddress", "locking_chain_issue": { "currency": "XRP" }, "issuing_chain_door": "rIssuingChainDoorAddress", "issuing_chain_issue": { "currency": "XRP" }, "xchain_owned_create_account_claim_id": 1 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x004B || source_door || source_asset || destination_door || destination_asset || XChainAccountCreateCount)` (`keylet::xChainCreateAccountClaimID`, namespace `'K'`). Typical response (while pending quorum):

```json
{
  "index": "7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B",
  "node": {
    "LedgerEntryType": "XChainOwnedCreateAccountClaimID",
    "Account": "rIssuingChainDoorAddress",
    "XChainAccountCreateCount": "1",
    "XChainCreateAccountAttestations": [],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet) from the door account while pending.

## Related

- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation)
- [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID)
