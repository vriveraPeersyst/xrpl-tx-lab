---
title: TrustSet
summary: Creates or modifies a trust line to an issuer: the limit you accept, No Ripple, authorization and freeze.
category: tokens
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/trustset
level: basic
---

## What it does

On the XRPL, no one can send you an issued token (IOU) unless you've first declared that you accept it. That declaration is a **trust line**, a [RippleState](/objects/RippleState) object shared between your account and the issuer. `TrustSet` is the transaction that creates it, adjusts it, or leaves it in a "default" state so it gets deleted.

The trust line stores the limit you're willing to hold (`LimitAmount`), the current balance, the in/out qualities, and several flags for each side: No Ripple, authorization (`Auth`) and freeze (`Freeze`/`DeepFreeze`). Since the object is shared, each account only modifies "its" half (the *low* or *high* side, based on the numeric order of the addresses).

The issuer also uses `TrustSet`: to authorize a holder when it requires `RequireAuth`, or to freeze a specific line.

## When to use it

- Before receiving any IOU token (USD, EUR, testnet stablecoins…).
- Adjusting the maximum limit you accept from an issuer.
- Enabling `tfSetNoRipple` so your account doesn't act as a bridge between two trust lines of the same token.
- As an issuer: authorizing a holder (`tfSetfAuth`) or freezing/unfreezing their line.
- Closing a trust line: set the limit to 0, with no qualities or flags, and a balance of 0.

## How it works inside

**`TrustSet::preflight`**: `LimitAmount` can't be XRP (`temBAD_LIMIT`), can't be negative, and can't have an invalid currency (`temBAD_CURRENCY`), and it must carry an `issuer` (`temDST_NEEDED`). The `tfSetDeepFreeze` and `tfClearDeepFreeze` flags are only allowed with [DeepFreeze](/amendments/DeepFreeze), which is active on testnet.

**`TrustSet::preclaim`**: the issuer can't be yourself (`temDST_IS_SRC`). `tfSetfAuth` only makes sense if your account has `lsfRequireAuth`; otherwise, `tefNO_AUTH_REQUIRED`. Since the AMM amendment is active, the issuer must exist (`tecNO_DST`). If the issuer has `lsfDisallowIncomingTrustline` and the line doesn't exist yet, `tecNO_PERMISSION`. There are dedicated rules for pseudo-accounts: toward an AMM you can only open a line for its LP tokens, and only if the pool isn't empty (`tecAMM_EMPTY`). With DeepFreeze: an account with `lsfNoFreeze` can't freeze (`tecNO_PERMISSION`); you can't freeze and unfreeze in the same tx; and the result can't end up with deep freeze without a regular freeze.

**`TrustSet::doApply`** distinguishes two cases:

- *The line already exists*: it updates your limit, your `QualityIn`/`QualityOut` (0 or `QUALITY_ONE` = remove the field), applies No Ripple (you can only enable it if your balance on the line is ≥ 0; otherwise, `tecNO_PERMISSION`), Auth, and the freeze flags. It then calculates whether each side "needs reserve": it has a limit > 0, a positive balance, a quality, a freeze, or a No Ripple value different from its account's `DefaultRipple`. It raises or lowers each party's `OwnerCount` according to that change (`lsfLowReserve`/`lsfHighReserve`). If both sides end up in the default state, the line is deleted with `trustDelete`. If your side moves to needing reserve and you don't cover it, `tecINSUF_RESERVE_LINE`.
- *The line doesn't exist*: if `LimitAmount` is 0 and you don't set qualities or `tfSetfAuth`, there's nothing to create: `tecNO_LINE_REDUNDANT`. If you don't cover the incremental reserve, `tecNO_LINE_INSUF_RESERVE`. A curious detail in the code: the first two trust lines (`ownerCount < 2`) don't require additional reserve at creation time (`reserveCreate` is 0), even though they do count toward `OwnerCount`. If everything checks out, `trustCreate` inserts the `RippleState` into both accounts' directories.

Delegation: the tx is delegable with granular permissions `TrustlineAuthorize`, `TrustlineFreeze`, etc.; `checkGranularSemantics` requires that `LimitAmount` match the current limit so that the delegate can't change it in the same step.

## Key fields

- **LimitAmount** — `{currency, issuer, value}`. The `issuer` is the counterparty of the line; `value` is your limit. The code re-tags it internally with your account as `account`.
- **QualityIn / QualityOut** — percentage in parts per billion (1e9 = 100%) applied to what comes in/out through the line. `0` or `1000000000` removes the field.

## Flags

- **tfSetfAuth** — as an issuer with `RequireAuth`, authorizes the counterparty to hold your token.
- **tfSetNoRipple / tfClearNoRipple** — enables or removes No Ripple on your side. Enabling it requires a balance ≥ 0 on the line.
- **tfSetFreeze / tfClearFreeze** — freezes or unfreezes the line from your side (useful for issuers). Blocked if you have `lsfNoFreeze`.
- **tfSetDeepFreeze / tfClearDeepFreeze** — deep freeze: in addition to being unable to send, the counterparty also can't receive. Requires the line to already be frozen (or freezing it in the same tx).

## Common errors

- **tecNO_LINE_REDUNDANT** — you're trying to create a line with limit 0 and no other changes. Set a limit > 0.
- **tecNO_LINE_INSUF_RESERVE** / **tecINSUF_RESERVE_LINE** — you don't have XRP for the incremental reserve (0.2 XRP on testnet). Add funds.
- **tecNO_DST** — the specified issuer doesn't exist on the ledger.
- **tecNO_PERMISSION** — the issuer rejects incoming trust lines, you're trying No Ripple with a negative balance, or invalid freeze combinations.
- **tefNO_AUTH_REQUIRED** — you use `tfSetfAuth` without having `asfRequireAuth` enabled.
- **temDST_IS_SRC** — the `issuer` is your own account.
- **temBAD_LIMIT** — `LimitAmount` is XRP or negative.

## Example

```json
{
  "TransactionType": "TrustSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LimitAmount": {
    "currency": "USD",
    "issuer": "rZZZZ_ISSUER",
    "value": "1000"
  },
  "Flags": 131072
}
```

Accepts up to 1000 USD from the issuer and enables `tfSetNoRipple` (131072).

## Try it on testnet

1. You need a second account to act as issuer; the builder can use the demo account `{{issuer}}`.
2. Send the example. Check with `account_lines` (account = yours): a line appears with `limit: "1000"`, `balance: "0"` and `no_ripple: true`.
3. Query `account_info`: your `OwnerCount` has increased by 1 and the required reserve by 0.2 XRP.
4. From the issuer, send a [Payment](/tx/Payment) of `{currency: "USD", issuer: issuer, value: "10"}` to your account: the line's `balance` becomes 10.
5. To close it: return the 10 USD to the issuer, send `TrustSet` with `value: "0"` and `Flags: 262144` (`tfClearNoRipple`) if your account doesn't have `DefaultRipple`; the line disappears from `account_lines`.

## Related

- [Payment](/tx/Payment) — moves tokens over the trust line.
- [AccountSet](/tx/AccountSet) — `asfRequireAuth`, `asfDefaultRipple`, `asfNoFreeze`, `asfGlobalFreeze`, `asfDisallowIncomingTrustline`.
- [Clawback](/tx/Clawback) — the issuer claws back tokens from a line.
- [OfferCreate](/tx/OfferCreate) — trade the token on the DEX.
- Objects: [RippleState](/objects/RippleState), [AccountRoot](/objects/AccountRoot).
- Amendments: [DeepFreeze](/amendments/DeepFreeze), [DisallowIncoming](/amendments/DisallowIncoming), [fixTrustLinesToSelf](/amendments/fixTrustLinesToSelf).
