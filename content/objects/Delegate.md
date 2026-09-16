---
title: Delegate
summary: Records which permissions an account has delegated to another so it can send certain transactions on its behalf.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/delegate
createdBy: DelegateSet
modifiedBy: DelegateSet
reserve: 1
---

## What it represents

A `Delegate` is a limited power of attorney. The `Account` account authorizes the `Authorize` account to sign and send certain transactions as if it were itself. The delegated transaction carries the `Delegate` field with the delegate's address and is signed with the delegate's keys; the delegate pays the fee, but the effects (and the `Sequence`) belong to the delegating account.

Permissions can be entire transaction types (`Payment`, `TrustSet`, `OfferCreate`…) or granular permissions such as `PaymentMint`, `PaymentBurn`, `TrustlineAuthorize`, `TrustlineFreeze`, `AccountDomainSet`, or `MPTokenIssuanceLock`. Types marked as non-delegable in `transactions.macro` (for example `AccountDelete`, `SetRegularKey`, `SignerListSet`, `DelegateSet`, `Batch`) can never appear here.

**Testnet status**: [DelegateSet](/tx/DelegateSet) requires the [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1) amendment, which is not currently enabled. You won't be able to create this object on public testnet until it's enabled.

## Lifecycle

- **Creation and modification**: [DelegateSet](/tx/DelegateSet) with the full list of `Permissions`. If the object doesn't exist, `DelegateSet::doApply` creates it, links it into the delegator's directory (`OwnerNode`) and into the delegate's (`DestinationNode`), and charges 1 reserve unit to the delegator. If it exists, it replaces the entire list; there's no "add one".
- **Deletion**: sending `DelegateSet` with an empty `Permissions` deletes the object and returns the reserve. [AccountDelete](/tx/AccountDelete) of either account also removes it.

`preflight` rejects duplicate permissions, more than 10 permissions, delegating to oneself, and any non-delegable permission.

## Key fields

- **Account** — the delegator. Its funds and state are the ones affected.
- **Authorize** — the one receiving the power. This is the one who signs the delegated transactions.
- **Permissions** — array of `Permission` with `PermissionValue`. A transaction type is encoded as its type number plus 1; granular permissions have their own values (65537 and up). In JSON they're shown by name.
- **OwnerNode / DestinationNode** — pages of the delegator's and delegate's directories.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "delegate"` on either account. With `ledger_entry`:

```json
{ "method": "ledger_entry", "params": [{ "delegate": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

The key is `SHA512Half(0x0083 || Account || Authorize)` (`keylet::delegate`). Typical response:

```json
{
  "node": {
    "LedgerEntryType": "Delegate",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Permissions": [
      { "Permission": { "PermissionValue": "Payment" } },
      { "Permission": { "PermissionValue": "TrustlineAuthorize" } }
    ],
    "Flags": 0,
    "OwnerNode": "0",
    "DestinationNode": "0",
    "PreviousTxnID": "0A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718293A4B5C6D7E8F9",
    "PreviousTxnLgrSeq": 20800140
  }
}
```

## Reserve

1 owner reserve unit charged to the delegating account.

## Related

- [DelegateSet](/tx/DelegateSet), [Payment](/tx/Payment), [TrustSet](/tx/TrustSet)
- [SignerList](/objects/SignerList), [AccountRoot](/objects/AccountRoot)
- [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1)
</content>
</invoke>
