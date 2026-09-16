---
title: TicketBatch
summary: Introduces Tickets, which reserve a sequence number to be used later outside the account's strict Sequence order.
xrplDocs: https://xrpl.org/resources/known-amendments#ticketbatch
---

## What changes

Normally, each transaction from an account must carry the exact `Sequence` value that is next in line, one more than the last applied transaction, so only the next one in strict order can be signed and submitted. TicketBatch adds the `TicketCreate` transaction, which consumes one or more consecutive sequence numbers from the account (between 1 and 250 per call, limited by `kMinValidCount`/`kMaxValidCount`) and creates a `Ticket` object for each one, identified by its own `TicketSequence`.

Once created, a Ticket can be used in any later transaction in place of the normal `Sequence`: the transaction sets `TicketSequence` instead of incrementing `Sequence`, and the Ticket is consumed (deleted from the ledger) when applied. This decouples the moment of "reserving a slot" from the moment of "signing and submitting the specific transaction," allowing, for example, pre-signing several transactions to be executed in an order different from the one they had when signed, or coordinating transactions among several parties (such as a multi-signed `SignerListSet`) without being blocked by the account's strict sequence.

## Affected transactions and objects

- New: [TicketCreate](/tx/TicketCreate).
- New object: [Ticket](/objects/Ticket), with the `TicketSequence` field.
- All transactions can use `TicketSequence` instead of `Sequence` to execute out of order.

## Status and context

Before TicketBatch, any flow that needed to execute transactions in an order different from their creation order (deferred transactions, signer-list changes coordinated among several accounts, or simply reserving a slot for later use) had to manually manage `Sequence` and risk having an intermediate transaction break the order. Tickets solve this by separating "reserving the turn" from "using the turn," and are especially useful together with signer lists and multi-signed transactions, where coordinating an exact `Sequence` among several signers is impractical.
