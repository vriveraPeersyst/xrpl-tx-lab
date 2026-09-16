---
title: Batch
summary: Packages 2 to 8 transactions into one, with four atomicity modes and multi-account signatures.
category: batch
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/batch
xls: XLS-0056
amendment: Batch
level: advanced
---

## What it does

`Batch` is an "envelope" that contains several inner transactions (`RawTransactions`) and defines how they are applied together. The outer transaction is signed by your account as usual; the inner ones go unsigned, with `Fee: "0"` and the `tfInnerBatchTxn` flag. If the inner transactions belong to other accounts, those accounts sign the whole batch via `BatchSigners`, so that two parties can perform an exchange in which neither has to trust the other.

A mandatory flag (exactly one) sets the mode:

- `tfAllOrNothing` (65536): either all are applied or none.
- `tfOnlyOne` (131072): the first one that succeeds is applied, and it stops there.
- `tfUntilFailure` (262144): they are applied in order until the first one fails.
- `tfIndependent` (524288): all are attempted, each on its own.

The batch itself does not create any ledger objects: the effects are those of its inner transactions.

## When to use it

- Atomic exchanges between two accounts (for example, an NFT for XRP) without intermediaries.
- Creating an account and configuring it in the same ledger: [Payment](/tx/Payment) of funds + [TrustSet](/tx/TrustSet) + [AccountSet](/tx/AccountSet).
- Several payroll payments that must all land or none at all.
- Ordered retries with `tfUntilFailure` or alternatives with `tfOnlyOne`.

## How it works inside

Before reaching the transactor, deserialization itself (`STTx`) limits `RawTransactions` to `kMaxBatchTxCount` (8) and forbids nesting a `Batch` inside another.

`Batch::preflight` validates the envelope and each inner transaction:

- There must be exactly one of the four mode flags (`temINVALID_FLAG`, checked with `popcount`).
- At least 2 inner transactions (`temARRAY_EMPTY` if there are 0 or 1) and at most `kMaxBatchSigners` (24) entries in `BatchSigners` (`temARRAY_TOO_LARGE`).
- Each inner transaction: unique hash (`temREDUNDANT`), a type that isn't forbidden (Vault and Lending types are in `kDisabledTxTypes` and give `temINVALID_INNER_BATCH`), the `tfInnerBatchTxn` flag present (`temINVALID_FLAG`), no `TxnSignature` (`temBAD_SIGNATURE`), no `Signers` (`temBAD_SIGNER`), empty `SigningPubKey` (`temBAD_REGKEY`), `Fee` exactly 0 XRP (`temBAD_FEE`), and it must pass its own `preflight` in `TapBatch` mode (otherwise `temINVALID_INNER_BATCH`).
- Each inner transaction carries `Sequence` or `TicketSequence`, but not both (`temSEQ_AND_TICKET`). In `tfAllOrNothing` and `tfUntilFailure` modes, two inner transactions from the same account cannot repeat a sequence or ticket (`temREDUNDANT`).

`Batch::preflightSigValidated` computes which accounts must sign the batch: the initiator of each inner transaction (or its delegate) and, if present, its `Counterparty` or `Sponsor`, always excluding the outer account. `BatchSigners` must contain exactly those accounts, sorted in strictly ascending order and without duplicates; any deviation is `temBAD_SIGNER`. Then `Batch::checkBatchSign` verifies the signature of each `BatchSigner` (single signature or nested multisign) over the set of inner hashes.

The fee is computed by `Batch::calculateBaseFeeImpl`: base fee × 2 for the envelope, plus the sum of the base fees of each inner transaction, plus one base fee for each `BatchSigners` signature (counting the nested signatures of a multisign). With a base of 10 drops, a batch of two payments from a single account costs 40 drops. `Batch::preclaim` only returns `tecINSUFF_FEE` if that calculation overflows.

`Batch::doApply` returns `tesSUCCESS` without touching anything: the application logic lives in `applyBatchTransactions` (`src/libxrpl/tx/apply.cpp`). Only if the envelope applies with `tesSUCCESS` are the inner transactions executed, one by one, each in its own view that is merged into the batch's view if it ends in `tes` or `tec`. With `tfAllOrNothing`, the first result other than `tesSUCCESS` (including a `tec`) discards everything; with `tfUntilFailure` it stops there but keeps what came before; with `tfOnlyOne` it stops after the first `tesSUCCESS`; with `tfIndependent` it always continues. Each inner transaction appears on the ledger as its own transaction with `ParentBatchID` pointing to the envelope.

Two amendment-related nuances: the envelope cannot carry `spfSponsorReserve` and the inner transactions cannot have a sponsored fee (`temINVALID_FLAG`), and [BatchV1_1](/amendments/BatchV1_1) (not active on testnet) introduces corrections in how inner transactions are handled (consulted, for example, by `Payment::preclaim`). `Batch` is not delegable.

## Key fields

- **RawTransactions** — array of `RawTransaction` objects, each a complete transaction with `Flags` including `tfInnerBatchTxn` (1073741824), `Fee: "0"`, `SigningPubKey: ""` and its own `Sequence` (or `TicketSequence`). Sequences for your account start at the envelope's + 1.
- **BatchSigners** — only if there are inner transactions from other accounts: array of `BatchSigner` with `Account`, `SigningPubKey` and `TxnSignature` (or `Signers` for multisign), sorted by account.
- **Flags** — exactly one of the four modes.

## Common errors

- **temINVALID_FLAG** — the mode flag is missing, there's more than one, or an inner transaction doesn't carry `tfInnerBatchTxn`.
- **temARRAY_EMPTY** — fewer than two inner transactions.
- **temBAD_FEE** — an inner transaction has a `Fee` other than `"0"`.
- **temBAD_REGKEY / temBAD_SIGNATURE** — an inner transaction has a non-empty `SigningPubKey` or a `TxnSignature`.
- **temSEQ_AND_TICKET** — an inner transaction without `Sequence` (or with 0) and without `TicketSequence`, or with both.
- **temREDUNDANT** — two identical inner transactions, or the same `Sequence` repeated in atomic modes.
- **temBAD_SIGNER** — `BatchSigners` doesn't exactly match the required accounts or is out of order.
- **temINVALID_INNER_BATCH** — an inner transaction fails its own `preflight` or is of a forbidden type.

## Example

```json
{
  "TransactionType": "Batch",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Flags": 65536,
  "RawTransactions": [
    {
      "RawTransaction": {
        "TransactionType": "Payment",
        "Flags": 1073741824,
        "Account": "rXXXX_YOUR_ACCOUNT",
        "Destination": "rYYYY_OTHER_ACCOUNT",
        "Amount": "1000000",
        "Sequence": 12346,
        "Fee": "0",
        "SigningPubKey": ""
      }
    },
    {
      "RawTransaction": {
        "TransactionType": "Payment",
        "Flags": 1073741824,
        "Account": "rXXXX_YOUR_ACCOUNT",
        "Destination": "rZZZZ_EMISOR",
        "Amount": "1000000",
        "Sequence": 12347,
        "Fee": "0",
        "SigningPubKey": ""
      }
    }
  ]
}
```

## Try it on testnet

1. Query `account_info` and note your `Sequence` (call it S). The builder fills the envelope with S and the inner transactions with S+1 and S+2.
2. Send the example with `Flags: 65536` (`tfAllOrNothing`). Notice that the computed fee is 40 drops: 20 for the envelope and 10 for each inner payment.
3. Look up the envelope with `tx`: its metadata only reflects the fee charge and the `Sequence` advance. Look up each inner transaction by its own hash (or query `account_tx`): you'll see the two as separate transactions with `ParentBatchID`.
4. Query `account_info` for both destinations: each has received 1 XRP.
5. Repeat the batch changing the second `Amount` to a figure higher than your balance. With `tfAllOrNothing` neither payment applies (the envelope still ends in `tesSUCCESS` and charges its fee). Switch to `tfUntilFailure` (262144): the first one does apply and the second one doesn't.
6. Remove the mode flag or set `Fee: "10"` on an inner transaction to see `temINVALID_FLAG` and `temBAD_FEE` before it reaches the ledger.

## Related

- [Payment](/tx/Payment), [TrustSet](/tx/TrustSet), [AccountSet](/tx/AccountSet) — common inner transactions.
- [TicketCreate](/tx/TicketCreate) — inner transactions can use `TicketSequence`.
- [SignerListSet](/tx/SignerListSet) — a `BatchSigner` can be a multisign.
- [BatchV1_1](/amendments/BatchV1_1) — pending corrections not yet active on testnet.
- [DelegateSet](/tx/DelegateSet) — a delegated inner transaction is signed by the delegate in `BatchSigners`.
