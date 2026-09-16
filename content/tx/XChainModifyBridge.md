---
title: XChainModifyBridge
summary: Changes the witness reward or the account-creation minimum of an existing bridge; only the door account can send it.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainmodifybridge
xls: XLS-0038
amendment: XChainBridge
level: advanced
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

`XChainModifyBridge` modifies the only two adjustable parameters of a [Bridge](/objects/Bridge) object already created with [XChainCreateBridge](/tx/XChainCreateBridge): the `SignatureReward` witnesses collect and the `MinAccountCreateAmount` that enables (or, with the `tfClearAccountCreateAmount` flag, disables) account creation through the bridge. The bridge's specification (`XChainBridge`: doors and assets) cannot be changed; it's used only to locate the object.

It's sent by that chain's door account. Since the door is controlled by multisig from the witnesses, in practice this transaction requires a quorum of them. It only affects the Bridge on the chain where it's sent: if you want the same change on both chains, it must be sent on both.

## When to use it

- Adjusting the witness reward when costs or XRP's price change.
- Enabling account creation through the bridge on an XRP-XRP bridge that was created without `MinAccountCreateAmount`.
- Disabling account creation with `tfClearAccountCreateAmount` (for example, in the face of abuse, or to freeze bootstrapping).

## How it works inside

In the code the class is called `BridgeModify` (in `transactors/bridge/XChainBridge.cpp`), although the transaction type is `XChainModifyBridge`.

`BridgeModify::preflight`:

- Something must change: if neither `SignatureReward`, nor `MinAccountCreateAmount`, nor the `tfClearAccountCreateAmount` flag is provided, it returns `temMALFORMED`.
- You cannot set `MinAccountCreateAmount` while also setting `tfClearAccountCreateAmount` (`temMALFORMED`).
- The account must be one of the two doors of the `XChainBridge` (`temXCHAIN_BRIDGE_NONDOOR_OWNER`).
- `SignatureReward`, if provided, must be non-negative XRP (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`).
- `MinAccountCreateAmount`, if provided, must be positive XRP and both of the bridge's assets must be XRP (`temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT`).
- The flags are validated against `tfXChainModifyBridgeMask`: the only valid one is `tfClearAccountCreateAmount`.

`BridgeModify::preclaim`: looks up the Bridge on the side corresponding to the signing door (`keylet::bridge(spec, chainType)`); if it doesn't exist, `tecNO_ENTRY`.

`BridgeModify::doApply`: writes `SignatureReward` and/or `MinAccountCreateAmount` to the object and, if the flag is set and the field exists, removes it with `makeFieldAbsent`. It doesn't touch the counters or the reserve.

## Key fields

- **XChainBridge** — the bridge's full specification, used only to locate it. Must exactly match the object's.
- **SignatureReward** — new reward, in drops. Affects future `XChainCreateClaimID` and `XChainAccountCreateCommit` transactions: they must specify exactly this value. Claim IDs already created keep the reward they were created with.
- **MinAccountCreateAmount** — new minimum, in drops, for `XChainAccountCreateCommit`. Present = account creation enabled.

## Flags

- **tfClearAccountCreateAmount** (0x00010000) — removes `MinAccountCreateAmount` from the Bridge, so `XChainAccountCreateCommit` will start failing with `tecXCHAIN_CREATE_ACCOUNT_DISABLED`. Incompatible with sending `MinAccountCreateAmount` in the same transaction.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **temMALFORMED** — you're not changing anything, or you're combining `MinAccountCreateAmount` with `tfClearAccountCreateAmount`.
- **temXCHAIN_BRIDGE_NONDOOR_OWNER** — the account isn't a door of the bridge.
- **temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT** — minimum isn't XRP, is zero, or the bridge is an IOU bridge.
- **tecNO_ENTRY** — there's no Bridge with that specification on this chain (or you're sending from the wrong door).
- **temINVALID_FLAG** — you've set a flag other than `tfClearAccountCreateAmount`.

## Example

```json
{
  "TransactionType": "XChainModifyBridge",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rXXXX_YOUR_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "200"
}
```

Your account is the locking chain's door; `rZZZZ_ISSUER` is the issuing chain's door. It raises the reward from 100 to 200 drops.

## Try it on testnet

1. Load the example into the builder with the same `XChainBridge` you used (or would use) in `XChainCreateBridge`.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active.
3. Once the amendment is activated and the Bridge exists: after `tesSUCCESS`, `ledger_entry` with `bridge_account` and `bridge` (the specification) will return the object with `SignatureReward: "200"`. If you used `tfClearAccountCreateAmount`, the `MinAccountCreateAmount` field will have disappeared.
4. Then check that an `XChainCreateClaimID` with the old reward fails with `tecXCHAIN_REWARD_MISMATCH`.

## Related

- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
