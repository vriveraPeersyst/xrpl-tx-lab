---
title: XChainClaim
summary: Completes a bridge transfer whose claim ID already has quorum of attestations, delivering the funds from the door to the destination you choose.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainclaim
xls: XLS-0038
amendment: XChainBridge
level: intermediate
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

`XChainClaim` is the final "manual" step of a bridge transfer. When you performed [XChainCommit](/tx/XChainCommit) on the source chain without specifying `OtherChainDestination`, the witnesses attest to the send without a destination and the funds don't deliver themselves: they sit waiting in your [XChainOwnedClaimID](/objects/XChainOwnedClaimID). With `XChainClaim` you choose which account on this chain they go to (`Destination`, with an optional `DestinationTag`) and the amount (`Amount`), which must match what the witnesses attested to.

If the claim succeeds: this chain's door pays `Amount` to the destination, your account pays the `SignatureReward` distributed among the witnesses who attested, and the `XChainOwnedClaimID` object is deleted (freeing up the reserve). If the commit carried `OtherChainDestination`, this transaction isn't needed: delivery happens automatically once quorum is reached in [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation).

## When to use it

- When you made the commit without a destination and want to decide later who to deliver to.
- When automatic delivery failed (for example, the destination had DepositAuth or required a destination tag) and the claim ID is still alive: the code keeps the claim (`OnTransferFail::KeepClaim`) so you can retry with a different destination or with `DestinationTag`.
- To receive into your own account while bypassing your own DepositAuth (see below).

## How it works inside

`XChainClaim::preflight` (in `transactors/bridge/XChainBridge.cpp`): `Amount` positive and with the asset of one of the bridge's two sides (`temBAD_AMOUNT`).

`XChainClaim::preclaim`:

- The [Bridge](/objects/Bridge) must exist (`tecNO_ENTRY`) and the `Destination` account must exist (`tecNO_DST`): unlike bridge account creation, no accounts are created here.
- The asset of `Amount` must be **this** chain's (`tecXCHAIN_BAD_TRANSFER_ISSUE`).
- The `XChainOwnedClaimID` with that `XChainClaimID` must exist (`tecXCHAIN_NO_CLAIM_ID`) and **be yours** (`tecXCHAIN_BAD_CLAIM_ID`).
- Quorum isn't checked here but in `doApply`.

`XChainClaim::doApply`:

1. Reads the door's signer list and quorum (`getSignersListAndQuorum`); without a SignerList, `tecXCHAIN_NO_SIGNERS_LIST`.
2. `onClaim` → `claimHelper` with `CheckDst::Ignore`: discards attestations whose signer is no longer on the list or whose key is no longer valid, sums the weights of those that match in amount (converted to the source chain's issue) and in `WasLockingChainSend`, ignoring the destination they attested to. If the weight doesn't reach quorum, `tecXCHAIN_CLAIM_NO_QUORUM`.
3. `finalizeClaimHelper` transfers from the door to `Destination` (`transferHelper`, with `DepositAuthPolicy::DstCanBypass`: if the destination is yourself, your own DepositAuth doesn't block it). If that transfer fails, the error is returned and the claim is **kept**.
4. Distributes the `SignatureReward` stored in the claim ID from your account equally among the `AttestationRewardAccount`s of the witnesses that counted toward quorum. With [fixXChainRewardRounding](/amendments/fixXChainRewardRounding) (also not active on testnet) the distribution rounds down. An individual failure in a reward payment doesn't void the operation, except for `tecUNFUNDED_PAYMENT` or `tecINTERNAL`.
5. Deletes the `XChainOwnedClaimID` from the ledger and from your directory, and lowers your `OwnerCount` by 1.

## Key fields

- **XChainClaimID** — the number of the claim ID you own and on which there are already attestations.
- **Amount** — amount in this chain's asset. Must numerically match what was attested; if not, there's no quorum for "that" amount.
- **Destination** / **DestinationTag** — account on this chain that receives it. Must exist. If it has `lsfRequireDestTag`, the tag is mandatory.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **tecXCHAIN_CLAIM_NO_QUORUM** — there still aren't enough attestations for that amount, or the amount doesn't match the commit's.
- **tecXCHAIN_BAD_CLAIM_ID** — the claim ID exists but belongs to another account.
- **tecXCHAIN_NO_CLAIM_ID** — it doesn't exist (perhaps it was already consumed by an automatic delivery).
- **tecNO_DST** — the destination account doesn't exist on this chain.
- **tecDST_TAG_NEEDED** / **tecNO_PERMISSION** — the destination requires a tag or has DepositAuth; the claim is kept so you can retry.
- **tecXCHAIN_NO_SIGNERS_LIST** — the door has no signer list configured.

## Example

```json
{
  "TransactionType": "XChainClaim",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTHER_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "XChainClaimID": "1",
  "Destination": "rXXXX_YOUR_ACCOUNT",
  "Amount": "1000000"
}
```

`rYYYY_OTHER_ACCOUNT` is the locking chain's door and `rZZZZ_ISSUER` the issuing chain's door. You claim 1 XRP for yourself.

## Try it on testnet

1. Load the example into the builder with the `XChainClaimID` of a claim ID you own and the same `Amount` you sent in the `XChainCommit` on the other chain.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active.
3. Once the amendment is activated and there's quorum: after `tesSUCCESS`, `account_objects` with `type: "xchain_owned_claim_id"` will no longer show the object, the `Destination`'s `Balance` will have gone up by `Amount`, and yours will have gone down by `SignatureReward + Fee`. In the metadata you'll see the reward payments to each witness.
4. If you submit it before there's quorum, you'll see `tecXCHAIN_CLAIM_NO_QUORUM` and the claim ID will remain intact; check `ledger_entry` with `xchain_owned_claim_id` to see how many attestations it has.

## Related

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
