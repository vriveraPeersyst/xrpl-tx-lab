---
title: XChainAccountCreateCommit
summary: Sends XRP through the bridge to create a new account on the other chain, without needing a prior claim ID.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaccountcreatecommit
xls: XLS-0038
amendment: XChainBridge
level: intermediate
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

The normal bridge flow requires a claim ID on the destination chain, and creating one requires already having an account there with XRP. That's a bootstrapping problem on a new sidechain. `XChainAccountCreateCommit` solves it: you send `Amount` (XRP) plus `SignatureReward` to this chain's door, specifying the `Destination` account you want to exist on the other chain. You don't need a claim ID; instead the bridge uses a sequential counter, `XChainAccountCreateCount`, which increments with each send and orders the creations.

On the other chain, witnesses send [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation). Once quorum is reached, the door there creates the `Destination` account with `Amount` and pays the reward to the witnesses using the funds you advanced. Here the reward **is charged upfront**: the door receives `Amount + SignatureReward`.

This only works on XRP-XRP bridges and only if the door has configured `MinAccountCreateAmount` on the [Bridge](/objects/Bridge).

## When to use it

- Creating your first account on a sidechain using XRP from the mainchain (or vice versa).
- Funding third-party accounts on the other chain without them having to do anything.

## How it works inside

In the code the class is called `XChainCreateAccountCommit` (in `transactors/bridge/XChainBridge.cpp`).

`XChainCreateAccountCommit::preflight`: `Amount` must be positive XRP; `SignatureReward` non-negative XRP; and both the same asset. Any violation returns `temBAD_AMOUNT`.

`XChainCreateAccountCommit::preclaim`:

- The Bridge must exist (`tecNO_ENTRY`).
- `SignatureReward` must be exactly that of the Bridge (`tecXCHAIN_REWARD_MISMATCH`).
- The Bridge must have `MinAccountCreateAmount`; otherwise `tecXCHAIN_CREATE_ACCOUNT_DISABLED`.
- `Amount` must be ≥ `MinAccountCreateAmount` (`tecXCHAIN_INSUFF_CREATE_AMOUNT`).
- The door cannot send to itself (`tecXCHAIN_SELF_COMMIT`).
- The asset of `Amount` must be this chain's (`tecXCHAIN_BAD_TRANSFER_ISSUE`) and the other chain's must be XRP (`tecXCHAIN_CREATE_ACCOUNT_NONXRP_ISSUE`): accounts cannot be created with an IOU.

`XChainCreateAccountCommit::doApply`:

- Transfers `Amount + SignatureReward` to the door via `transferHelper` (`CanCreateDstPolicy::Yes`, `DepositAuthPolicy::Normal`). Requires `balance ≥ amount + reserve` (`tecUNFUNDED_PAYMENT`), allowing the fee to come out of the reserve but not the amount.
- Increments `XChainAccountCreateCount` on the Bridge. That number is what the witnesses will cite as `XChainAccountCreateCount` in their attestations.

On the other chain, `applyCreateAccountAttestations` processes creations **in strict order**: only the one whose `createCount == XChainAccountClaimCount + 1` is executed. The following ones (up to 128 ahead, `kXbridgeMaxAccountCreateClaims`) accumulate in [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID) objects owned by the door until their turn comes. If the creation fails (for example, `Amount` below the other chain's base reserve → `tecNO_DST_INSUF_XRP`), the claim is discarded anyway (`OnTransferFail::RemoveClaim`) so as not to block the following ones; the funds remain with the door.

## Key fields

- **Destination** — the account to create on the **other** chain. If it already exists, it simply receives the XRP.
- **Amount** — XRP the new account will receive. Must be ≥ the Bridge's `MinAccountCreateAmount`; in practice also ≥ the other chain's base reserve, or the creation will fail there and you'll lose the funds (they remain with the door).
- **SignatureReward** — exact copy of the Bridge's reward. Charged now, along with `Amount`.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **tecXCHAIN_CREATE_ACCOUNT_DISABLED** — the Bridge has no `MinAccountCreateAmount`.
- **tecXCHAIN_INSUFF_CREATE_AMOUNT** — `Amount` is less than the Bridge's minimum.
- **tecXCHAIN_REWARD_MISMATCH** — `SignatureReward` differs from the Bridge's.
- **tecXCHAIN_CREATE_ACCOUNT_NONXRP_ISSUE** — the bridge isn't XRP-XRP.
- **tecUNFUNDED_PAYMENT** — you don't have `Amount + SignatureReward + reserve`.
- **temBAD_AMOUNT** — `Amount` or `SignatureReward` isn't XRP, or `Amount` is 0.

## Example

```json
{
  "TransactionType": "XChainAccountCreateCommit",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTHER_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "Amount": "20000000",
  "SignatureReward": "100"
}
```

`rYYYY_OTHER_ACCOUNT` is the locking chain's door (and, in this simplified example, also the address to create on the other chain); `rZZZZ_ISSUER` is the issuing chain's door. You send 20 XRP plus 100 drops of reward.

## Try it on testnet

1. Load the example into the builder. `SignatureReward` must match the Bridge's and `Amount` must exceed its `MinAccountCreateAmount`.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active.
3. Once the amendment is activated and the bridge exists: after `tesSUCCESS`, `account_info` of the door will show `Balance` increased by `Amount + SignatureReward`, and `ledger_entry` of the Bridge will show `XChainAccountCreateCount` incremented by 1.
4. On the other chain, the door will accumulate an `XChainOwnedCreateAccountClaimID` with attestations until quorum; then `account_info` of `Destination` will respond with the newly created account and the Bridge's `XChainAccountClaimCount` there will match your creation number.

## Related

- [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation), [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge)
- [XChainCommit](/tx/XChainCommit), [XChainCreateClaimID](/tx/XChainCreateClaimID)
- [Bridge](/objects/Bridge), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
- [XChainBridge](/amendments/XChainBridge)
