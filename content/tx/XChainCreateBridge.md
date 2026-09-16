---
title: XChainCreateBridge
summary: Creates a bridge between two chains (locking and issuing) from one of their door accounts, setting the witness reward and the minimum for account creation.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincreatebridge
xls: XLS-0038
amendment: XChainBridge
level: advanced
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** The type exists in the network's definitions (the server supports it), but any submission is rejected with `temDISABLED` until it's activated. What follows describes what it will do once enabled.

A bridge connects two independent ledgers: the **locking chain** (where the original asset gets locked) and the **issuing chain** (where a "wrapped" asset that represents it 1:1 is issued). There's no exchange rate: each wrapped token equals one locked token. On each chain there's a **door account**, controlled by multisig from a set of **witnesses** (servers that observe both chains and sign attestations of what happens on the other).

`XChainCreateBridge` is sent by one of the two door accounts and creates the [Bridge](/objects/Bridge) object on its own chain. The object stores the bridge's specification (`XChainBridge`: the two doors and the two assets), the `SignatureReward` witnesses will collect per attestation, and, optionally, `MinAccountCreateAmount`, which enables account creation through the bridge. It also initializes three counters to 0: `XChainClaimID`, `XChainAccountCreateCount`, and `XChainAccountClaimCount`.

For the bridge to actually work it must be created **on both chains** (one transaction per chain, each sent by its door) and each door must be configured with a signer list ([SignerListSet](/tx/SignerListSet)) containing the witnesses' keys.

## When to use it

- Setting up a sidechain that uses wrapped XRP: the issuing chain's door must be that chain's root account.
- Bridging an issued token (IOU): the issuing chain's door must be the issuer of the wrapped token itself.
- Only makes sense if you control the door account and a set of witnesses; a regular user never sends this transaction.

## How it works inside

`XChainCreateBridge::preflight` (static validation, in `transactors/bridge/XChainBridge.cpp`):

- The two doors must be different (`temXCHAIN_EQUAL_DOOR_ACCOUNTS`), to prevent replays between chains.
- The sending account must be one of the two doors (`temXCHAIN_BRIDGE_NONDOOR_OWNER`).
- The two assets must be either both XRP or both IOU (`temXCHAIN_BRIDGE_BAD_ISSUES`): they have different numeric ranges.
- `SignatureReward` must be XRP and non-negative (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`). It can be 0.
- `MinAccountCreateAmount`, if present, must be positive XRP and the bridge must be XRP-XRP (`temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT`).
- If the issuing chain's asset is XRP, `IssuingChainDoor` must be the root account (the one derived from `masterpassphrase`, `rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh`), so it never "runs out" of wrapped XRP. If it's an IOU, the door must be its issuer. And the locking door cannot be the issuer of the asset it locks (there would be nothing to lock). All of this returns `temXCHAIN_BRIDGE_BAD_ISSUES`.

`XChainCreateBridge::preclaim` (against the ledger):

- If a Bridge with that specification already exists on either side, `tecDUPLICATE`.
- If this chain's asset is an IOU, its issuer must exist (`tecNO_ISSUER`) and **not** have `lsfAllowTrustLineClawback` (`tecNO_PERMISSION`): a clawback would break the guarantee that every wrapped token is backed.
- The account must cover the reserve for one more object (`tecINSUFFICIENT_RESERVE`).

`XChainCreateBridge::doApply` creates the Bridge object (`keylet::bridge(spec, chainType)`), links it into the owner's directory, and increases `OwnerCount` by 1.

## Key fields

- **XChainBridge** — object with `LockingChainDoor`, `LockingChainIssue`, `IssuingChainDoor`, and `IssuingChainIssue`. Identifies the bridge; must be identical on both chains and in all subsequent transactions.
- **SignatureReward** — XRP (in drops) that whoever claims pays to the witnesses; distributed equally among those who attested. Every `XChainCreateClaimID` and `XChainAccountCreateCommit` must specify exactly this value.
- **MinAccountCreateAmount** — if present, the bridge allows `XChainAccountCreateCommit`, and this is the minimum XRP to send. If omitted, account creation through the bridge is disabled.

## Common errors

- **temDISABLED** — the amendment isn't active on the network. This is what you'll see today on testnet.
- **temXCHAIN_BRIDGE_NONDOOR_OWNER** — the signing account isn't either of the two doors.
- **temXCHAIN_BRIDGE_BAD_ISSUES** — incorrect issuing door (not the root account for XRP, or not the issuer for an IOU), or mixing XRP/IOU.
- **temXCHAIN_EQUAL_DOOR_ACCOUNTS** — you've set the same account as both doors.
- **tecDUPLICATE** — the bridge already exists on this chain.
- **tecNO_PERMISSION** — the IOU's issuer has clawback enabled.
- **tecINSUFFICIENT_RESERVE** — you don't cover the reserve for the new object.

## Example

```json
{
  "TransactionType": "XChainCreateBridge",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rXXXX_YOUR_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "100",
  "MinAccountCreateAmount": "10000000"
}
```

Here your account acts as the locking chain's door and `rZZZZ_ISSUER` is the issuing chain's door. Note: for a real XRP-XRP bridge, that issuing door would have to be the sidechain's root account, not just any account.

## Try it on testnet

1. Load the example into the builder and sign it with your account.
2. Submit it: today the response will be `temDISABLED`, because XChainBridge isn't active. Check `feature` with the hash `C98D98EE9616ACD36E81FDEB8D41D349BF5F1B41DD64A0ABC1FE9AA5EA267E9C` to see its voting status.
3. Once the amendment is activated: after a `tesSUCCESS`, `account_objects` with `type: "bridge"` will show the Bridge object with `XChainClaimID: 0`, `XChainAccountCreateCount: 0`, and `XChainAccountClaimCount: 0`, and your account's `OwnerCount` will go up by 1.
4. Afterward you'd need to configure the witnesses with `SignerListSet` and disable the door's master key; without a signer list, any attestation or claim fails with `tecXCHAIN_NO_SIGNERS_LIST`.

## Related

- [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim)
- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [SignerListSet](/tx/SignerListSet)
- [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
