---
title: MPTokenIssuanceSet
summary: Locks or unlocks an MPT issuance (or a specific holder); with DynamicMPT it also mutates metadata and capabilities.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuanceset
amendment: MPTokensV1
level: intermediate
---

## What it does

`MPTokenIssuanceSet` is the issuer's control tool over an already-created Multi-Purpose Token issuance. Today on testnet, with only [MPTokensV1](/amendments/MPTokensV1) active, its function is that of an emergency switch: lock (`tfMPTLock`) or unlock (`tfMPTUnlock`) the entire issuance — if you created it with the `lsfMPTCanLock` capability — or, by specifying `Holder`, a specific holder. While locked, that balance cannot be transferred.

The [DynamicMPT](/amendments/DynamicMPT) amendment greatly extends this transaction (mutating `TransferFee`, `MPTokenMetadata`, marking capabilities as immutable with `ImmutableFlags`...), but **it is not active on testnet today**: any mutation field (`TransferFee`, `MPTokenMetadata`, `ImmutableFlags`, or the ElGamal keys from [ConfidentialTransfer](/amendments/ConfidentialTransfer), also inactive) returns `temDISABLED`. In practice, on testnet you can only use the lock/unlock flags.

## When to use it

- Freezing circulation of an issuance in response to an incident (global lock with `tfMPTLock`, without `Holder`).
- Locking a specific holder on suspicion of fraud, leaving the rest of the circulation untouched.
- Reverting the lock (`tfMPTUnlock`) once the incident is resolved.

## How it works inside

**`MPTokenIssuanceSet::preflight`** first computes whether the transaction is a "mutation" (`isMutate`): whether it includes `TransferFee`, `MPTokenMetadata`, `ImmutableFlags`, or any capability enable/disable flag. If `isMutate` is true but [DynamicMPT](/amendments/DynamicMPT) is not active, it returns `temDISABLED` immediately — the path you'll see today on testnet if you try to use those fields. It also rejects `tfMPTLock` and `tfMPTUnlock` together (`temINVALID_FLAG`) and `Holder` being the issuer account itself (`temMALFORMED`).

**`MPTokenIssuanceSet::preclaim`** requires the issuance to exist (`tecOBJECT_NOT_FOUND`). To lock/unlock, it requires the issuance to have been created with the `lsfMPTCanLock` capability (if not, locking isn't available). If you specify `Holder`, that holder must already have an `MPToken` for the issuance (`tecOBJECT_NOT_FOUND` if they don't).

**`MPTokenIssuanceSet::doApply`** turns the `lsfMPTLocked` flag on or off on the `MPTokenIssuance` (global lock, no `Holder`) or on the specific holder's `MPToken`.

## Key fields

- **MPTokenIssuanceID** — the issuance you're operating on.
- **Holder** — optional; if specified, the lock/unlock affects only that holder. If omitted, it affects the entire issuance.
- **TransferFee**, **MPTokenMetadata**, **ImmutableFlags**, **IssuerEncryptionKey**, **AuditorEncryptionKey** — mutation fields that require [DynamicMPT](/amendments/DynamicMPT) or [ConfidentialTransfer](/amendments/ConfidentialTransfer); not functional on testnet today.

## Flags

- **tfMPTLock** — locks the entire issuance, or the holder specified in `Holder`. Requires the issuance to have `lsfMPTCanLock`.
- **tfMPTUnlock** — reverts the lock. You cannot combine it with `tfMPTLock` in the same transaction.

## Common errors

- **temDISABLED** — you used a mutation field (`TransferFee`, `MPTokenMetadata`, `ImmutableFlags`, ElGamal keys) without the corresponding amendment active; this is what you'll see today on testnet if you include them.
- **temINVALID_FLAG** — you set `tfMPTLock` and `tfMPTUnlock` at the same time.
- **temMALFORMED** — `Holder` is your own issuer account.
- **tecOBJECT_NOT_FOUND** — the issuance doesn't exist, or the specified `Holder` has no `MPToken` for it.
- **tecNO_PERMISSION** — you're not the issuer of the specified issuance.

## Example

```json
{
  "TransactionType": "MPTokenIssuanceSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "Flags": 1
}
```

Locks the entire issuance (`Flags: 1` = `tfMPTLock`). Use `Flags: 2` for `tfMPTUnlock`, and add `Holder` to act only on a specific holder.

## Try it on testnet

1. Create an issuance with `lsfMPTCanLock` enabled using `MPTokenIssuanceCreate` (Flags includes the "can lock" bit).
2. Have another account create its `MPToken` with [MPTokenAuthorize](/tx/MPTokenAuthorize).
3. Submit the example with `Flags: 1` to lock the whole issuance.
4. Try a `Payment` of that MPT to the holder: verify that it fails while it's locked.
5. Submit `MPTokenIssuanceSet` with `Flags: 2` to unlock, and repeat the `Payment`: now it succeeds.

## Related

- [MPTokenAuthorize](/tx/MPTokenAuthorize) — creates the `MPToken` that this transaction locks/unlocks.
- [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy) — destroys the entire issuance once it's no longer circulating.
- Objects: [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken).
- Amendments: [MPTokensV1](/amendments/MPTokensV1), [DynamicMPT](/amendments/DynamicMPT), [ConfidentialTransfer](/amendments/ConfidentialTransfer).
