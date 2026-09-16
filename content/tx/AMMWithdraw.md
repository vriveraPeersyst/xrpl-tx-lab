---
title: AMMWithdraw
summary: Withdraws liquidity from an AMM by burning LP tokens, in both assets or just one; if the pool ends up empty, deletes the AMM.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammwithdraw
xls: XLS-0030
amendment: AMM
level: intermediate
---

## What it does

`AMMWithdraw` is the reverse of [AMMDeposit](/tx/AMMDeposit): you hand LP tokens over to the pool and receive part of its reserves in exchange. You can withdraw both assets in the current ratio (balanced withdrawal) or a single asset (one-sided withdrawal, which the pool charges the trading fee on because it moves the price).

It modifies the [AMM](/objects/AMM) object (`LPTokenBalance` decreases), the pseudo-account's trust lines, and your LP token one. If your withdrawal brings `LPTokenBalance` to zero, the transactor tries to delete the entire AMM (object, pseudo-account, and trust lines) in the same transaction. If the pseudo-account has too many trust lines to delete at once, the transaction ends with `tecINCOMPLETE` and you have to finish the job with [AMMDelete](/tx/AMMDelete).

## When to use it

- Recovering your liquidity and the fees it has accrued (the value of your LP tokens grows with the pool's fees).
- Exiting a pair completely with `tfWithdrawAll` without calculating how many LP tokens you have.
- Withdrawing only the asset you're interested in (`tfSingleAsset`), accepting the trading fee.
- As a token issuer, withdrawing your own asset from the pool even if you have it frozen: `AMMWithdraw::issuerFreezeHandling` ignores the freeze when the withdrawer is the issuer (since [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)).

## How it works inside

`AMMWithdraw::preflight` requires exactly one subtype flag (`tfWithdrawSubTx`), otherwise `temMALFORMED`, and validates the combination of fields:

| Flag | Required | Forbidden |
|---|---|---|
| `tfLPToken` | `LPTokenIn` | `Amount`, `Amount2`, `EPrice` |
| `tfWithdrawAll` | — | all of them |
| `tfSingleAsset` | `Amount` | `LPTokenIn`, `Amount2`, `EPrice` |
| `tfOneAssetWithdrawAll` | `Amount` (can be 0: it's a minimum) | `LPTokenIn`, `Amount2`, `EPrice` |
| `tfTwoAsset` | `Amount`, `Amount2` | `LPTokenIn`, `EPrice` |
| `tfOneAssetLPToken` | `Amount` (minimum, can be 0), `LPTokenIn` | `Amount2`, `EPrice` |
| `tfLimitLPToken` | `Amount`, `EPrice` | `LPTokenIn`, `Amount2` |

The amounts must belong to the pair (`temBAD_AMM_TOKENS`) and `LPTokenIn` must be positive.

`AMMWithdraw::preclaim`:
- No AMM for the pair → `terNO_AMM`; with `LPTokenBalance == 0` → `tecAMM_EMPTY`.
- Each `Amount`/`Amount2` cannot exceed the pool's reserve (`tecAMM_BALANCE`), you must be authorized to receive it (`requireAuth`, weak mode, so the trust line can be created for you), and `checkWithdrawFreeze` checks that neither the pseudo-account nor you are frozen for that asset.
- If you have no LP tokens → `tecAMM_BALANCE`. If you request more `LPTokenIn` than you have → `tecAMM_INVALID_TOKENS`. If `LPTokenIn` or `EPrice` isn't this AMM's LP token → `temBAD_AMM_TOKENS`.
- With `tfLPToken` or `tfWithdrawAll`, both full assets of the pool are also checked.

`AMMWithdraw::applyGuts`:
1. With [fixAMMv1_1](/amendments/fixAMMv1_1), `verifyAndAdjustLPTokenBalance` fixes rounding mismatches when you're the last LP, so you can withdraw everything.
2. Dispatches by subtype to `equalWithdrawLimit`, `singleWithdrawTokens`, `singleWithdrawEPrice`, `singleWithdraw`, or `equalWithdrawTokens`. The fee used is `getTradingFee` (discounted if you hold the auction slot).
3. All of them reach `AMMWithdraw::withdraw`, which adjusts amounts (`adjustAmountsByLPTokens`, with [fixAMMv1_3](/amendments/fixAMMv1_3) rounding in favor of the pool), rejects withdrawing exactly one whole side of the pool or more than its reserves (`tecAMM_BALANCE`), and since [fixAMMv1_2](/amendments/fixAMMv1_2) verifies you have reserve for the asset's trust line if you don't already have one (`tecINSUFFICIENT_RESERVE`). It then sends the assets from the pseudo-account (no transfer fee) and burns your LP tokens with `redeemIOU`.
4. `deleteAMMAccountIfEmpty`: if the new `LPTokenBalance` is zero, it calls `deleteAMMAccount`, which deletes up to `kMaxDeletableAmmTrustLines` = 512 trust lines; if more remain, it returns `tecINCOMPLETE` and the AMM keeps existing with zero balance.

## Key fields

- **LPTokenIn** — LP tokens you're burning. Object `{currency, issuer, value}` with hex currency `03…` and the pseudo-account as `issuer` (you can see them in `amm_info` → `lp_token`).
- **Amount** / **Amount2** — Assets to withdraw. With `tfTwoAsset` they're maximums and the pool keeps the ratio; with `tfOneAssetLPToken` and `tfOneAssetWithdrawAll`, `Amount` is a minimum you accept.
- **EPrice** — Maximum effective price per LP token in a single-asset withdrawal (`tfLimitLPToken`), expressed in LP tokens.

## Flags

- **tfLPToken** (65536) — Balanced withdrawal burning exactly `LPTokenIn`.
- **tfWithdrawAll** (131072) — Balanced withdrawal of all your LP tokens. The simplest way to exit.
- **tfOneAssetWithdrawAll** (262144) — Burns all your LP tokens receiving a single asset, at least `Amount`.
- **tfSingleAsset** (524288) — Withdraws exactly `Amount` of one asset; the pool calculates the LP tokens.
- **tfTwoAsset** (1048576) — Withdraws both assets with `Amount`/`Amount2` as maximums.
- **tfOneAssetLPToken** (2097152) — Burns `LPTokenIn` receiving one asset, at least `Amount`.
- **tfLimitLPToken** (4194304) — One asset with an effective price limit `EPrice`.

## Common errors

- **temMALFORMED** — Invalid combination of flags and fields (for example `tfWithdrawAll` with `Amount`).
- **tecAMM_BALANCE** — You have no LP tokens, you're asking for more than the pool holds, or the withdrawal would leave one side empty.
- **tecAMM_INVALID_TOKENS** — `LPTokenIn` exceeds your balance, or the calculation rounds to zero LP tokens.
- **tecAMM_FAILED** — With `tfLimitLPToken`, the effective price exceeds `EPrice`; with `tfOneAssetLPToken`, the minimum `Amount` isn't reached.
- **tecINSUFFICIENT_RESERVE** — You're missing reserve for the trust line of the asset you're receiving.
- **tecFROZEN** — The asset is frozen for you or for the pseudo-account (unless you're its issuer).
- **tecINCOMPLETE** — You withdrew everything but the AMM has more than 512 trust lines; follow up with [AMMDelete](/tx/AMMDelete).

## Example

```json
{
  "TransactionType": "AMMWithdraw",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_ISSUER" },
  "Flags": 131072
}
```

Withdraws your entire position from the XRP/USD pool in both assets.

## Try it on testnet

1. Be an LP of the XRP/USD AMM (created with [AMMCreate](/tx/AMMCreate) or after an [AMMDeposit](/tx/AMMDeposit)). Query `amm_info` and note `lp_token` and `amount`/`amount2`.
2. For a partial withdrawal, send `Flags: 65536` with `LPTokenIn` equal to half your `lp_token.value` (same `currency` and `issuer`). You'll see your LP token line drop and your XRP and USD balances rise proportionally.
3. To exit entirely, send the example (`tfWithdrawAll`). If you were the only LP, the metadata will show `DeletedNode` entries for `AMM`, `AccountRoot`, and `RippleState`, and `amm_info` will return `actNotFound`.
4. Try `Flags: 524288` with `Amount: "500000"` to withdraw only 0.5 XRP and compare how many LP tokens get burned versus a balanced withdrawal: the difference is the trading fee.

## Related

- [AMMDeposit](/tx/AMMDeposit), [AMMCreate](/tx/AMMCreate), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [fixAMMv1_1](/amendments/fixAMMv1_1), [fixAMMv1_2](/amendments/fixAMMv1_2), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)
