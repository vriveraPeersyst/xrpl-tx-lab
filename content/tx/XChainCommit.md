---
title: XChainCommit
summary: Locks funds in the source chain's door account, associated with a claim ID obtained on the destination chain, so witnesses can attest to it.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincommit
xls: XLS-0038
amendment: XChainBridge
level: intermediate
---

## What it does

**Warning: the [XChainBridge](/amendments/XChainBridge) amendment is not active on testnet.** Until it's activated, any submission is rejected with `temDISABLED`.

`XChainCommit` is the step where funds enter the bridge. You send `Amount` to **this** chain's door account, specifying the `XChainClaimID` you obtained earlier on the **other** chain with [XChainCreateClaimID](/tx/XChainCreateClaimID). If this is the locking chain, the funds are locked in the door; if it's the issuing chain, the wrapped asset goes back to the door (which is its issuer) and stops circulating.

The transaction doesn't create any object on the ledger: it's essentially a payment to the door. Its real effect is produced by the **witnesses**, who see the transaction validated and send [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) on the other chain. When quorum is reached there, the destination door delivers the equivalent amount to the specified account.

## When to use it

- Moving XRP or an IOU from the locking chain to the issuing chain (locking and receiving wrapped).
- Returning the wrapped asset from the issuing chain to the locking chain (burning and unlocking).
- Always after already having a claim ID on the destination chain; without it the funds would sit in the door with no way to claim them.

## How it works inside

`XChainCommit::preflight` (in `transactors/bridge/XChainBridge.cpp`):

- `Amount` must be positive and a legal amount (`temBAD_AMOUNT`).
- Its asset must be the `XChainBridge`'s `LockingChainIssue` or `IssuingChainIssue` (`temBAD_ISSUER`).
- `makeTxConsequences` declares `Amount` as the maximum expense if it's XRP.

`XChainCommit::preclaim`:

- Looks up the [Bridge](/objects/Bridge) on this chain; if it doesn't exist, `tecNO_ENTRY`.
- The door cannot commit against itself (`tecXCHAIN_SELF_COMMIT`).
- Determines whether this chain is the locking or issuing one by comparing the Bridge's `Account` against the doors, and requires the asset of `Amount` to be that of **this** side (`tecXCHAIN_BAD_TRANSFER_ISSUE`). That is: on the locking chain you send `LockingChainIssue`; on the issuing chain, `IssuingChainIssue`.

`XChainCommit::doApply` calls `transferHelper` from your account to the door with `CanCreateDstPolicy::No` and `DepositAuthPolicy::Normal`:

- If the door requires a destination tag, `tecDST_TAG_NEEDED`; if it has `lsfDepositAuth` without preauthorizing you, `tecNO_PERMISSION`.
- For XRP, checks `balance ≥ Amount + reserve` (`tecUNFUNDED_PAYMENT`). A detail: the transaction's **fee** is allowed to come out of the reserve (`TransferHelperSubmittingAccountInfo` passes the prior balance before the fee), but not the `Amount`.
- For an IOU, runs a `flow` with no paths, no partial payment, and the issuer paying the transfer fee; any failure that isn't `tec`/`ter` is translated to `tecXCHAIN_PAYMENT_FAILED`.

It doesn't check that the claim ID exists (it's on the other chain) or that `OtherChainDestination` is valid: the transactor **doesn't read** `OtherChainDestination`; only the witnesses use it.

## Key fields

- **XChainClaimID** — the number of the `XChainOwnedClaimID` you created on the destination chain. If you get it wrong, the witnesses will attest to a claim ID that isn't yours (or doesn't exist) and you won't be able to claim.
- **Amount** — amount in this chain's asset. The equivalent on the other chain will have the same numeric value with the other issue.
- **OtherChainDestination** — optional. Account on the other chain that witnesses should attest to as the destination; if you set it, delivery is automatic once quorum is reached. If you omit it, you'll have to send [XChainClaim](/tx/XChainClaim) yourself at the destination.

## Common errors

- **temDISABLED** — the amendment isn't active. This is what you'll see today on testnet.
- **tecNO_ENTRY** — there's no Bridge with that specification on this chain.
- **tecXCHAIN_BAD_TRANSFER_ISSUE** — you've sent the asset from the other side (for example, the wrapped IOU on the locking chain).
- **tecXCHAIN_SELF_COMMIT** — the signing account is the door itself.
- **tecUNFUNDED_PAYMENT** — the `Amount` would leave you below the reserve.
- **tecNO_PERMISSION** — the door has DepositAuth and you're not preauthorized.
- **temBAD_ISSUER** — the asset of `Amount` isn't either of the bridge's two.

## Example

```json
{
  "TransactionType": "XChainCommit",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTHER_ACCOUNT",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_ISSUER",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "XChainClaimID": "1",
  "Amount": "1000000"
}
```

`rYYYY_OTHER_ACCOUNT` is the locking chain's door (this one) and `rZZZZ_ISSUER` the issuing chain's door. You lock 1 XRP for claim ID 1.

## Try it on testnet

1. Load the example into the builder. `XChainClaimID` must be the one you obtained with `XChainCreateClaimID` on the destination chain.
2. Submit it: today you'll get `temDISABLED` because XChainBridge isn't active.
3. Once the amendment is activated and the bridge exists: after `tesSUCCESS`, `account_info` of the door will show its `Balance` increased by `Amount`, and your own will have gone down by `Amount + Fee`. No new object appears in `account_objects`.
4. On the other chain, watch how the `XChainOwnedClaimID` accumulates entries in `XChainClaimAttestations` as witnesses send attestations, until it disappears once the claim is completed.

## Related

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim)
- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID)
- [XChainBridge](/amendments/XChainBridge)
