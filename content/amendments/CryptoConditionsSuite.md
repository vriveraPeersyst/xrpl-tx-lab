---
title: CryptoConditionsSuite
summary: Incomplete amendment intended to add more crypto-condition types to Escrow; the ID was reserved and it does nothing.
xrplDocs: https://xrpl.org/resources/known-amendments#cryptoconditionssuite
introducedIn: 0.60.0
---

## What changes

Nothing useful. The intent was to support in `EscrowCreate` and `EscrowFinish` the remaining condition types from the crypto-conditions specification (PREFIX-SHA-256, THRESHOLD-SHA-256, RSA-SHA-256, ED25519-SHA-256), in addition to the PREIMAGE-SHA-256 already supported by [Escrow](/amendments/Escrow). However, the amendment was included in rippled 0.60.0 before the implementation was finished, so the code under its ID does practically nothing.

Modifying that code would have created a divergence with nodes already running the published version, so it was decided not to touch it: if more condition types are added in the future, it will have to be with a new amendment and a different ID.

## Affected transactions and objects

- None. Cryptographic conditions remain limited to PREIMAGE-SHA-256 in [EscrowCreate](/tx/EscrowCreate) and [EscrowFinish](/tx/EscrowFinish), on top of the [Escrow](/objects/Escrow) object.

## Status and context

This is the classic example of why an amendment must be finished before it is published: an amendment's ID is the hash of its name, and the behavior it activates is fixed as soon as a rippled version distributes it. It is marked as deprecated in the official documentation and retired in the code (`XRPL_RETIRE_FEATURE`). See also [CryptoConditions](/amendments/CryptoConditions).
