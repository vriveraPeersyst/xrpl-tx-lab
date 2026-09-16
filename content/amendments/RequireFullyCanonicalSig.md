---
title: RequireFullyCanonicalSig
summary: Requires ECDSA secp256k1 signatures to be strictly canonical, closing a transaction malleability vector.
xrplDocs: https://xrpl.org/resources/known-amendments#requirefullycanonicalsig
introducedIn: 0.30.1
---

## What changes

ECDSA signatures over the secp256k1 curve (the scheme used by default on XRPL before Ed25519 became available) have a malleability property: for a given valid signature `(r, s)`, the value `(r, n - s)` (where `n` is the order of the curve) is also a valid signature over the same message and the same key. This means a third party, without knowing the private key, can take an already-signed transaction and produce a variant with a different but equally valid signature, changing the transaction's hash without invalidating it.

RequireFullyCanonicalSig requires that the ECDSA signatures submitted be "fully canonical": of the two mathematically valid variants of each signature, only the one that satisfies `s <= n/2` (the one with the smaller value) is accepted. The transactor rejects, during transaction validation, any signature that does not meet this form, even if it is cryptographically correct. Ed25519 signatures do not have this issue and are not affected.

## Affected transactions and objects

- Affects signature validation for any transaction signed with a secp256k1 key (practically all transaction types, since the check occurs in the common signature verification layer of the transaction engine, not in a specific transactor).
- Does not introduce or modify ledger objects.

## Status and context

Signature malleability was a known issue in several ECDSA-based protocols (Bitcoin resolved it analogously with BIP-62/SegWit). On XRPL, although the sequence identifier and other mechanisms already mitigated double-spending, a transaction with a mutable hash complicated matters for applications that relied on tracking a transaction by its hash before it was validated (for example, to detect whether it had been included in a ledger). RequireFullyCanonicalSig eliminates that ambiguity by enforcing a single valid representation per signature, so that the hash of a signed transaction cannot be altered by a third party without invalidating the signature.
