---
title: PermissionDelegationV1_1
summary: Allows an account to authorize another account to sign only certain types of transactions on its behalf, without sharing keys.
xrplDocs: https://xrpl.org/resources/known-amendments#permissiondelegationv1_1
introducedIn: 3.0.0
---

## What changes

Introduces the `Delegate` object (`ltDELEGATE`), which records that account `Account` has delegated to account `Authorize` a set of permissions (`Permissions`), up to a maximum of `kPermissionMaxSize` entries with no duplicates. Each permission identifies a transaction type or a specific operation that the delegated account can sign on behalf of the delegating account; the list of which transactions are delegable is resolved by `Permission::getInstance().isDelegable(...)`, which also depends on which amendments are active.

`DelegateSet` creates, updates or deletes this object: it rejects in `preflight` with `temMALFORMED` an account delegating permissions to itself, or a permissions list containing a duplicated or non-delegable permission, and in `preclaim` checks that the authorized account exists and is not a pseudo-account (for example, the internal account of an AMM or a Vault, which cannot act as delegates). Once the `Delegate` object is created, the transaction engine (`Transactor.cpp`) checks, for any transaction signed by an account other than the original `Account`, whether that delegation relationship exists and covers the submitted transaction type; only then does it let it through on behalf of the delegating account.

## Affected transactions and objects

- New: [DelegateSet](/tx/DelegateSet), which creates, modifies or removes the delegation (an empty `Permissions` list deletes the object).
- Object: new [Delegate](/objects/Delegate).
- Indirectly affects any transaction signed by the delegated account on behalf of the delegating account, verified against the stored `Permissions`.

## Status and context

Before this mechanism, the only way for a third party to operate on behalf of an account was multisigning or direct control of the key, both of which grant full access to the account. PermissionDelegationV1_1 allows delegating in a granular way—for example, authorizing a bot to send `Payment` but not to change the master key or perform `AccountDelete`—without exposing or sharing credentials, a common pattern in institutional custody and operational automation.
