---
title: PermissionedDomainSet
summary: Creates or modifies a permissioned domain: a set of credentials that grants access to operate within it.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomainset
amendment: PermissionedDomains
level: advanced
---

## What it does

`PermissionedDomainSet` creates (or modifies) a [PermissionedDomain](/objects/PermissionedDomain) object: a list of up to ten issuer/credential-type pairs that define who can enter that domain. Any account that has at least one of those credentials [accepted](/tx/CredentialAccept) meets the access requirement.

Permissioned domains are the piece that connects the identity system ([Credentials](/amendments/Credentials)) with restricted markets: a [PermissionedDEX](/objects/Offer) can require belonging to a specific domain in order to operate in it (`DomainID` on `OfferCreate` or `Payment`), just like certain private [Vault](/objects/Vault) instances. The domain's owner (`Owner`) is always whoever created it; only they can modify it afterward.

## When to use it

- A regulated exchange creates a "verified customers" domain accepting credentials from one or more KYC providers.
- Restricting access to an order book or a vault to accounts holding a specific credential (residency, accredited-investor status, etc.).
- Updating the list of accepted credentials on an existing domain, for example to add a new trusted KYC provider.

## How it works inside

**`PermissionedDomainSet::checkExtraFeatures`** requires [Credentials](/amendments/Credentials) to be active, since the domain is defined in terms of credentials.

**`PermissionedDomainSet::preflight`** validates that `AcceptedCredentials` isn't empty, doesn't exceed the maximum number of entries (10), and has no duplicate issuer/type pairs. If you include `DomainID`, it can't be the zero hash (`temMALFORMED`).

**`PermissionedDomainSet::preclaim`** checks that each `Issuer` among the accepted credentials exists as an account (`tecNO_ISSUER`). If you're modifying an existing domain (`DomainID` present), it must exist (`tecNO_ENTRY`) and you must be its owner (`tecNO_PERMISSION` if not).

**`PermissionedDomainSet::doApply`** creates the object the first time (consuming owner reserve, `tecINSUFFICIENT_RESERVE` if you can't afford it, `tecDIR_FULL` if your directory is full) or completely replaces the existing domain's `AcceptedCredentials` list with the one you send — it's not an incremental addition, it replaces the whole list.

## Key fields

- **DomainID** — omit it to create a new domain; include it (the hash of the existing domain) to modify one of yours. This page's builder computes it on creation.
- **AcceptedCredentials** — a list of up to 10 `Credential` objects with `Issuer` and `CredentialType`. It's enough for the user to have one of them accepted to enter the domain; they don't need all of them.

## Common errors

- **tecNO_ISSUER** — one of the `Issuer` values in `AcceptedCredentials` doesn't exist as an account.
- **tecNO_ENTRY** — you're trying to modify a `DomainID` that doesn't exist.
- **tecNO_PERMISSION** — you're trying to modify a domain that doesn't belong to you.
- **tecINSUFFICIENT_RESERVE** — you don't have enough XRP above the reserve to create the domain.
- **temMALFORMED** — `AcceptedCredentials` is empty, has duplicates, or exceeds the allowed maximum.

## Example

```json
{
  "TransactionType": "PermissionedDomainSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "AcceptedCredentials": [
    { "Credential": { "Issuer": "rYYYY_OTHER_ACCOUNT", "CredentialType": "4B5943" } }
  ]
}
```

Creates a domain that accepts any account with a "KYC" credential issued by `rYYYY_OTHER_ACCOUNT`.

## Try it on testnet

1. Make sure you have at least one test credential issuer (see [CredentialCreate](/tx/CredentialCreate)).
2. Sign and submit the example from the account that will own the domain.
3. Query `account_objects` with `type: "permissioned_domain"`: you'll see the object with its `DomainID` (the hash of the ledger index).
4. Submit a second `PermissionedDomainSet` with that `DomainID` and a different `AcceptedCredentials` list: check that the list is fully replaced.
5. Delete the domain with [PermissionedDomainDelete](/tx/PermissionedDomainDelete) when you're done.

## Related

- [PermissionedDomainDelete](/tx/PermissionedDomainDelete) — deletes the domain.
- [CredentialCreate](/tx/CredentialCreate) and [CredentialAccept](/tx/CredentialAccept) — the credentials that grant access to the domain.
- [VaultCreate](/tx/VaultCreate) — a private vault can be restricted to a domain.
- Objects: [PermissionedDomain](/objects/PermissionedDomain), [Credential](/objects/Credential).
- Amendments: [PermissionedDomains](/amendments/PermissionedDomains), [Credentials](/amendments/Credentials).
