---
title: SponsorshipTransfer
summary: Creates, closes or reassigns the fee/reserve sponsorship of an object or account to another sponsor.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/sponsorshiptransfer
amendment: Sponsor
level: advanced
---

## What it does

`SponsorshipTransfer` manages the lifecycle of the sponsorship over a specific ledger object or over the sponsored account in general: it can create a new sponsorship (`tfSponsorshipCreate`), end one (`tfSponsorshipEnd`) or reassign it from one sponsor to another (`tfSponsorshipReassign`). Unlike [SponsorshipSet](/tx/SponsorshipSet), which adjusts the budget of an existing sponsorship, this transaction acts on the sponsorship relationship itself: who is the sponsor of a given object or owner count.

**This transaction type depends on the `Sponsor` amendment, which is not active on testnet today.** Any attempt to send it fails while the amendment isn't active.

## When to use it (once the amendment is active)

- Transferring the sponsorship of an object's reserve (for example, a `TrustSet`) from one application to another when the service operator changes.
- Formally ending a sponsorship when the business relationship ends, releasing the sponsor from the obligation.
- Creating a sponsorship targeted at a specific object (`ObjectID`) rather than at the account in general.

## How it works inside

**`SponsorshipTransfer::preflight`** requires exactly one of the three action flags (`tfSponsorshipCreate`, `tfSponsorshipEnd`, `tfSponsorshipReassign`) and validates field consistency according to the action: creating requires the data for the new sponsorship, reassigning requires identifying both the existing sponsorship and the new sponsor along with their signature (`SponsorSignature`).

**`SponsorshipTransfer::preclaim`** checks that the account or object (`ObjectID`) exists and, depending on the action, that the referenced sponsorship exists (`tecNO_ENTRY`) and that whoever sends the transaction has permission to touch it (`tecNO_PERMISSION` if not).

**`SponsorshipTransfer::doApply`** adjusts the `SponsoredOwnerCount`, `SponsoringAccountCount` and `SponsoringOwnerCount` counters of the accounts involved and, depending on the flag, creates, deletes or transfers the corresponding sponsorship link.

## Key fields

- **ObjectID** — the specific ledger object whose sponsorship is being managed. If omitted, the operation affects the account's general sponsorship.
- **Sponsee** — the account benefiting from the sponsorship.
- **Sponsor** / **SponsorFlags** / **SponsorSignature** — identify the new sponsor and their explicit authorization to take on the commitment, required in a reassignment.

## Flags

- **tfSponsorshipCreate** — creates a new sponsorship link.
- **tfSponsorshipEnd** — ends an existing sponsorship.
- **tfSponsorshipReassign** — transfers an existing sponsorship to another sponsor.

## Common errors

- **tecNO_ENTRY** — the referenced sponsorship or object doesn't exist.
- **tecNO_PERMISSION** — you don't have authority over the sponsorship you're trying to modify.
- **temINVALID_FLAG** — you didn't set any of the three action flags, or set more than one.
- **temMALFORMED** — required fields for the chosen action are missing.

## Example

```json
{
  "TransactionType": "SponsorshipTransfer",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Sponsor": "rYYYY_OTHER_ACCOUNT",
  "Flags": 65536
}
```

This would attempt to create a sponsorship (`Flags: 65536` = `tfSponsorshipCreate`) with `rYYYY_OTHER_ACCOUNT` as sponsor; it will fail while the `Sponsor` amendment isn't active on testnet.

## Try it on testnet

The `Sponsor` amendment isn't active on testnet today, so any submission of this transaction from this page's builder will fail. You can verify this with the example above; once the network activates the amendment, you'll be able to repeat the flow and verify the sponsor change by querying the corresponding object via `ledger_entry`.

## Related

- [SponsorshipSet](/tx/SponsorshipSet) — creates and adjusts a sponsorship's budget.
- Amendments: [Sponsor](/amendments/Sponsor).
