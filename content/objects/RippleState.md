---
title: RippleState
summary: A bidirectional trust line between two accounts for a specific issued token; carries the balance and credit limits of both sides.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ripplestate
createdBy: TrustSet
modifiedBy: TrustSet, Payment, OfferCreate, Clawback, AMMDeposit, AMMWithdraw
reserve: 1
---

## What it represents

A `RippleState` (its internal name, although in the API and in `account_lines` it appears as a "trust line") records the credit relationship between two accounts for a specific currency. There is no fixed "issuer" and "recipient" within the object: it is symmetric, with a "low" side (`LowLimit`) and a "high" side (`HighLimit`) determined by the numeric ordering of the `AccountID`s, not by who created it. The `Balance` is stored from the point of view of the low side: a positive value means the high side owes the low side.

It is the foundation of "classic" issued tokens on XRPL: for an account to hold USD from an issuer, a trust line must exist between both, with the limit marking the maximum the holder is willing to keep.

## Lifecycle

- **Creation**: [TrustSet](/tx/TrustSet), by either side, setting its own `LimitAmount` to zero or higher. The line starts with `Balance` at zero unless both sides have previously rippled through some other route.
- **Modification**: new [TrustSet](/tx/TrustSet) transactions change limits, `QualityIn`/`QualityOut`, or freeze flags (`lsfLowFreeze`/`lsfHighFreeze`, `lsfLowDeepFreeze`/`lsfHighDeepFreeze`) and no-ripple flags. `Balance` changes with any [Payment](/tx/Payment) that uses this line as part of its path, with [OfferCreate](/tx/OfferCreate) crossing, or with [Clawback](/tx/Clawback) from the issuer.
- **Deletion**: automatic when `Balance` reaches zero and both `LimitAmount` values are zero and no authorization flags remain (`lsfLowAuth`/`lsfHighAuth`) that need to be preserved; no dedicated transaction is required, it is cleaned up as a side effect of the operation that leaves the line in that state.

## Key fields

- **Balance** — balance from the point of view of the low side (`LowLimit`); negative if the low side owes the high side.
- **LowLimit / HighLimit** — how much each side is willing to hold from the other side's issuer, with its own `AccountID` embedded inside the `STAmount`.
- **LowQualityIn / LowQualityOut / HighQualityIn / HighQualityOut** — conversion factors (in parts per billion) that each side applies to payments crossing this line; used to charge an implicit fee or give discounts in rippling.
- **LowNode / HighNode** — owner directory pages on each side where the line is linked.
- **HighSponsor / LowSponsor** — if the reserve for this line is covered by an external sponsor instead of the holder itself, these reference the corresponding [Sponsorship](/objects/Sponsorship).

## Flags

Each flag exists in duplicate, one for the low side and one for the high side (`lsfLow*`/`lsfHigh*`):

- **Reserve** — that side has already "consumed" its owner reserve unit for this line.
- **Auth** — that side has explicitly authorized the other (relevant if the issuer has `lsfRequireAuth`).
- **NoRipple** — that side has disabled rippling through this line.
- **Freeze** — that side has frozen the line: the other side can neither send nor receive through it.
- **DeepFreeze** — deep freeze: not even the holder can move the existing balance, only the issuer.

In addition, **lsfAMMNode** marks that the line belongs to an [AMM](/objects/AMM) pool, not a regular account.

## How to query it

`account_objects` with `type: "state"` (or the dedicated `account_lines` method, more convenient) returns it for either side. With `ledger_entry`, `ripple_state` accepts `accounts` (an array of 2 addresses) and `currency`:

```json
{ "method": "ledger_entry", "params": [{ "ripple_state": { "accounts": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"], "currency": "USD" }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0072 || min(id0,id1) || max(id0,id1) || currency)` (`keylet::trustLine`, namespace `'r'`), with the accounts ordered numerically, not by who created it. Typical response:

```json
{
  "index": "2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C",
  "node": {
    "LedgerEntryType": "RippleState",
    "Balance": { "currency": "USD", "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji", "value": "-50" },
    "LowLimit": { "currency": "USD", "issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "value": "0" },
    "HighLimit": { "currency": "USD", "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "value": "1000" },
    "Flags": 131072
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet), from the side that marked it with `lsfLowReserve`/`lsfHighReserve` (normally whoever created it first, if the other side had not yet set a limit).

## Related

- [TrustSet](/tx/TrustSet), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [AccountRoot](/objects/AccountRoot), [Offer](/objects/Offer), [Sponsorship](/objects/Sponsorship)
- [DeepFreeze](/amendments/DeepFreeze), [DisallowIncoming](/amendments/DisallowIncoming)
