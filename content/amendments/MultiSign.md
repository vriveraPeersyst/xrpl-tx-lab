---
title: MultiSign
summary: Introduces multi-signing of transactions via SignerListSet, the SignerList object, and the Signers field.
xrplDocs: https://xrpl.org/resources/known-amendments#multisign
---

## What changes

Before MultiSign, an XRPL account could only authorize transactions with its master key or its regular key: a single signature, from a single key. MultiSign adds an alternative: an account can define a list of authorized signers with `SignerListSet`, which creates a `SignerList` object with up to 8 entries (`SignerEntries`), each with a signer's address and a weight (`SignerWeight`), plus a minimum `SignerQuorum` that must be reached by summing weights for the set of signatures to be valid.

With a `SignerList` configured, any transaction can omit the usual single signature and instead populate the `Signers` field: an array of key/signature pairs, one for each participating signer, ordered by address. rippled only accepts the transaction if the sum of the weights of the keys that signed correctly reaches the `SignerQuorum`. This makes it possible to require "2 of 3" administrators, give more weight to some keys than others, or delegate day-to-day operations to lower-trust keys without exposing the master key.

## Affected transactions and objects

- New: [SignerListSet](/tx/SignerListSet), to create, modify, or delete an account's signer list.
- New object: [SignerList](/objects/SignerList).
- `Signers` field available in the common fields of any transaction, as an alternative to a single signature.

## Status and context

It was one of the first rippled amendments and solves a basic custody problem: without multi-signing, any operation (for example, an exchange's treasury) depends on a single private key as a single point of failure. MultiSign is the precursor amendment on which later improvements were built, such as `ExpandedSignerList` (raising the limit from 8 to 32 signers) and `MultiSignReserve` (removing the per-entry reserve for the list), both now retired due to age just like MultiSign.
