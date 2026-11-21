---
title: TransactionProposalCreate
summary: Stores an unsigned transaction on-ledger as a pending multi-signature proposal that others can review and sign over time.
category: multifirma
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/transactionproposalcreate
xls: XLS-0103
amendment: Cosign
level: advanced
---

## What it does

**Notice: the [Cosign](/amendments/Cosign) amendment (XLS-0103, "On-Chain Cosigner") is still in development and isn't supported by any released rippled build yet — it doesn't even show up as a supported amendment on the `develop` branch.** The transactor already exists in the feature's own development branch, and this page documents that code, but `TransactionProposalCreate` cannot be submitted on any public network today, testnet included.

Ordinary multi-signing requires every signer to sign the exact same transaction instance off-ledger and send their signature back to whoever assembles the final `Signers` array — awkward when signers are in different places, and fragile, because any unrelated activity on the target account (a changed `Sequence`) can invalidate the whole batch of signatures before they're collected. `TransactionProposalCreate` fixes both problems: it publishes the transaction you want signed, unsigned, as a [TransactionProposal](/objects/TransactionProposal) ledger object, and reserves one of the target account's Tickets so the proposal can't be invalidated while signatures trickle in. The target account itself, an entry on its SignerList, or (through [DelegateSet](/tx/DelegateSet)) an authorized delegate can then add signatures over time — through `TransactionProposalSign`, a transaction this feature doesn't implement yet — until the proposal is fully signed, at which point anyone can submit the completed transaction.

The `ProposedTransaction` you submit must already be in the exact shape a proposal stores: ticket-based (`TicketSequence` set, `Sequence` equal to `0`), with an empty (not absent) `SigningPubKey`, and carrying none of `TxnSignature`, `Signers`, `BatchSigners`, `CounterpartySignature` or `SponsorSignature` — it is unsigned canonical form. It must also pass the same static checks (`preflight` plus `passesLocalChecks`) a direct submission would, and be a type that could stand on its own: not itself a proposal, not a pseudo-transaction, not flagged as someone else's inner `Batch` transaction, and — if it is a `Batch` — none of its own inner transactions may be a nested proposal, a pseudo-transaction, or another `Batch`.

Only the target account, an account on its SignerList, or (if the proposed transaction names a `Delegate` the target has actually granted) that delegate or one of the delegate's own signers, may create a proposal against the target. This keeps unrelated accounts from spamming or squatting a target's Tickets with proposals it never asked for.

## When to use it

- A treasury or exchange multisig where signers are in different time zones or on separate devices and can't co-sign one raw transaction blob in a single session.
- Publishing exactly what a multisig quorum is about to authorize on-ledger, instead of trusting an off-chain copy of the transaction that signers can't independently verify.
- Cold-storage or air-gapped signer setups, where coordinating "sign this exact blob" by hand is error-prone — the ledger becomes the single source of truth for what's being proposed.
- Any flow (lending, vaults, automated treasuries) that wants a transaction to execute only once a quorum of independent approvers has reviewed it on-chain, rather than off a trusted coordinator's word.

## How it works internally

`TransactionProposalCreate::preflight` (`vendor/rippled/src/libxrpl/tx/transactors/proposal/TransactionProposalCreate.cpp`) rejects a zero `Expiration` (`temBAD_EXPIRATION`). It then runs the proposed transaction through the ordinary `xrpl::preflight` chain in dry-run/proposal mode (`TapDryRun | TapProposal`, which skips signature-presence checks) plus `passesLocalChecks`; a failure there surfaces the proposed type's own code, or `temMALFORMED` if the payload doesn't even parse. It checks the proposed type is independently submittable with `proposal::isValidProposalTxnType` (`temINVALID` otherwise), rejects any signature field or a missing/non-empty `SigningPubKey` (`temBAD_SIGNER`), and requires the proposed transaction to be ticket-based (`temSEQ_AND_TICKET`). A final check catches a degenerate case: if this transaction itself pays with a Ticket that is the very Ticket the proposed transaction depends on, applying it would kill the proposal on arrival (`temMALFORMED`).

`TransactionProposalCreate::preclaim` returns `tecEXPIRED` if the outer `Expiration` has passed, or if the proposed transaction's own `LastLedgerSequence` has — two independent deadlines. It reads the proposed transaction's `Account` as the target and requires it to exist (`tecNO_TARGET`) and not be a pseudo-account (`tecNO_PERMISSION`). It then checks the proposer is authorized: the target itself, an entry on its `SignerList`, or (via `xrpl::invokeCheckPermission` against the proposed transaction's `Delegate`) an authorized delegate or that delegate's own signers; otherwise `tecNO_PERMISSION`. Finally it requires the named `TicketSequence` to exist on the target (`tefNO_TICKET`) and that no proposal already occupies that target/ticket pair (`tecDUPLICATE`, keyed by `keylet::txProposal`).

`TransactionProposalCreate::doApply` checks the reserve with `checkReserve`: a proposal holds 5 owner-reserve increments, or 10 if the proposed transaction is a `Batch`, returning `tecINSUFFICIENT_RESERVE` if the proposer can't cover it. It then creates the `TransactionProposal` entry, links it into the proposer's owner directory (`tecDIR_FULL` if that directory is full), raises the proposer's `OwnerCount`, and stamps a `Sponsor` if the reserve is sponsored. `TransactionProposalCreate` is not delegable itself (`delegable: false`): Permission Delegation can authorize someone to act as a *target's* delegate inside a proposal, but it can't let someone submit `TransactionProposalCreate` on another account's behalf.

## Key fields

- **ProposedTransaction** — the transaction to be proposed, in unsigned canonical form: `Sequence: 0`, a `TicketSequence` you own, empty `SigningPubKey`, and no signature fields. It is stored exactly as submitted and compared field-for-field against whatever is later signed and executed.
- **Expiration** — mandatory (there's no "proposal with no timeout"), in Ripple Epoch seconds. Once it passes, the proposal is terminal: no more signatures can be added, and anyone may remove it. It is independent of `ProposedTransaction.LastLedgerSequence`, which bounds when the *proposed* transaction itself can still be submitted.

## Common errors

- **temBAD_EXPIRATION** — `Expiration` is `0`.
- **temSEQ_AND_TICKET** — the proposed transaction doesn't carry a `TicketSequence`, or still has a nonzero `Sequence`.
- **temINVALID** — the proposed transaction's type can't stand on its own: it's a proposal, a pseudo-transaction, flagged as an inner `Batch` transaction, or a `Batch` that nests one of those.
- **temBAD_SIGNER** — the proposed transaction already carries a signature field, or its `SigningPubKey` is missing or non-empty.
- **tecEXPIRED** — the outer `Expiration`, or the proposed transaction's own `LastLedgerSequence`, has already passed.
- **tecNO_PERMISSION** — the proposer isn't the target, an entry on its `SignerList`, nor an authorized delegate (or that delegate's signer); or the target is a pseudo-account.
- **tefNO_TICKET** — the `TicketSequence` the proposed transaction names doesn't exist yet on the target account.
- **tecDUPLICATE** — a proposal already exists for that exact target account and ticket.

## Example

```json
{
  "TransactionType": "TransactionProposalCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Expiration": 821616000,
  "ProposedTransaction": {
    "TransactionType": "Payment",
    "Account": "rYYYY_TARGET_ACCOUNT",
    "Destination": "rZZZZ_DESTINATION",
    "Amount": "1000000",
    "Fee": "10",
    "Sequence": 0,
    "TicketSequence": 12345,
    "SigningPubKey": ""
  }
}
```

`Expiration` is Ripple Epoch seconds (seconds since 2000-01-01); pick a value comfortably in the future. `ProposedTransaction.TicketSequence` must be a Ticket the target account (`rYYYY_TARGET_ACCOUNT`) already owns, and `Account`/`Destination`/`Amount` describe the Payment being proposed, not this outer transaction.

## Try it on testnet

1. Before anything else, create a Ticket on the target account with [TicketCreate](/tx/TicketCreate), and, if you're proposing against an account that isn't your own, add yourself to its SignerList with [SignerListSet](/tx/SignerListSet).
2. Fill the builder with the example above, replacing `ProposedTransaction.TicketSequence` with the Ticket sequence you just created, and `ProposedTransaction.Account` with the target.
3. Today, submission isn't possible: [Cosign](/amendments/Cosign) isn't supported by testnet's rippled build, so `TransactionProposalCreate` isn't in testnet's transaction definitions and the builder can't serialize it yet.
4. Once the amendment ships: a successful submission returns `tesSUCCESS`. Query `account_objects` on the proposer with `type: "transaction_proposal"` to see the new [TransactionProposal](/objects/TransactionProposal), with `Owner` set to your account and `ProposedTransaction` stored exactly as sent. Your `OwnerCount` will have risen by 5 (10 if you proposed a `Batch`).
5. Query `account_objects` on the target account for its Ticket: it's still there, reserved rather than consumed, until the proposed transaction itself is submitted or the proposal is removed with [TransactionProposalCancel](/tx/TransactionProposalCancel).

## Related

- [TransactionProposalCancel](/tx/TransactionProposalCancel) — deletes the proposal and releases its reserve.
- [TransactionProposal](/objects/TransactionProposal) — the ledger object this transaction creates.
- [TicketCreate](/tx/TicketCreate) — the Ticket a proposal reserves against the target.
- [SignerListSet](/tx/SignerListSet) — determines who else may create a proposal against an account.
- [DelegateSet](/tx/DelegateSet) — a delegate the target has authorized may also propose on its behalf.
- [Batch](/tx/Batch) — a proposed transaction may itself be a Batch, at double the reserve.
- [Cosign](/amendments/Cosign) — the amendment gating this entire feature.
