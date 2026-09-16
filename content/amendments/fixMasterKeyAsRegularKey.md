---
title: fixMasterKeyAsRegularKey
summary: Prohibits setting an account's regular key equal to its own master key, to prevent the account from becoming locked.
xrplDocs: https://xrpl.org/resources/known-amendments#fixmasterkeyasregularkey
---

## What changes

[SetRegularKey](/tx/SetRegularKey) allows an account to be associated with an alternate key pair (`RegularKey`) that can sign transactions without exposing the master key. Before the fix, nothing prevented the value of `RegularKey` from matching the `AccountID` derived from the account's own master key. If that account later disabled the master key with `AccountSet` (`lsfDisableMaster`) and had no `SignerList` configured, it would be left without any usable key: the master key was disabled and the "alternate" regular key was, in fact, the same unusable key.

With `fixMasterKeyAsRegularKey` active, `SetRegularKey::preflight` rejects with `temBAD_REGKEY` any transaction whose `RegularKey` field equals the `Account` (comparing the `AccountID`, which is how it is derived from the master key). This prevents setting up, from the outset, a situation that could unintentionally lock (blackhole) the account.

## Affected transactions and objects

- [SetRegularKey](/tx/SetRegularKey): validation added in `preflight`.
- [AccountRoot](/objects/AccountRoot): indirectly protects the `RegularKey` field against this invalid configuration.

## Status and context

Closes an unwanted self-lockout path: before this fix, a user could accidentally disable their own account by combining `SetRegularKey` with a `RegularKey` equal to their address and a subsequent `AccountSet` with `lsfDisableMaster`. The amendment is retired in the code: the check is now a permanent part of `SetRegularKey`.
