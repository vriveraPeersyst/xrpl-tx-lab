---
title: MPTokenIssuanceDestroy
summary: Removes an MPT issuance that no longer has units in circulation and returns its reserve to the issuer.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuancedestroy
xls: XLS-0033
amendment: MPTokensV1
level: basic
---

## What it does

`MPTokenIssuanceDestroy` deletes the [MPTokenIssuance](/objects/MPTokenIssuance) object from the ledger. Only the issuer can do this, and only when `OutstandingAmount` is 0 — that is, when all holders have returned their units to the issuer (a [Payment](/tx/Payment) to the issuer "burns" them) or the issuer has recovered them with [Clawback](/tx/Clawback).

Holders' [MPToken](/objects/MPToken) objects are not deleted automatically; each holder removes theirs with [MPTokenAuthorize](/tx/MPTokenAuthorize) and `tfMPTUnauthorize`. They can do this before or after the issuance is destroyed.

## When to use it

- Retiring a test token or an issuance that has already served its purpose.
- Recovering the reserve unit (0.2 XRP) occupied by the issuance.
- Cleanly closing a points program after redeeming all balances.

## How it works inside

**`MPTokenIssuanceDestroy::preflight`** adds no checks of its own.

**`MPTokenIssuanceDestroy::preclaim`**:
1. Looks up the issuance by `MPTokenIssuanceID`; if it doesn't exist → `tecOBJECT_NOT_FOUND`.
2. Its `Issuer` must be your account; if not → `tecNO_PERMISSION`.
3. `OutstandingAmount` must be 0; if not → `tecHAS_OBLIGATIONS`.
4. `LockedAmount` (units held in escrows with [TokenEscrow](/amendments/TokenEscrow)) must also be 0; if not → `tecHAS_OBLIGATIONS`.

**`MPTokenIssuanceDestroy::doApply`**: removes the issuance from your owner directory (`tefBAD_LEDGER` if the link is broken), lowers your `OwnerCount` by 1, and deletes the object.

## Key fields

- **MPTokenIssuanceID** — the 48-hex-character identifier of the issuance. You'll find it in `account_objects` (`type: "mpt_issuance"`) or in the `mpt_issuance_id` field of the creation transaction.

## Common errors

- **tecOBJECT_NOT_FOUND** — the ID doesn't correspond to any issuance (the example uses all zeros; replace it).
- **tecNO_PERMISSION** — the issuance exists but isn't yours.
- **tecHAS_OBLIGATIONS** — there are still units held by holders or locked in escrow. Ask holders to return them, or use `Clawback` if the issuance has `lsfMPTCanClawback`.

## Example

```json
{
  "TransactionType": "MPTokenIssuanceDestroy",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

## Try it on testnet

1. Create an issuance with [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) and copy its `MPTokenIssuanceID`.
2. Load the example with that ID and submit: `tesSUCCESS`. In `account_objects` (`type: "mpt_issuance"`) it no longer appears, and `OwnerCount` has dropped by 1.
3. To see `tecHAS_OBLIGATIONS`: create another issuance, have the other account authorize it with [MPTokenAuthorize](/tx/MPTokenAuthorize), send it 100 units with a `Payment`, and try to destroy it.
4. Have the other account send the 100 units back to you with a `Payment` (`OutstandingAmount` returns to 0) and repeat the destruction: this time it works.

## Related

- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenAuthorize](/tx/MPTokenAuthorize), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken)
- [MPTokensV1](/amendments/MPTokensV1), [TokenEscrow](/amendments/TokenEscrow)
