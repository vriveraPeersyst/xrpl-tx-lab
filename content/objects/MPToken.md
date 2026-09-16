---
title: MPToken
summary: The balance an account holds of a specific Multi-Purpose Token; the equivalent of RippleState but for MPT.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/mptoken
createdBy: MPTokenAuthorize
modifiedBy: MPTokenAuthorize, Payment, Clawback
reserve: 1
---

## What it represents

An `MPToken` is the record that an account holds (or can come to hold) units of a specific [MPTokenIssuance](/objects/MPTokenIssuance). Unlike a trust line, it doesn't require bidirectional negotiation of limits: the holder simply "opts in" by creating this object, and from there can receive the MPT if the issuer allows it. One object per account and per issuance; it is never shared between accounts.

If the issuance has `lsfMPTRequireAuth`, the `MPToken` starts without `lsfMPTAuthorized` and cannot receive funds until the issuer explicitly authorizes it.

## Lifecycle

- **Creation**: [MPTokenAuthorize](/tx/MPTokenAuthorize) without the `tfMPTUnauthorize` flag, sent by the future holder on their own account (never with `Holder`). Creates the object with `MPTAmount` at zero and adds 1 to the holder's `OwnerCount`.
- **Authorization**: if the issuance requires `lsfMPTRequireAuth`, the issuer sends [MPTokenAuthorize](/tx/MPTokenAuthorize) with `Holder` pointing to the holder, to mark `lsfMPTAuthorized` on their `MPToken` without creating a new one.
- **Balance movement**: [Payment](/tx/Payment) with `Amount` in MPT, or `Clawback` from the issuer, adjust `MPTAmount`. If the issuance has `lsfMPTCanLock`, it can also be frozen (`lsfMPTLocked`) or partially locked via `LockedAmount`.
- **Deletion**: [MPTokenAuthorize](/tx/MPTokenAuthorize) with `tfMPTUnauthorize`, only if `MPTAmount` and `LockedAmount` are zero. Reduces the holder's `OwnerCount` by 1.

## Key fields

- **Account** — the holder of the balance.
- **MPTokenIssuanceID** — 192-bit identifier of the issuance it belongs to (`keylet::mptokenIssuance`).
- **MPTAmount** — current balance, in the minimum units defined by the issuance's `AssetScale`.
- **LockedAmount** — part of the balance that is locked (e.g. by an MPT `Escrow` or by the issuer), unavailable to spend.
- **ConfidentialBalanceInbox / ConfidentialBalanceSpending / ConfidentialBalanceVersion** — only if the issuance supports confidential balances: encrypted balance pending merge and encrypted balance available to spend.

## Flags

- **lsfMPTLocked** — the balance is fully frozen; it cannot be sent or received.
- **lsfMPTAuthorized** — the issuer has authorized this holder to operate (only relevant if the issuance requires `lsfMPTRequireAuth`).
- **lsfMPTAMM** — the holder of this `MPToken` is an AMM pool.

## How to query it

`account_objects` with `type: "mptoken"` returns it for the holder. With `ledger_entry`, `mptoken` accepts `mpt_issuance_id` and `account`:

```json
{ "method": "ledger_entry", "params": [{ "mptoken": { "mpt_issuance_id": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F", "account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0074 || MPTokenIssuanceID || AccountID_holder)` (`keylet::mptoken`, namespace `'t'`). Typical response:

```json
{
  "index": "7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C",
  "node": {
    "LedgerEntryType": "MPToken",
    "Account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "MPTokenIssuanceID": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F",
    "MPTAmount": "5000",
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the holder.

## Related

- [MPTokenAuthorize](/tx/MPTokenAuthorize), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [RippleState](/objects/RippleState)
