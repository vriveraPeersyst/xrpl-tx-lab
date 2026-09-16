---
title: XChainCreateClaimID
summary: Reserves a claim identifier (claim ID) on the destination chain before sending funds through the bridge from the other chain.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincreateclaimid
xls: XLS-0038
amendment: XChainBridge
level: intermediate
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

A bridge transfer always starts **on the destination chain**: before locking funds on the source chain, you need to obtain a **claim ID** on the chain you want to bring them to. `XChainCreateClaimID` creates the [XChainOwnedClaimID](/objects/XChainOwnedClaimID) object, with a sequential number that the bridge assigns by incrementing its `XChainClaimID` counter. That number is single-use: once the claim is completed the object is deleted and the number never exists again.

The object stores who owns it (you), which account will send the funds on the other chain (`OtherChainSource`), the `SignatureReward` you'll pay the witnesses, and an empty `XChainClaimAttestations` array where attestations will accumulate. This is what prevents an attestation from being used more than once.

The full flow is: `XChainCreateClaimID` (destination) → [XChainCommit](/tx/XChainCommit) with that ID (source) → witnesses send [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) (destination) → the funds arrive automatically or you claim them with [XChainClaim](/tx/XChainClaim).

## When to use it

- It's the first step of any transfer of an already-bridged asset, from either chain toward the other.
- You need to already have an account on the destination chain. If you don't (bootstrapping a sidechain), use [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), which doesn't require a claim ID.

## How it works inside

`XChainCreateClaimID::preflight` (in `transactors/bridge/XChainBridge.cpp`) only validates `SignatureReward`: it must be XRP, non-negative, and a legal amount (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`).

`XChainCreateClaimID::preclaim`:

- Looks up the [Bridge](/objects/Bridge) by its specification on either side (`readBridge`); if it doesn't exist, `tecNO_ENTRY`.
- `SignatureReward` must be **exactly equal** to the Bridge's, no more and no less (`tecXCHAIN_REWARD_MISMATCH`).
- The account must cover the reserve for one more object (`tecINSUFFICIENT_RESERVE`).

`XChainCreateClaimID::doApply`:

- Increments the Bridge's `XChainClaimID` and uses the new value as the identifier (if it were to overflow to 0, `tecINTERNAL`).
- Creates the `XChainOwnedClaimID` object (`keylet::xChainClaimID(spec, id)`) with `Account`, `XChainBridge`, `XChainClaimID`, `OtherChainSource`, `SignatureReward`, and an empty `XChainClaimAttestations`.
- Inserts it into your owner directory and increases your `OwnerCount` by 1.

Note: the reward **isn't charged here**. It's paid from your account when the claim is completed (in `finalizeClaimHelper`, from `rewardPoolSrc`, which is the claim ID's owner). So it's worth keeping sufficient balance until then.

## Key fields

- **XChainBridge** — the bridge specification. A Bridge with it must exist on this chain.
- **SignatureReward** — exact copy of the reward currently on the Bridge. If the door changes it with [XChainModifyBridge](/tx/XChainModifyBridge), claim IDs already created keep the old one.
- **OtherChainSource** — the account on the **other** chain that will perform the `XChainCommit`. Attestations whose `OtherChainSource` doesn't match are rejected with `tecXCHAIN_SENDING_ACCOUNT_MISMATCH`. It's usually your own account on the other chain, but it can be anyone.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **tecNO_ENTRY** — there's no Bridge with that specification on this chain.
- **tecXCHAIN_REWARD_MISMATCH** — `SignatureReward` doesn't match the Bridge's. Read it with `ledger_entry` before sending.
- **tecINSUFFICIENT_RESERVE** — not enough XRP for the new object's reserve.
- **temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT** — the reward isn't XRP or is negative.

## Example

```json
{
  "TransactionType": "XChainCreateClaimID",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTHER_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "100",
  "OtherChainSource": "rYYYY_OTHER_ACCOUNT"
}
```

`rYYYY_OTHER_ACCOUNT` acts as the locking chain's door (and, for the example's simplicity, also as the source on the other chain); `rZZZZ_ISSUER` is the issuing chain's door.

## Try it on testnet

1. Load the example into the builder. Put the exact specification of a bridge in `XChainBridge` and, in `SignatureReward`, the value that Bridge has.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active.
3. Once the amendment is activated and the bridge exists: after `tesSUCCESS`, `account_objects` with `type: "xchain_owned_claim_id"` will show the object with `XChainClaimID` equal to the Bridge's counter (1 for the first) and `XChainClaimAttestations: []`.
4. Use that `XChainClaimID` in the `XChainCommit` on the other chain. Once witnesses attest and quorum is reached, the object will disappear and your `OwnerCount` will go down by 1.

## Related

- [XChainCommit](/tx/XChainCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim)
- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
