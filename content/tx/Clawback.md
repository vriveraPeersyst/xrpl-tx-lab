---
title: Clawback
summary: Lets the issuer reclaim IOU or MPT tokens from a holder's account, without their consent.
category: tokens
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/clawback
xls: XLS-0039
amendment: Clawback
level: intermediate
---

## What it does

`Clawback` is the regulated issuer's tool: it withdraws tokens from a holder's account and returns them to the issuer (where, being the issuer's own debt, they simply disappear). It's the equivalent of a court order freezing and recovering funds at a bank.

It only works if the issuer opted in **before issuing**: for IOU tokens, the issuing account must have the `lsfAllowTrustLineClawback` flag, which can only be turned on with [AccountSet](/tx/AccountSet) while the account has no objects yet (trust lines, offers, etc.). For MPT, the issuance must have been created with `tfMPTCanClawback`.

Objects affected: the [RippleState](/objects/RippleState) between issuer and holder (IOU), or the holder's [MPToken](/objects/MPToken) and the [MPTokenIssuance](/objects/MPTokenIssuance) (MPT).

## When to use it

- Regulatory compliance: reclaiming assets from a compromised or sanctioned account.
- Correcting erroneous issuances of stablecoins or real-world asset tokens.
- Recovering funds from holders who lost their keys, if the issuer adopts that policy.

## How it works inside

**`Clawback::preflight`** specializes by asset type:

- *IOU*: can't carry `Holder` (`temMALFORMED`). The `Amount`'s `issuer` is the **holder**, not you. If it matches your account, is XRP, or the value is ≤ 0, `temBAD_AMOUNT`.
- *MPT*: requires [MPTokensV1](/amendments/MPTokensV1) (active on testnet). `Holder` is required and must differ from your account; the amount must be between 1 and the MPT maximum.

**`Clawback::preclaim`** requires both issuer and holder to exist. An AMM can't be the target holder (`tecAMM_ACCOUNT`; that's what [AMMClawback](/tx/AMMClawback) is for). Then:

- *IOU*: your account must have `lsfAllowTrustLineClawback` and must **not** have `lsfNoFreeze` (`tecNO_PERMISSION`). The trust line must exist (`tecNO_LINE`) and the sign of the balance must indicate that the holder owes you, not the other way around (otherwise `tecNO_PERMISSION`). If the holder has no positive balance ignoring freezes, `tecINSUFFICIENT_FUNDS`.
- *MPT*: the issuance must exist, have `lsfMPTCanClawback`, be yours, and the holder must have the `MPToken` object with a balance > 0.

**`Clawback::doApply`** computes what the holder can actually spend (`accountHolds` with `IgnoreFreeze`, so it works even if the line is frozen) and moves `min(balance, Amount)` from the holder to the issuer with `directSendNoFee`. In other words: **if you request more than they have, you recover everything they have and the transaction succeeds**; it doesn't fail on excess.

## Key fields

- **Amount** — for IOU, `{currency, issuer, value}` where `issuer` is the address of the **holder** the token is being clawed back from (the code relabels it afterward with your account). For MPT, `{mpt_issuance_id, value}`.
- **Holder** — MPT only: the account being clawed back from. Forbidden for IOU.

## Common errors

- **tecNO_PERMISSION** — your account doesn't have `asfAllowTrustLineClawback`, has `asfNoFreeze`, or the line's balance doesn't point in your direction (you're not the real issuer of that balance). Turn on the flag before creating any object.
- **tecNO_LINE** — there's no trust line between you and that holder for that currency.
- **tecINSUFFICIENT_FUNDS** — the holder's balance is 0.
- **tecAMM_ACCOUNT** — the holder is an AMM: use `AMMClawback`.
- **temBAD_AMOUNT** — the `Amount`'s `issuer` is your own account, it's XRP, or the value is ≤ 0.
- **temMALFORMED** — you set `Holder` on an IOU clawback, or omitted it on an MPT one.

## Example

```json
{
  "TransactionType": "Clawback",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Amount": {
    "currency": "USD",
    "issuer": "rYYYY_OTHER_ACCOUNT",
    "value": "10"
  }
}
```

Your account (the USD issuer) reclaims up to 10 USD from `rYYYY_OTHER_ACCOUNT`.

## Try it on testnet

1. With a **freshly created account with no objects**, send [AccountSet](/tx/AccountSet) with `SetFlag: 16` (`asfAllowTrustLineClawback`). If it already has trust lines or offers you'll get `tecOWNERS`.
2. From the other account, create a trust line with [TrustSet](/tx/TrustSet) to your account for `USD`.
3. From your account, send a [Payment](/tx/Payment) of 25 USD to the other account. `account_lines` for the holder will show `balance: "25"`.
4. Send the `Clawback` example with `value: "10"`. Query `account_lines` again: `balance: "15"`.
5. Repeat with `value: "1000"`: you'll see `tesSUCCESS` and the balance drops to 0 (it doesn't fail on exceeding).
6. Try `SetFlag: 6` (`asfNoFreeze`) on your account: you'll get `tecNO_PERMISSION`, because clawback and NoFreeze are mutually exclusive.

## Related

- [AccountSet](/tx/AccountSet) — `asfAllowTrustLineClawback` and its incompatibility with `asfNoFreeze`.
- [TrustSet](/tx/TrustSet) — freezing as a less drastic alternative.
- [AMMClawback](/tx/AMMClawback) — reclaiming tokens deposited in an AMM.
- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) — `tfMPTCanClawback`.
- Objects: [RippleState](/objects/RippleState), [MPToken](/objects/MPToken).
- Amendments: [Clawback](/amendments/Clawback), [MPTokensV1](/amendments/MPTokensV1), [AMMClawback](/amendments/AMMClawback).
