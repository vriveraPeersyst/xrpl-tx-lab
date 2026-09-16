---
title: CheckCreate
summary: Creates a Check, a deferred payment where the recipient decides when to cash it (up to a maximum SendMax) or let it expire.
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcreate
xls: XLS-0011
amendment: Checks
level: basic
---

## What it does

`CheckCreate` issues a [Check](/objects/Check) payable to another account. It works like a bank check: you sign a commitment to pay up to `SendMax`, but the money **doesn't leave your account** when you create it. It's the recipient who cashes it later with [CheckCash](/tx/CheckCash), and only then is your balance checked. If you'd rather withdraw it, or if it expires, it's removed with [CheckCancel](/tx/CheckCancel).

Unlike a `Payment`, the recipient has to act to receive the funds, which fits accounts that require `DepositAuth`. Unlike an escrow, the funds aren't locked up: if you don't have the balance when it's cashed, the cashing fails. The object consumes one owner reserve unit from your account for as long as it exists.

## When to use it

- Paying accounts with `asfDepositAuth`, which reject direct incoming payments.
- Offering a payment the recipient can accept in full or in part whenever it suits them.
- Sending tokens to someone who doesn't yet have a trust line: `CheckCash` can create it when cashing ([CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine)).
- Invoicing with a reference: `InvoiceID` travels with the check until it's cashed.

## How it works inside

**`CheckCreate::preflight`** (static). A check to yourself is rejected with `temREDUNDANT`. `SendMax` must be a legal, positive amount (`temBAD_AMOUNT`) with a valid currency (`temBAD_CURRENCY`). If you set `Expiration`, it can't be 0 (`temBAD_EXPIRATION`). `checkExtraFeatures` rejects a `SendMax` in MPT as long as MPTokensV2 doesn't exist on the network; on testnet you can only issue checks in XRP or IOU.

**`CheckCreate::preclaim`** (against the ledger). The destination must exist (`tecNO_DST`), must not have `lsfDisallowIncomingCheck` and must not be a pseudo-account (`tecNO_PERMISSION`), and if it has `lsfRequireDestTag` it requires a `DestinationTag` (`tecDST_TAG_NEEDED`). For a `SendMax` in tokens: the currency can't be globally frozen by the issuer; if you have a trust line with the issuer, it can't be frozen by them; and the destination's trust line with the issuer can't be frozen either (`tecFROZEN`). The code explicitly allows creating a check in a currency for which you don't yet have a trust line. Finally, if `Expiration` has already passed relative to the parent ledger's close time, `tecEXPIRED`.

**`CheckCreate::doApply`** (effects). It checks that you cover the reserve for one more object, using the balance before the fee (`checkReserve` with `preFeeBalance_`), so you're allowed to "dip into" the reserve to pay the fee but not for the new object. It creates the `Check` entry indexed by your account and the transaction's `Sequence` (or Ticket), copying `Destination`, `SendMax`, `SourceTag`, `DestinationTag`, `InvoiceID` and `Expiration`. It inserts the object into the destination's owner directory and into yours, and raises your `OwnerCount` by one. Your `Balance` doesn't change except for the fee.

## Key fields

- **SendMax** — Maximum you authorize to be cashed. In drops if XRP; `{currency, issuer, value}` for tokens. With tokens, the cashing goes through `flow()` and can apply the issuer's `TransferRate`, so the recipient may receive less than `SendMax`.
- **Expiration** — Seconds since the Ripple Epoch (2000-01-01), not Unix. Past that time the check can't be cashed and anyone can cancel it.
- **InvoiceID** — Arbitrary 256-bit hash stored on the object as a reference.
- **DestinationTag** — Required if the destination has `lsfRequireDestTag`. Also checked when cashing.

## Common errors

- **temREDUNDANT** — `Destination` is your own account.
- **tecNO_DST** — The destination account doesn't exist.
- **tecNO_PERMISSION** — The destination turned on `asfDisallowIncomingCheck` (amendment [DisallowIncoming](/amendments/DisallowIncoming)).
- **tecDST_TAG_NEEDED** — Missing `DestinationTag` and the destination requires it.
- **tecEXPIRED** — `Expiration` is already in the past.
- **tecINSUFFICIENT_RESERVE** — You don't have enough XRP for the reserve of one more object (0.2 XRP on testnet).
- **tecFROZEN** — A check in tokens whose trust line (yours or the destination's) is frozen, or a currency with global freeze.

## Example

A check for up to 1 XRP that expires in one day (843086400 ≈ now + 86,400 s in Ripple Epoch):

```json
{
  "TransactionType": "CheckCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "SendMax": "1000000",
  "Expiration": 843086400
}
```

## Try it on testnet

1. In the builder, leave `SendMax` at `1000000` drops and set a future `Expiration` (`{{time+86400}}`). Sign and send; expect `tesSUCCESS`.
2. Query `account_objects` with `type: "check"` on your account: you'll see the object with its `index`. That `index` is the `CheckID` the recipient will need for `CheckCash`, or anyone for `CheckCancel`.
3. Query `account_info`: your `Balance` has only dropped by the fee (the check doesn't move funds) and your `OwnerCount` has gone up by one.
4. Query `account_objects` with `type: "check"` on the destination account: the same check appears there too, even though you pay the reserve.
5. Cash it from the other account with [CheckCash](/tx/CheckCash) or withdraw it with [CheckCancel](/tx/CheckCancel).

## Related

- [CheckCash](/tx/CheckCash) — the recipient cashes the check.
- [CheckCancel](/tx/CheckCancel) — withdraws a check (or cleans up an expired one).
- [Check](/objects/Check) — the object created.
- [Checks](/amendments/Checks) — the amendment that introduced checks.
- [DisallowIncoming](/amendments/DisallowIncoming) — allows blocking incoming checks with `asfDisallowIncomingCheck`.
- [Payment](/tx/Payment) — the immediate alternative.
