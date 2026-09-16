---
title: XChainAddAccountCreateAttestation
summary: A witness attests to an XChainAccountCreateCommit from the other chain; once quorum is reached, the door creates the destination account and pays out the rewards.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaddaccountcreateattestation
xls: XLS-0038
amendment: XChainBridge
level: advanced
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

This is the counterpart to [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit). When a witness sees an account-creation commit validated on the other chain, it signs a message with its data (creation number `XChainAccountCreateCount`, amount, reward, source account, account to create, direction) and publishes it here. Since there's no claim ID created by the user, attestations accumulate in an [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID) object **owned by the door**, which the transactor itself creates the first time an attestation arrives for that number.

When quorum is reached and that number is exactly the next one due to the bridge (`XChainAccountClaimCount + 1`), the door creates the `Destination` account with `Amount`, pays the `SignatureReward` to the witnesses **using its own funds** (which the user already advanced on the other chain), and advances the counter. Creations are processed in strict order.

## When to use it

- Only if you operate a witness server. Users never submit it by hand.
- To unblock a queue of creations: if an earlier number lacks quorum, the following ones wait in their objects until their turn comes.

## How it works inside

`attestationPreflight<AttestationCreateAccount>` (in `transactors/bridge/XChainBridge.cpp`): valid public key, well-formed attestation, a signature that verifies over the message using the bridge's specification, valid amounts, and a positive `Amount` with the source chain's asset per `WasLockingChainSend`. Failures: `temMALFORMED` or `temXCHAIN_BAD_PROOF`.

`attestationPreclaim`: the [Bridge](/objects/Bridge) must exist (`tecNO_ENTRY`), the door must have a SignerList (`tecXCHAIN_NO_SIGNERS_LIST`), `AttestationSignerAccount` must be in it (`tecNO_PERMISSION`), and `PublicKey` must correspond to that account (master not disabled, or the correct regular key: `tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR`).

`attestationDoApply` → `applyCreateAccountAttestations`:

1. Reads the Bridge's `XChainAccountClaimCount`. If the attestation's `XChainAccountCreateCount` is ≤ that value, it was already processed: `tecXCHAIN_ACCOUNT_CREATE_PAST`. If it's 128 or more ahead (`kXbridgeMaxAccountCreateClaims`), `tecXCHAIN_ACCOUNT_CREATE_TOO_MANY`.
2. `WasLockingChainSend` must point toward this chain (`tecXCHAIN_WRONG_CHAIN`).
3. If the `XChainOwnedCreateAccountClaimID` for that number doesn't exist, the **door** must cover the reserve for one more object (`tecINSUFFICIENT_RESERVE`); if it exists, its attestations are loaded.
4. `onNewAttestations` adds or replaces this signer's attestation, and `claimHelper` (with `CheckDst::Check`) sums the weights of those that match in amount, direction, and destination account.
5. If there's quorum **and** it's the next number in the queue: `finalizeClaimHelper` transfers `Amount` from the door to `Destination` (it can create the account if `Amount` ≥ base reserve; if not, `tecNO_DST_INSUF_XRP`), distributes `SignatureReward` from the door among the `AttestationRewardAccount`s, and deletes the object. `OnTransferFail::RemoveClaim` is used: even if the creation fails, the claim is removed and the counter advances, so as not to block the following ones. Only `tecINTERNAL`, `tecUNFUNDED_PAYMENT`, and `tef` errors abort the transaction. At the end, the Bridge's `XChainAccountClaimCount` becomes equal to this number.
6. If there's no quorum or it isn't its turn: if the object didn't exist it's created (with `Account` = door, `XChainAccountCreateCount`, and the `XChainCreateAccountAttestations` array), inserted into the door's directory, and its `OwnerCount` is increased; if it existed, the array is updated.

## Key fields

- **XChainAccountCreateCount** — order number assigned by the other chain's Bridge when the commit was made. Determines the position in the queue.
- **Destination** — account to create (or fund, if it already exists) on this chain.
- **Amount** — XRP the account will receive; it's the commit's `Amount`, not including the reward.
- **SignatureReward** — the reward the user advanced; distributed among the witnesses from the door.
- **AttestationSignerAccount** / **PublicKey** / **Signature** — the witness's identity and signature over the attestation message.
- **AttestationRewardAccount** — account that collects this witness's share.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **temXCHAIN_BAD_PROOF** — the signature doesn't cover these fields, or the asset doesn't match the direction.
- **tecXCHAIN_ACCOUNT_CREATE_PAST** — that creation number was already processed.
- **tecXCHAIN_ACCOUNT_CREATE_TOO_MANY** — there are more than 127 pending creations ahead.
- **tecNO_PERMISSION** / **tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR** — the signer isn't on the SignerList, or the key doesn't correspond to them.
- **tecINSUFFICIENT_RESERVE** — the door doesn't cover the reserve for the new attestation object.
- **tecXCHAIN_WRONG_CHAIN** — `WasLockingChainSend` points to the wrong chain.

## Example

```json
{
  "TransactionType": "XChainAddAccountCreateAttestation",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTHER_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "PublicKey": "",
  "Signature": "",
  "OtherChainSource": "rYYYY_OTHER_ACCOUNT",
  "Amount": "20000000",
  "AttestationRewardAccount": "rXXXX_YOUR_ACCOUNT",
  "AttestationSignerAccount": "rXXXX_YOUR_ACCOUNT",
  "WasLockingChainSend": 1,
  "XChainAccountCreateCount": "1",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "SignatureReward": "100"
}
```

`rYYYY_OTHER_ACCOUNT` is the locking chain's door and `rZZZZ_ISSUER` the issuing chain's door. `PublicKey` and `Signature` are left empty because only a real witness can produce them.

## Try it on testnet

1. Load the example into the builder. Without a real witness signature it won't get past `preflight`.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active. With the amendment active and an empty signature, `temMALFORMED` or `temXCHAIN_BAD_PROOF`.
3. Once the amendment is activated and you operate a witness: after `tesSUCCESS` without quorum, `account_objects` of the **door** with `type: "xchain_owned_create_account_claim_id"` will show the object with your attestation in `XChainCreateAccountAttestations`. With quorum and on its turn, the object will disappear, `account_info` of `Destination` will return the created account with `Amount`, and `ledger_entry` of the Bridge will show `XChainAccountClaimCount` equal to `XChainAccountCreateCount`.

## Related

- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation)
- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [SignerListSet](/tx/SignerListSet)
- [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
