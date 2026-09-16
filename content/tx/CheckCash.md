---
title: CheckCash
summary: Cashes a Check you're the recipient of, either for an exact amount (Amount) or for the maximum possible from a minimum (DeliverMin).
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcash
xls: XLS-0011
amendment: Checks
level: intermediate
---

## What it does

`CheckCash` is the transaction with which the recipient of a [Check](/objects/Check) cashes it. Only the account listed as `Destination` on the check can send it. The funds move at that moment from the account that issued the check to yours; if the issuer doesn't have enough balance, the cashing fails and the check stays on the ledger.

There are two modes, mutually exclusive: with `Amount` you request an exact amount and the transaction fails if it can't be delivered in full; with `DeliverMin` you request "as much as possible up to `SendMax`, as long as it's at least this minimum," and the actual amount ends up in the `delivered_amount` field of the metadata. If the cashing succeeds the check is deleted and the issuer recovers its reserve.

With tokens, the cashing goes through the payment engine (`flow()`), just like a pathless `Payment`, so it can apply the token issuer's `TransferRate`. Thanks to [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine), if you don't have a trust line with the token's issuer, one is created automatically when cashing (you pay the reserve).

## When to use it

- Accepting a payment sent to you via check, especially if your account uses `DepositAuth`.
- Cashing partially with `DeliverMin` when the issuer might not have the full balance.
- Receiving a new token without having created the trust line beforehand.

## How it works inside

**`CheckCash::preflight`** (static). With [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) active, a `CheckID` of all zeros is `temMALFORMED`. There must be exactly one of `Amount` or `DeliverMin` (`temMALFORMED` if there are both or neither). The chosen amount must be legal and positive (`temBAD_AMOUNT`) and with a valid currency (`temBAD_CURRENCY`). MPT amounts are rejected in `checkExtraFeatures` as long as MPTokensV2 doesn't exist on the network.

**`CheckCash::preclaim`** (against the ledger). The check must exist (`tecNO_ENTRY`) and you must be its `Destination` (`tecNO_PERMISSION`). If your account has `lsfRequireDestTag` but the check doesn't carry a `DestinationTag`, `tecDST_TAG_NEEDED`. If `Expiration` has already passed relative to the parent ledger's close time, `tecEXPIRED`. The amount you request must be of the same currency and issuer as the check's `SendMax` (`temMALFORMED`) and can't exceed it (`tecPATH_PARTIAL`). It then checks with `accountFunds` that the check's issuer has at least that amount available, ignoring frozen or unauthorized funds; for XRP, one reserve unit is added to that (`fees().increment`) because cashing the check releases the object's reserve for the issuer. If it's not enough, `tecPATH_PARTIAL`. For tokens you're not the issuer of: the token's issuer must exist (`tecNO_ISSUER`); if it has `lsfRequireAuth`, you need an already-authorized trust line (`tecNO_AUTH`), because an authorized line can't be created on the fly; and your trust line with the issuer can't be frozen (`tecFROZEN`).

**`CheckCash::doApply`** (effects). It works on a `PaymentSandbox`. If the check is in XRP, it computes the issuer's liquid balance with `xrpLiquid`, subtracting their reserve minus one object (the check that's about to disappear); with `DeliverMin` it delivers `max(DeliverMin, min(SendMax, liquid))`, with `Amount` it delivers exactly `Amount`; if the liquid balance isn't enough, `tecUNFUNDED_PAYMENT`. Then `transferXRP`. If it's in tokens: if your trust line with the issuer doesn't exist, it checks that you cover the reserve for one more object (`tecNO_LINE_INSUF_RESERVE`) and creates it with `trustCreate` with limit 0 and the NoRipple flag based on your `lsfDefaultRipple`. It then temporarily raises the limit of your trust line to the maximum, so that the cashing doesn't fail even if it exceeds your `LimitAmount` (the code reasons that if you're signing the cashing, you want the funds), calls `flow()` with the check's `SendMax` as the cap and `partial payment` only if you used `DeliverMin`, and restores the limit on exit. If with `DeliverMin` the result is below the minimum, `tecPATH_PARTIAL`. It records `delivered_amount` in the metadata in every case. Finally it removes the check from your directory and from the issuer's, decrements the issuer's `OwnerCount`, and deletes the object.

## Key fields

- **CheckID** — The `index` of the Check object (64-hex hash). You get it from `account_objects` with `type: "check"`.
- **Amount** — Exact amount to cash. Must be of the same currency as `SendMax` and can't exceed it. Mutually exclusive with `DeliverMin`.
- **DeliverMin** — Acceptable minimum; the transactor tries to deliver as much as possible up to `SendMax`. Mutually exclusive with `Amount`. Check `delivered_amount` in the metadata to know how much you received.

## Common errors

- **tecNO_ENTRY** — Wrong `CheckID`, or the check was already cashed or canceled.
- **tecNO_PERMISSION** — You're not the check's `Destination`.
- **tecEXPIRED** — The check has expired; cancel it with [CheckCancel](/tx/CheckCancel) to free the issuer's reserve.
- **tecPATH_PARTIAL** — You're requesting more than `SendMax`, the issuer doesn't have enough funds (at preclaim), or with `DeliverMin` the result didn't reach the minimum.
- **tecUNFUNDED_PAYMENT** — Check in XRP whose issuer doesn't have enough liquid balance above their reserve.
- **temMALFORMED** — `Amount` and `DeliverMin` both set or neither, or the currency doesn't match `SendMax`.
- **tecNO_LINE_INSUF_RESERVE** — A trust line needs to be created and you don't cover its reserve.
- **tecNO_AUTH** — The token's issuer requires authorization and your trust line isn't authorized.

## Example

Cashes exactly 1 XRP from a check whose `index` is the `CheckID`:

```json
{
  "TransactionType": "CheckCash",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "CheckID": "49647F0D748DC3FE26BDACBC57F251AADEFFF391403EC9BF87C97F67E9977FB0",
  "Amount": "1000000"
}
```

To cash "as much as possible, at least 0.5 XRP," replace `Amount` with `"DeliverMin": "500000"`.

## Try it on testnet

1. From the other account, create a check payable to you with [CheckCreate](/tx/CheckCreate) and `SendMax` `1000000`.
2. Query `account_objects` with `type: "check"` on your account and copy the check's `index` into `CheckID`.
3. Send `CheckCash` with `Amount` `1000000`. Expect `tesSUCCESS`; in the metadata you'll see `delivered_amount`.
4. Query `account_objects` again: the check has disappeared. `account_info` for your account shows 1 XRP more (minus the fee) and the issuer has recovered one `OwnerCount` unit.
5. Repeat the test with an `Amount` higher than `SendMax` to see `tecPATH_PARTIAL`, or from an account that isn't the destination to see `tecNO_PERMISSION`.

## Related

- [CheckCreate](/tx/CheckCreate) — issues the check.
- [CheckCancel](/tx/CheckCancel) — withdraws or cleans up a check.
- [Check](/objects/Check) — the object that gets consumed.
- [Checks](/amendments/Checks) — the checks amendment.
- [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) — automatic trust line creation when cashing.
- [TrustSet](/tx/TrustSet) — create the trust line manually if the issuer requires authorization.
