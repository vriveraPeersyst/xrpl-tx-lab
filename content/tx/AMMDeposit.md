---
title: AMMDeposit
summary: Adds liquidity to an existing AMM, with one or both assets, and receives LP tokens in exchange.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammdeposit
xls: XLS-0030
amendment: AMM
level: intermediate
---

## What it does

`AMMDeposit` adds funds to an already-created [AMM](/objects/AMM) and gives you LP tokens proportional to what you contribute. You can deposit both assets in the pool's current ratio (without moving the price) or only one of them (the pool treats it as a partial operation and gives you fewer LP tokens, because it changes the ratio).

It modifies the AMM object (`LPTokenBalance`), the pseudo-account's trust lines, and your LP token trust line (which is created if it doesn't exist). If the AMM is empty (all LPs withdrew), depositing with `tfTwoAssetIfEmpty` resets it as if it were an `AMMCreate`: it sets the new `TradingFee` and gives you the auction slot and the first vote.

## When to use it

- Joining as a liquidity provider to a pair that already exists.
- Rebalancing a pool by contributing only the asset that's scarce.
- Reactivating an empty AMM (after full withdrawals) without paying the owner reserve of a new `AMMCreate`.

## How it works inside

`AMMDeposit::preflight` validates the **combination of flags and fields**. There must be exactly one subtype flag (`tfDepositSubTx`); if not, `temMALFORMED`. Each subtype requires certain fields and forbids others:

| Flag | Required | Optional | Forbidden |
|---|---|---|---|
| `tfLPToken` | `LPTokenOut` | `Amount` **and** `Amount2` (minimums, together or neither) | `EPrice`, `TradingFee` |
| `tfSingleAsset` | `Amount` | `LPTokenOut` (minimum) | `Amount2`, `EPrice`, `TradingFee` |
| `tfTwoAsset` | `Amount`, `Amount2` | `LPTokenOut` (minimum) | `EPrice`, `TradingFee` |
| `tfOneAssetLPToken` | `Amount`, `LPTokenOut` | — | `Amount2`, `EPrice`, `TradingFee` |
| `tfLimitLPToken` | `Amount`, `EPrice` | — | `LPTokenOut`, `Amount2`, `TradingFee` |
| `tfTwoAssetIfEmpty` | `Amount`, `Amount2` | `TradingFee` | `EPrice`, `LPTokenOut` |

Also: `Asset` ≠ `Asset2` and the amounts must belong to the pair (`temBAD_AMM_TOKENS`), be positive (`temBAD_AMOUNT`; with `tfLimitLPToken` `Amount` can be 0), and `TradingFee` ≤ 1000 (`temBAD_FEE`).

`AMMDeposit::preclaim`:
- Looks up the AMM by `Asset`/`Asset2`; if it doesn't exist → `terNO_AMM`.
- With `tfTwoAssetIfEmpty` the pool must be empty (`LPTokenBalance == 0`); if not, `tecAMM_NOT_EMPTY`. With any other flag the opposite applies: `tecAMM_EMPTY`.
- Since [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) (active) it checks for **both** assets in the pair that you're authorized (`requireAuth`, weak mode) and that there's no freeze (`checkDepositFreeze`), even if you're only depositing one.
- Checks balance: for XRP it uses `xrpLiquid` deducting an extra reserve if you don't yet have an LP token trust line (`tecINSUF_RESERVE_LINE` if the problem is the reserve, `tecUNFUNDED_AMM` if it's the balance); for IOU, `accountFunds` ≥ amount.
- `LPTokenOut` must be this AMM's LP token (`temBAD_AMM_TOKENS`).
- If you're not yet an LP, you need free XRP for one more trust line (`tecINSUF_RESERVE_LINE`).

`AMMDeposit::applyGuts` dispatches by subtype to `equalDepositLimit`, `singleDepositTokens`, `singleDepositEPrice`, `singleDeposit`, `equalDepositTokens`, or `equalDepositInEmptyState`. All of them end up in `AMMDeposit::deposit`, which:
1. Adjusts amounts and LP tokens with `adjustAmountsByLPTokens` (with [fixAMMv1_3](/amendments/fixAMMv1_3) it rounds LP tokens down and assets up, in favor of the pool).
2. If the resulting LP tokens are 0 → `tecAMM_INVALID_TOKENS`; if they don't reach the minimums you set → `tecAMM_FAILED`.
3. Rechecks balance (`tecUNFUNDED_AMM`), moves the assets to the pseudo-account with `WaiveTransferFee::Yes`, and sends you the LP tokens.
4. Updates `LPTokenBalance`; if the pool was empty, `initializeFeeAuctionVote` gives you the vote and the auction slot.

The effective fee (`tfee`) for single-asset deposits is the AMM's, unless you hold the auction slot (`getTradingFee` returns the discounted one).

## Key fields

- **Asset** / **Asset2** — Identify the AMM (`{currency, issuer}` or `{currency: "XRP"}`), with no amount.
- **Amount** / **Amount2** — What you're depositing. With `tfLPToken` they are **minimums** you accept depositing, not exact amounts.
- **LPTokenOut** — LP tokens you want to receive (`tfLPToken`, `tfOneAssetLPToken`) or the minimum acceptable (in `tfSingleAsset`/`tfTwoAsset`). Must be the AMM's token: `currency` hex `03…` and `issuer` the pseudo-account.
- **EPrice** — Maximum effective price per LP token you accept paying in a single-asset deposit (`tfLimitLPToken`).
- **TradingFee** — Only with `tfTwoAssetIfEmpty`: new fee when resetting the pool.

## Flags

- **tfLPToken** (65536) — Balanced deposit requesting an exact amount of LP tokens.
- **tfSingleAsset** (524288) — Single-asset deposit for a fixed amount.
- **tfTwoAsset** (1048576) — Deposit of both assets with maximum limits; the pool takes whatever keeps the ratio.
- **tfOneAssetLPToken** (2097152) — One asset, requesting exact LP tokens; `Amount` is the maximum to spend.
- **tfLimitLPToken** (4194304) — One asset with an effective price limit `EPrice`.
- **tfTwoAssetIfEmpty** (8388608) — Only for resetting an empty AMM.

## Common errors

- **temMALFORMED** — Flags and fields don't match (for example `tfSingleAsset` with `Amount2`, or no flag at all).
- **terNO_AMM** — No AMM exists for that pair; create one with [AMMCreate](/tx/AMMCreate).
- **tecAMM_EMPTY** — The pool is empty; use `tfTwoAssetIfEmpty`.
- **tecUNFUNDED_AMM** — Insufficient balance of the deposited asset.
- **tecINSUF_RESERVE_LINE** — Missing XRP for the reserve of the LP token trust line.
- **tecAMM_FAILED** — Your minimums aren't met (`LPTokenOut`, `Amount`/`Amount2` with `tfLPToken`, or `EPrice`).
- **tecFROZEN** / **tecNO_AUTH** — Either asset is frozen or you're not authorized.

## Example

```json
{
  "TransactionType": "AMMDeposit",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" },
  "Amount": "1000000",
  "Flags": 524288
}
```

Deposits 1 XRP as a single asset into the XRP/USD pool.

## Try it on testnet

1. Make sure the XRP/USD AMM exists (`amm_info`); if not, create it with [AMMCreate](/tx/AMMCreate).
2. Have a trust line to `rZZZZ_EMISOR` (even if you deposit XRP, `preclaim` checks authorization and freeze on both assets) and free XRP for one more trust line.
3. Send the example with `Flags: 524288`. Note the `lp_token.value` from `amm_info` before and after: your LP token balance goes up and the pool's `amount` increases by 1 XRP.
4. Try variants: `Flags: 1048576` with `Amount` and `Amount2` for a balanced deposit, or `Flags: 65536` with `LPTokenOut` and observe how much of each asset gets deducted.
5. Send `tfSingleAsset` with `Amount2` included to see `temMALFORMED`, or a huge `LPTokenOut` with `tfSingleAsset` to trigger `tecAMM_FAILED`.

## Related

- [AMMCreate](/tx/AMMCreate), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [AMMClawback](/amendments/AMMClawback)
