---
title: Sponsorship
summary: Allows one account to pay the reserve and/or fees of another, without giving it control over its funds.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/sponsorship
createdBy: SponsorshipSet
modifiedBy: SponsorshipSet, SponsorshipTransfer
reserve: 1
---

## What it represents

A `Sponsorship` links an `Owner` (the sponsor) with a `Sponsee` (the sponsored account): the sponsor can take on the owner reserve of the objects the sponsee creates, or cover the cost of its transaction fees, or both, depending on which flags are activated. This is useful for applications that want to onboard users without requiring them to have their own XRP from the very start, without thereby taking custody of their keys or their funds: the sponsee still signs its own transactions.

Every object the sponsee creates while the sponsorship is active can be linked to it (via `LowSponsor`/`HighSponsor` on a `RippleState`, for example), so that its reserve is counted against the sponsor and not the sponsee.

## Lifecycle

- **Creation**: [SponsorshipSet](/tx/SponsorshipSet), by the sponsor, specifying `Sponsee` and what it covers (`lsfSponsorshipRequireSignForFee`, `lsfSponsorshipRequireSignForReserve`, or neither for open sponsorship). It can set `MaxFee`, the cap on what it is willing to cover in fees.
- **Update**: the same [SponsorshipSet](/tx/SponsorshipSet) adjusts `MaxFee` or the coverage flags on an existing sponsorship.
- **Transfer of sponsored objects**: [SponsorshipTransfer](/tx/SponsorshipTransfer) moves the reserve responsibility of already-created objects from one sponsor to another (or back to the sponsee itself), without having to recreate the objects.
- **Deletion**: when the sponsor withdraws sponsorship and `RemainingOwnerCount` reaches zero (no sponsored objects remain pending reserve coverage).

## Key fields

- **Owner** — the sponsor, who assumes the cost.
- **Sponsee** — the sponsored account.
- **FeeAmount / MaxFee** — what has already been spent on covered fees and the cap the sponsor is willing to assume.
- **RemainingOwnerCount** — how many owner reserve units of the sponsee this sponsorship is currently still covering.
- **OwnerNode / SponseeNode** — the sponsor's and sponsee's directory pages where it is linked.

## Flags

- **lsfSponsorshipRequireSignForFee** — the sponsor requires signing off (explicit authorization) each time a fee is charged to it, instead of automatically covering it up to `MaxFee`.
- **lsfSponsorshipRequireSignForReserve** — same, but for the owner reserve of the sponsee's new objects.

## How to query it

`account_objects` with `type: "sponsorship"` returns it for both the sponsor and the sponsee. With `ledger_entry`, `sponsorship` accepts `sponsor` and `sponsee`:

```json
{ "method": "ledger_entry", "params": [{ "sponsorship": { "sponsor": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "sponsee": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x003E || AccountID_sponsor || AccountID_sponsee)` (`keylet::sponsorship`, namespace `'>'`). Typical response:

```json
{
  "index": "3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D",
  "node": {
    "LedgerEntryType": "Sponsorship",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Sponsee": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "RemainingOwnerCount": 2,
    "OwnerNode": "0",
    "SponseeNode": "0",
    "Flags": 0
  }
}
```

## Reserve

The `Sponsorship` object itself consumes 1 owner reserve unit from the sponsor; the objects it sponsors for the `Sponsee` are deducted separately from the sponsee's `OwnerCount` while the sponsorship covers them.

## Related

- [SponsorshipSet](/tx/SponsorshipSet), [SponsorshipTransfer](/tx/SponsorshipTransfer)
- [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [SignerList](/objects/SignerList)
