---
title: TicketCreate
summary: Reserves several sequence numbers (Tickets) at once so you can later send transactions without following Sequence order.
category: multifirma
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ticketcreate
xls: XLS-0013
amendment: TicketBatch
level: intermediate
---

## What it does

Every XRPL account has a `Sequence` counter that forces you to send transactions in strict order: if number 10 isn't applied, number 11 stays waiting. `TicketCreate` breaks that limitation: it consumes a single `Sequence` and, in exchange, creates between 1 and 250 [Ticket](/objects/Ticket) objects, each with its own `TicketSequence`.

The analogy is a numbered ticket book: you tear off several "tickets" at once and then spend them in whatever order you like. A later transaction that uses `TicketSequence: N` instead of `Sequence` doesn't compete with the others and doesn't block anyone if it fails or is delayed.

It's especially useful in multi-signing, where gathering signatures can take days and you don't know in what order the transactions will end up completing. Each Ticket occupies one unit of owner reserve (0.2 XRP on testnet) until it's consumed.

## When to use it

- Preparing several multi-signed transactions in parallel without one blocking the others.
- Signing offline (cold-signing) transactions that will be sent later, without guessing the future `Sequence`.
- Always having an "emergency lane": a Ticket reserved so you can send, for example, a `SetRegularKey` even if other transactions are queued.
- Sending transactions from several systems that share an account and don't coordinate with each other.

## How it works inside

`TicketCreate::preflight` checks only one thing: that `TicketCount` is between `kMinValidCount` (1) and `kMaxValidCount` (250). Outside that range it returns `temINVALID_COUNT`.

`TicketCreate::preclaim` reads the `AccountRoot` (if it doesn't exist, `terNO_ACCOUNT`) and calculates how many Tickets the account will have after applying the transaction: the ones it already has (`TicketCount` from the `AccountRoot`) plus the new ones, minus one if `TicketCreate` itself was sent using a Ticket. If the result exceeds `kMaxTicketThreshold` (250), it returns `tecDIR_FULL`. In other words, an account can never have more than 250 live Tickets at once.

`TicketCreate::doApply` first checks the reserve: the balance before the fee is paid (`preFeeBalance_`) must cover `accountReserve` with `ownerCountDelta = TicketCount`; if not, `tecINSUFFICIENT_RESERVE`. It's compared against the balance *before* the fee on purpose, so that you can dip into the reserve to pay it. It then creates one `Ticket` object per unit: the first `TicketSequence` is the current `Sequence` of the `AccountRoot` (the transaction machinery has already incremented it by 1 when consuming the transaction), and the following ones are consecutive. Each object is inserted into the account's directory (if the directory can't take more entries, `tecDIR_FULL`). At the end it updates the `AccountRoot`'s `TicketCount`, increases `OwnerCount` by `TicketCount` units and raises `Sequence` to `firstTicketSeq + TicketCount`. As a code comment notes, this is the only transaction that can increase an account's `Sequence` by more than one.

`TicketCreate::makeTxConsequences` declares that the transaction consumes `TicketCount` sequences, which the transaction queue uses to avoid accepting more than fit.

This type was introduced by the [TicketBatch](/amendments/TicketBatch) amendment (active on testnet). The current transactor no longer checks for it: it's unconditionally integrated.

## Key fields

- **TicketCount** — how many Tickets you create (1-250). Each one consumes one unit of owner reserve, and the account can't accumulate more than 250.
- **Sequence** — this transaction's `Sequence` (or the `TicketSequence` if you send it with a Ticket). The Tickets created start right at `Sequence + 1`: if you send `TicketCreate` with `Sequence: 100` and `TicketCount: 3`, you get Tickets 101, 102 and 103, and your next normal `Sequence` will be 104.

## Common errors

- **temINVALID_COUNT** — `TicketCount` is 0 or greater than 250.
- **tecDIR_FULL** — the account would end up with more than 250 Tickets. Consume or cancel some first (any transaction sent with `TicketSequence` removes it, even if it fails with a `tec` code).
- **tecINSUFFICIENT_RESERVE** — you don't have enough XRP to cover `TicketCount` additional units of owner reserve. On testnet that's 0.2 XRP per Ticket.
- **terNO_ACCOUNT** — the sending account doesn't exist on the ledger (it hasn't received funds yet).
- **tefPAST_SEQ / terPRE_SEQ** — these aren't from the transactor but from the common machinery: `TicketCreate` itself still needs the correct `Sequence`.

## Example

```json
{
  "TransactionType": "TicketCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "TicketCount": 2
}
```

## Try it on testnet

1. Query your account's `account_info` and note `Sequence` and `OwnerCount`.
2. In the builder, send the example with `TicketCount: 2`.
3. Check `account_info` again: `Sequence` has increased by 3 (1 for the transaction + 2 Tickets), `OwnerCount` by 2, and the `TicketCount: 2` field appears.
4. Run `account_objects` with `type: "ticket"`: you'll see two `Ticket` objects with consecutive `TicketSequence` values.
5. Send any other transaction (for example a [Payment](/tx/Payment)) with `Sequence: 0` and `TicketSequence` equal to one of them. Once validated, the Ticket disappears and `OwnerCount` decreases by 1; your normal `Sequence` doesn't change.
6. Try requesting `TicketCount: 251`: you'll get `temINVALID_COUNT` before even reaching the ledger.

## Related

- [Ticket](/objects/Ticket) — the object it creates.
- [SignerListSet](/tx/SignerListSet) — multi-signing, the main use case for Tickets.
- [AccountSet](/tx/AccountSet) and [SetRegularKey](/tx/SetRegularKey) — transactions that are useful to be able to send "out of turn".
- [TicketBatch](/amendments/TicketBatch) — the amendment that introduced this type.
- [Batch](/tx/Batch) — a Batch's inner transactions can use `TicketSequence`.
