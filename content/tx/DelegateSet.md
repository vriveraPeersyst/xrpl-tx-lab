---
title: DelegateSet
summary: Authorizes another account to send specific transactions on your behalf, without giving it your keys.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/delegateset
amendment: PermissionDelegationV1_1
level: advanced
---

## What it does

`DelegateSet` creates or updates a `Delegate` object: a list of permissions your account grants to another account (`Authorize`) to operate on your behalf. Instead of sharing your private key or setting up a full [SignerList](/objects/SignerList), you selectively delegate which transaction types —or which granular permissions— that other account can sign as if it were you.

Sending the transaction with an empty permissions list (`Permissions: []`) on an existing delegation removes it; there's no separate `DelegateDelete` transaction.

**This transaction type depends on the `PermissionDelegationV1_1` amendment, which is not currently active on testnet.** Any attempt to send it fails with `temDISABLED` until it's activated.

## When to use it (once the amendment is active)

- Giving an automated service (a bot, a backend) permission to send `Payment` on your behalf without exposing your master key to it.
- Delegating specific DEX operations (creating/canceling offers) to a separate trading account from your custody account.
- Granting granular permissions (e.g., `TrustlineAuthorize`) without delegating an entire transaction type.

## How it works inside

**`DelegateSet::preflight`** caps `Permissions` at a maximum number of entries (`temARRAY_TOO_LARGE`), prevents authorizing yourself (`Account == Authorize` gives `temMALFORMED`), rejects repeated permissions in the same list, and checks, via `Permission::getInstance().isDelegable`, that each value is a transaction type or permission that is actually delegable (some sensitive transactions, such as account or governance ones, cannot be delegated).

**`DelegateSet::preclaim`** requires that the `Authorize` account exist (`tecNO_TARGET` if not) and that it not be a pseudo-account such as an AMM or Vault (`tecPSEUDO_ACCOUNT`). If you send an empty `Permissions` to delete a delegation that doesn't exist, it fails with `tecNO_ENTRY`.

**`DelegateSet::doApply`** looks for an existing `Delegate` object for the pair (your account, `Authorize`): if it exists and the permissions list you send is empty, it deletes it; if it exists and the list isn't empty, it replaces it entirely; if it doesn't exist, it creates the object (checking owner reserve, `tecDIR_FULL` if any directory is full) and links it in both your owner directory and the authorized account's directory, so `AccountDelete` can clean it up if that account is deleted later.

## Key fields

- **Authorize** — the account you grant permissions to. It cannot be your own account or a pseudo-account.
- **Permissions** — list of delegated permissions, each as `{ Permission: { PermissionValue: "..." } }`. It can be the name of a transaction type (e.g., `"Payment"`) or a more specific granular permission (see `/permissions`). An empty list removes the existing delegation.

## Common errors

- **temDISABLED** — the `PermissionDelegationV1_1` amendment isn't active (the current case on testnet).
- **temMALFORMED** — you're trying to delegate to your own account, you repeat a permission in the list, or you include a non-delegable permission.
- **tecNO_TARGET** — the `Authorize` account doesn't exist.
- **tecPSEUDO_ACCOUNT** — `Authorize` is a pseudo-account (AMM, Vault, LoanBroker).
- **tecNO_ENTRY** — you send an empty permissions list on a delegation that didn't exist.
- **tecDIR_FULL** — the owner directory of one of the two accounts is full.

## Try it on testnet

Since the `PermissionDelegationV1_1` amendment isn't active on testnet today, any `DelegateSet` you send from this page's builder will return `temDISABLED`. You can still check it: sign and send the example and observe the result code. When the network activates the amendment, the same flow will create the `Delegate` object and you'll be able to query it with `account_objects` (`type: "delegate"`).

## Example

```json
{
  "TransactionType": "DelegateSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Authorize": "rYYYY_OTHER_ACCOUNT",
  "Permissions": [
    { "Permission": { "PermissionValue": "Payment" } },
    { "Permission": { "PermissionValue": "TrustlineAuthorize" } }
  ]
}
```

Would delegate to `rYYYY_OTHER_ACCOUNT` the ability to send `Payment` and authorize trust lines on your behalf, once the amendment is active.

## Related

- [SignerListSet](/tx/SignerListSet) — full multi-signing, a heavier alternative to selective delegation.
- [AccountDelete](/tx/AccountDelete) — cleans up incoming and outgoing delegations when deleting an account.
- Amendments: [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1).
