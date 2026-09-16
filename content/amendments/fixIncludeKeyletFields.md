---
title: fixIncludeKeyletFields
summary: Stores the creating transaction's Sequence inside several ledger objects, so their keylet can be recomputed without external data.
xrplDocs: https://xrpl.org/resources/known-amendments#fixincludekeyletfields
---

## What changes

Objects such as [PayChannel](/objects/PayChannel), [Escrow](/objects/Escrow), [SignerList](/objects/SignerList), or the results of [OracleSet](/tx/OracleSet) are identified by a keylet derived, among other data, from the account and the `Sequence` (or `Ticket`) of the transaction that created them. Before this fix, that `Sequence` was not stored in the object itself: to re-derive its keylet you had to separately know the original sequence number, which is not always available with just the object in hand (for example when reconstructing it from a snapshot or from metadata). With `fixIncludeKeyletFields` active, [PaymentChannelCreate](/tx/PaymentChannelCreate), [EscrowCreate](/tx/EscrowCreate), [SignerListSet](/tx/SignerListSet), and [OracleSet](/tx/OracleSet) write the `Sequence` field inside the created object.

## Affected transactions and objects

- [PayChannel](/objects/PayChannel), [Escrow](/objects/Escrow), [SignerList](/objects/SignerList), and the Oracle object: gain the `Sequence` field.
- [PaymentChannelCreate](/tx/PaymentChannelCreate), [EscrowCreate](/tx/EscrowCreate), [SignerListSet](/tx/SignerListSet), [OracleSet](/tx/OracleSet): write that field when creating the object.

## Status and context

Without the `Sequence` stored in the object, any tool or service that needs to reconstruct the keylet of one of these objects using only its ledger representation (without access to the transaction history) could not do so. This fix makes these objects self-contained with respect to their own keylet, simplifying indexers, light clients, and auditing tools that work only with ledger state.
