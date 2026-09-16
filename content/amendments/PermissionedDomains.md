---
title: PermissionedDomains
summary: Defines on-chain domains with a set of accepted credentials, to restrict who can operate within them.
xrplDocs: https://xrpl.org/resources/known-amendments#permissioneddomains
introducedIn: 2.3.0
---

## What changes

Introduces the `PermissionedDomain` object (`ltPERMISSIONED_DOMAIN`): identified by its owner (`Owner`) and a `Sequence`, it stores an `AcceptedCredentials` list of issuer/type pairs of [Credential](/objects/Credential) (up to `kMaxPermissionedDomainCredentialsArraySize` entries). An account belongs to the domain if it holds, accepted and not expired, at least one of the credentials on that list.

`PermissionedDomainSet` creates the domain (without `DomainID`) or updates it (with `DomainID`, checking in `preclaim` that the signer is the `Owner` and that the domain exists); it rejects in `preflight` a `DomainID` equal to zero and validates the credentials array with `credentials::checkArray`. In `preclaim` it also verifies that each issuer of the accepted credentials is an existing account (`tecNO_ISSUER` if not). `PermissionedDomainDelete` deletes the object, as long as its owner authorizes it. The amendment depends on [Credentials](/amendments/Credentials): without it active, `PermissionedDomainSet` is not accepted (`checkExtraFeatures` checks for this).

## Affected transactions and objects

- New: [PermissionedDomainSet](/tx/PermissionedDomainSet) and [PermissionedDomainDelete](/tx/PermissionedDomainDelete).
- Object: new [PermissionedDomain](/objects/PermissionedDomain).
- Consumed by [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [VaultCreate](/tx/VaultCreate) and [VaultSet](/tx/VaultSet), which can restrict their `DomainID` to an existing permissioned domain.

## Status and context

PermissionedDomains translates the concept of a "whitelist of verified participants" into a reusable object on the ledger: instead of each issuer or protocol maintaining its own list of authorized accounts, it defines a set of accepted credentials once, and any transactor can reference it by its `DomainID`. It is the foundational piece on which [PermissionedDEX](/amendments/PermissionedDEX) (markets restricted to a domain) and the lending protocol (vaults and MPTs with issuance restricted to accredited investors) are built.
