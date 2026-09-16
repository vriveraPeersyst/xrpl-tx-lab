---
title: CheckCancel
summary: Removes a Check without cashing it; the issuer or the recipient can do it at any time, and anyone can once it has expired.
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcancel
xls: XLS-0011
amendment: Checks
level: basic
---

## What it does

`CheckCancel` deletes a [Check](/objects/Check) object from the ledger without moving funds. It lets the issuer withdraw a check they no longer want to pay, lets the recipient reject it, or lets anyone clean up an expired check. When it's removed, the check's issuer recovers the owner reserve unit the object occupied.

Since a check never locks up funds, canceling it has no effect on balances at all: only the commitment disappears.

## When to use it

- Withdrawing a check issued by mistake or that no longer applies.
- Rejecting a received check you don't want to cash.
- Freeing up reserve by removing expired checks, your own or someone else's.

## How it works inside

**`CheckCancel::preflight`** (static). With [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) active, as on testnet, a `CheckID` of all zeros is `temMALFORMED`. There are no further type-specific validations.

**`CheckCancel::preclaim`** (against the ledger). It reads the check via `keylet::check(CheckID)`; if it doesn't exist, `tecNO_ENTRY`. It then decides who can cancel it based on expiration, evaluated with `hasExpired` against the parent ledger's close time (the code justifies using the parent ledger because it's the only one whose close time is known with certainty): if the check has **not** expired, the signing account must be the check's `Account` (issuer) or its `Destination`; otherwise `tecNO_PERMISSION`. If it has already expired, anyone can cancel it. A check without `Expiration` never expires, so only its two parties can cancel it.

**`CheckCancel::doApply`** (effects). It reloads the check (`tecNO_ENTRY` if missing), removes it from the destination's owner directory (as long as it isn't a check to oneself, which `CheckCreate` prevents) and from the issuer's directory; if any removal fails, `tefBAD_LEDGER`. It then decrements the issuer's `OwnerCount` with `decreaseOwnerCountForObject` and deletes the object. It doesn't touch any `Balance` other than the fee of whoever sends the transaction.

## Key fields

- **CheckID** — The `index` of the Check object (64-hex hash). It's the only field of its own. You get it from `account_objects` with `type: "check"` on the issuing or the recipient account.

## Common errors

- **tecNO_ENTRY** — There's no check with that `CheckID`; it may have already been cashed or canceled.
- **tecNO_PERMISSION** — The check hasn't expired and you're neither its issuer nor its recipient.
- **temMALFORMED** — `CheckID` is all zeros.
- **tefBAD_LEDGER** — Internal failure removing the object from a directory; shouldn't happen.

## Example

```json
{
  "TransactionType": "CheckCancel",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "CheckID": "49647F0D748DC3FE26BDACBC57F251AADEFFF391403EC9BF87C97F67E9977FB0"
}
```

## Try it on testnet

1. Create a check with [CheckCreate](/tx/CheckCreate) to the other account, with or without `Expiration`.
2. Query `account_objects` with `type: "check"` on your account and copy the `index` into `CheckID`.
3. Send `CheckCancel` from your account (you're the issuer): `tesSUCCESS`.
4. Query `account_objects` again: the check no longer appears, neither on your account nor on the destination's. In `account_info`, your `OwnerCount` has dropped by one and the `Balance` only reflects the fee.
5. To see the permission check in action: create another check, and try canceling it from a third account that is neither issuer nor destination. You'll get `tecNO_PERMISSION` as long as it hasn't expired. If you gave it a short `Expiration` (`{{time+120}}`), wait and retry from that third account: now it does get canceled.

## Related

- [CheckCreate](/tx/CheckCreate) — issues the check.
- [CheckCash](/tx/CheckCash) — the alternative: cashing it.
- [Check](/objects/Check) — the object that gets removed.
- [Checks](/amendments/Checks) — the amendment that introduced checks.
- [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) — rejects a `CheckID` of all zeros.
