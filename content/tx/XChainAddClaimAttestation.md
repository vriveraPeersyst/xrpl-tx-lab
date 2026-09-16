---
title: XChainAddClaimAttestation
summary: A witness attests that it saw an XChainCommit on the other chain; once quorum is reached, the door delivers the funds and pays out the rewards.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaddclaimattestation
xls: XLS-0038
amendment: XChainBridge
level: advanced
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

This transaction is sent by **witnesses**, not by users. A witness is a server that observes both chains; when it sees an [XChainCommit](/tx/XChainCommit) validated on the source chain, it builds a message with the send's data (claim ID, amount, source account, optional destination, reward account, send direction, and bridge specification), signs it with its key, and publishes it on the destination chain with `XChainAddClaimAttestation`. Any account can submit the transaction (it pays the fee), but the signature that counts is the witness's (`PublicKey` + `Signature`), and its account (`AttestationSignerAccount`) must be on the door's SignerList.

The attestation is stored in the `XChainClaimAttestations` array of the corresponding [XChainOwnedClaimID](/objects/XChainOwnedClaimID). When the sum of the weights of witnesses attesting to the same thing reaches the door's `SignerQuorum`, and the attestation includes `Destination`, the transfer completes in the same transaction: the door pays the destination, the owner of the claim ID pays the rewards, and the claim ID is deleted. If there's no `Destination`, the owner will need to send [XChainClaim](/tx/XChainClaim).

## When to use it

- Only if you operate a witness server for the bridge. An end user never sends it by hand.
- To replace an attestation after a change to the SignerList: attestations from signers who are no longer on it are discarded and must be resubmitted.

## How it works inside

`attestationPreflight<AttestationClaim>` (in `transactors/bridge/XChainBridge.cpp`):

- `PublicKey` must be a valid key (`temMALFORMED`) and the fields must form a well-constructed attestation.
- Verifies the signature over the serialized message (`AttestationClaim::message`) using the bridge's specification (`temXCHAIN_BAD_PROOF`).
- `Amount` must be positive and its asset that of the **source** chain per `WasLockingChainSend` (`temXCHAIN_BAD_PROOF`).

`attestationPreclaim`:

- The [Bridge](/objects/Bridge) must exist (`tecNO_ENTRY`) and the door must have a SignerList (`tecXCHAIN_NO_SIGNERS_LIST`).
- `checkAttestationPublicKey`: `AttestationSignerAccount` must be on the list (`tecNO_PERMISSION`). If `PublicKey` is that account's master key, it must not have `lsfDisableMaster`; if it isn't, it must be its `RegularKey`. If the account doesn't exist on the ledger, the key must derive exactly to it. Any mismatch: `tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR`.

`attestationDoApply` → `applyClaimAttestations`:

1. The `XChainOwnedClaimID` with that `XChainClaimID` must exist (`tecXCHAIN_NO_CLAIM_ID`).
2. `OtherChainSource` must match the one stored in the claim ID (`tecXCHAIN_SENDING_ACCOUNT_MISMATCH`), and `WasLockingChainSend` must point toward this chain (`tecXCHAIN_WRONG_CHAIN`).
3. `onNewAttestations`: if there was already an attestation from that signer, it's **replaced**; if not, it's added. Then `claimHelper` purges those from invalid signers and sums the weights of those that match in amount, direction, **and destination** (`CheckDst::Check`) with the one just added.
4. If there's quorum and the attestation carries `Destination`, `finalizeClaimHelper` transfers from the door to the destination (`CanCreateDstPolicy::Yes`, so it can create the account if it's XRP ≥ base reserve), distributes the claim ID's `SignatureReward` from its owner among the `AttestationRewardAccount`s, and deletes the claim ID. If the main transfer fails, the claim is **kept** (`KeepClaim`), and the transaction returns the error only if the attestation list didn't change; if it did change, the attestation is saved and the tx succeeds even though nothing was delivered.
5. Without quorum or without a destination, only the attestations array is updated.

## Key fields

- **AttestationSignerAccount** — the witness's account on the door's SignerList; its weight is what quorum depends on.
- **PublicKey** / **Signature** — the key used to sign the attestation message, and the signature. This is not the transaction's own signature.
- **OtherChainSource** — the account that made the `XChainCommit` on the other chain; must match the claim ID's.
- **Amount** — amount in the source chain's asset (the commit's).
- **WasLockingChainSend** — 1 if the commit was on the locking chain, 0 if on the issuing chain.
- **AttestationRewardAccount** — account that will collect this witness's share of the reward.
- **Destination** — optional; what the commit specified in `OtherChainDestination`. With it, delivery is automatic.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **temXCHAIN_BAD_PROOF** — the signature doesn't verify over the submitted fields, or the asset/amount doesn't match the send direction.
- **tecNO_PERMISSION** — the signer isn't on the door's SignerList.
- **tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR** — the public key doesn't correspond to the signing account (master disabled, or a different regular key).
- **tecXCHAIN_NO_CLAIM_ID** — the claim ID doesn't exist or was already consumed.
- **tecXCHAIN_SENDING_ACCOUNT_MISMATCH** — `OtherChainSource` isn't the claim ID's.
- **tecXCHAIN_WRONG_CHAIN** — `WasLockingChainSend` points to the wrong chain.

## Example

```json
{
  "TransactionType": "XChainAddClaimAttestation",
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
  "Amount": "1000000",
  "AttestationRewardAccount": "rXXXX_YOUR_ACCOUNT",
  "AttestationSignerAccount": "rXXXX_YOUR_ACCOUNT",
  "WasLockingChainSend": 1,
  "XChainClaimID": "1"
}
```

`rYYYY_OTHER_ACCOUNT` is the locking chain's door and `rZZZZ_ISSUER` the issuing chain's door. `PublicKey` and `Signature` are left empty because only a real witness can produce them: the signature must cover exactly these serialized fields.

## Try it on testnet

1. Load the example into the builder. Without a real witness signature over the message, the transaction will never get past `preflight`.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active. With the amendment active but an empty `Signature`, you'd get `temMALFORMED` or `temXCHAIN_BAD_PROOF`.
3. Once the amendment is activated and you operate a witness: after `tesSUCCESS` without quorum, `ledger_entry` of the `XChainOwnedClaimID` will show one more entry in `XChainClaimAttestations`. With quorum and `Destination`, the object will disappear, the destination will have received `Amount`, and each `AttestationRewardAccount` its share of the `SignatureReward`.

## Related

- [XChainCommit](/tx/XChainCommit), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainClaim](/tx/XChainClaim)
- [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation)
- [SignerListSet](/tx/SignerListSet)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
