---
title: PermissionedDomainDelete
summary: Deletes a permissioned domain and frees the owner reserve it consumed.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomaindelete
amendment: PermissionedDomains
level: intermediate
---

## What it does

`PermissionedDomainDelete` deletes a [PermissionedDomain](/objects/PermissionedDomain) object from the ledger. Only the owner (`Owner`, whoever created it with [PermissionedDomainSet](/tx/PermissionedDomainSet)) can delete it. Once deleted, any offer or payment that depended on that `DomainID` can no longer validate against it: any `Offer` still active in that domain loses its access scope.

## When to use it

- Withdrawing a restricted-access domain you no longer need to maintain (for example, the program that used it has shut down).
- Cleaning up test domains on testnet.
- Freeing the owner reserve the object consumed.
- Replacing a domain with a new one from scratch when the access criteria change completely, instead of rewriting its `AcceptedCredentials` with [PermissionedDomainSet](/tx/PermissionedDomainSet).

## How it works inside

**`PermissionedDomainDelete::preflight`** requires `DomainID` to not be the zero hash (`temMALFORMED` if it is).

**`PermissionedDomainDelete::preclaim`** checks that the domain exists (`tecNO_ENTRY` if not) and that your account matches the `Owner` stored in the object (`tecNO_PERMISSION` if it's not you).

**`PermissionedDomainDelete::doApply`** removes the object from the owner directory, decreases your `OwnerCount` by 1, and deletes the object from the ledger. It can fail with `tefBAD_LEDGER` if the directory is in an inconsistent internal state, which shouldn't happen under normal conditions.

## Key fields

- **DomainID** — the 256-bit hash identifying the domain, the same one `account_objects` returned when it was created with `PermissionedDomainSet`.

## Common errors

- **tecNO_ENTRY** — no domain exists with that `DomainID`.
- **tecNO_PERMISSION** — the domain exists, but it doesn't belong to you.
- **temMALFORMED** — `DomainID` is the zero hash.

There's no "domain in use" check: you can delete a `PermissionedDomain` even if there are permissioned-DEX offers referencing it; those offers simply stop finding a valid domain when evaluated.

## Example

```json
{
  "TransactionType": "PermissionedDomainDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "DomainID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Replace `DomainID` with the ID of a real domain your account has created; the example value is only a placeholder.

## Try it on testnet

1. Create a domain with [PermissionedDomainSet](/tx/PermissionedDomainSet) if you don't have one.
2. Copy the `DomainID` returned by `account_objects` (`type: "permissioned_domain"`).
3. Sign and submit `PermissionedDomainDelete` with that `DomainID`.
4. Repeat `account_objects`: the domain no longer appears, and your `OwnerCount` in `account_info` has decreased by one.
5. Try deleting it again: you'll get `tecNO_ENTRY`.

## Related

- [PermissionedDomainSet](/tx/PermissionedDomainSet) — creates or modifies it.
- [CredentialDelete](/tx/CredentialDelete) — withdraws the credentials that granted access.
- Objects: [PermissionedDomain](/objects/PermissionedDomain).
- Amendments: [PermissionedDomains](/amendments/PermissionedDomains).
