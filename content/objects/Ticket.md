---
title: Ticket
summary: Reserves a sequence number for later use, out of order, instead of spending the account's normal Sequence.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ticket
createdBy: TicketCreate
modifiedBy: (ninguna; se consume al usarse en cualquier transacción)
reserve: 1
---

## What it represents

Normally every transaction from an account must carry the exact `Sequence`, the next one after the last used, in strict order. A `Ticket` breaks that requirement: it reserves a number in advance that can then be spent at any time, in any order relative to the account's other transactions, simply by setting `Sequence: 0` and `TicketSequence: <ticket number>` on the transaction that uses it.

This is useful for flows where several transactions are prepared in advance and signed offline but sent in an order that cannot be guaranteed (multi-signing with several signers working in parallel, transactions conditioned on external events), or simply to reserve a sequence slot that will be filled in later.

## Lifecycle

- **Creation**: [TicketCreate](/tx/TicketCreate) can create several at once (`TicketCount`), consuming consecutive normal `Sequence` values from the account to number them. Each one becomes an independent `Ticket`.
- **Consumption**: any later transaction from the account that uses `TicketSequence` instead of `Sequence` consumes (deletes) that `Ticket` when it is applied, regardless of the transaction type — there is no separate "TicketUse" transaction.
- **Explicit cancellation**: does not exist; to get rid of a ticket without using it, it has to be spent on a trivial transaction (e.g. an `AccountSet` with no changes) or left unused indefinitely (it keeps consuming reserve).

## Key fields

- **Account** — owner of the ticket, who pays its reserve.
- **TicketSequence** — the reserved number; this is what is referenced from another transaction in its `TicketSequence` field, instead of `Sequence`.
- **OwnerNode** — the account's directory page where it is linked.

## Flags

It has no `lsf*` flags.

## How to query it

`account_objects` with `type: "ticket"` returns it for the account. With `ledger_entry`, `ticket` accepts `account` and `ticket_seq`:

```json
{ "method": "ledger_entry", "params": [{ "ticket": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ticket_seq": 20790114 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0054 || AccountID || TicketSequence)` (`keylet::ticket`, namespace `'T'`). Typical response:

```json
{
  "index": "4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E",
  "node": {
    "LedgerEntryType": "Ticket",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "TicketSequence": 20790114,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet) per live ticket, until it is used or until the account is deleted.

## Related

- [TicketCreate](/tx/TicketCreate)
- [AccountRoot](/objects/AccountRoot), [SignerList](/objects/SignerList)
