---
title: AMMCreate
summary: Creates an automated market maker (AMM) for a pair of assets, deposits the initial liquidity, and gives you the LP tokens.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammcreate
xls: XLS-0030
amendment: AMM
level: intermediate
---

## What it does

An AMM (*Automated Market Maker*) is a liquidity pool holding two assets that prices trades automatically according to the constant-product formula: anyone can swap one asset for the other against the pool, and the price moves according to the ratio of the reserves. Liquidity providers (LPs) deposit both assets and receive **LP tokens** in exchange, which represent their share of the pool and entitle them to trading fees.

`AMMCreate` is the transaction that spins up one of these pools. It creates three things on the ledger: an [AMM](/objects/AMM) object that holds the state (assets, `LPTokenBalance`, `TradingFee`, `VoteSlots`, and `AuctionSlot`), a **pseudo-account** [AccountRoot](/objects/AccountRoot) with an `AMMID` field that custodies the funds, and the [trust lines](/objects/RippleState) (or MPToken) between that pseudo-account and the asset issuers, flagged with `lsfAMMNode`. Your account receives the initial LP tokens, which are an IOU issued by the pseudo-account with a currency code derived from the pair.

Only one AMM can exist per asset pair. The creator becomes the first fee voter and takes the first *auction slot* for free.

## When to use it

- Opening a market for a new token against XRP (or against another token) without needing to maintain orders on the order book.
- Earning trading fees by providing passive liquidity to a pair.
- Giving depth to an illiquid pair so that cross-currency payments can find liquidity (the payment engine uses the AMM together with the order book).

## How it works inside

`AMMCreate::checkExtraFeatures` requires the [AMM](/amendments/AMM) amendment, and if either amount is an MPT, also [MPTokensV2](/amendments/MPTokensV2) (not active on testnet: today only XRP and IOU).

`AMMCreate::preflight` (static validation):
- `Amount` and `Amount2` cannot be the same asset (`temBAD_AMM_TOKENS`).
- Both amounts must be strictly positive (`temBAD_AMOUNT`).
- `TradingFee` cannot exceed `kTradingFeeThreshold` = 1000, i.e. 1% (`temBAD_FEE`).

`AMMCreate::calculateBaseFee` is special: the transaction fee **isn't the normal base fee**, but an incremental *owner reserve* (0.2 XRP on testnet). It's the price of creating the pseudo-account and it's burned.

`AMMCreate::preclaim` (against the ledger):
- If an AMM object already exists for that pair → `tecDUPLICATE`.
- If any issuer has `lsfRequireAuth` and your trust line isn't authorized → `tecNO_AUTH` (via `requireAuth`).
- If any asset is frozen (globally or individually) for your account → `tecFROZEN`.
- If an IOU's issuer **doesn't have `lsfDefaultRipple`** → `terNO_RIPPLE`. This is the most common failure cause with test tokens: the issuer must have sent `AccountSet` with `asfDefaultRipple`.
- You must have free XRP above the reserve, counting one more trust line (the LP tokens' one); if not, `tecINSUF_RESERVE_LINE`.
- If you don't have enough balance of either asset → `tecUNFUNDED_AMM`.
- You cannot use LP tokens from another AMM as an asset (`tecAMM_INVALID_TOKENS`): detected because the issuer has an `AMMID`.
- With [SingleAssetVault](/amendments/SingleAssetVault) active (not on testnet), vault *shares* are also not accepted (`tecWRONG_ASSET`).
- Since [AMMClawback](/amendments/AMMClawback) is active, creating an AMM with tokens whose issuer has `lsfAllowTrustLineClawback` is allowed; before that amendment it returned `tecNO_PERMISSION`.

`AMMCreate::doApply` (effects, in `applyCreate`):
1. Creates the pseudo-account with `createPseudoAccount`, linked to the AMM via `AMMID`.
2. Computes the initial LP tokens as `sqrt(Amount × Amount2)` (`ammLPTokens`, rounded down since [fixAMMv1_3](/amendments/fixAMMv1_3)).
3. Creates the AMM object with `Asset`/`Asset2` ordered canonically, and calls `initializeFeeAuctionVote`: your account is placed in `VoteSlots` with `TradingFee` and takes the `AuctionSlot`.
4. Sends you the LP tokens and moves `Amount` and `Amount2` from your account to the pseudo-account with `WaiveTransferFee::Yes` (the issuer's transfer fee doesn't apply). The pseudo-account's trust lines are created with limit 0 and flag `lsfAMMNode`.
5. Registers the pair's two order books in `OrderBookDB` if they didn't already exist.

## Key fields

- **Amount** / **Amount2** — Initial deposit of each asset. The ratio between them sets the pool's starting price: if you deposit 10 XRP and 10 USD, the AMM quotes 1 XRP = 1 USD until someone trades.
- **TradingFee** — Fee the pool charges on each trade, in units of 1/100,000. `500` = 0.5%. Maximum `1000` (1%). It's a required field; you can set `0`.
- **Fee** — Remember it must cover the incremental owner reserve (200,000 drops on testnet), not the usual 10 drops. The builder calculates it for you.

## Common errors

- **terNO_RIPPLE** — The token's issuer doesn't have `DefaultRipple` enabled. Ask them to send `AccountSet` with `SetFlag: 8`.
- **tecDUPLICATE** — There's already an AMM for that pair. Use [AMMDeposit](/tx/AMMDeposit) instead.
- **tecUNFUNDED_AMM** — You don't have enough balance of one of the two assets (for XRP the reserve is deducted).
- **tecINSUF_RESERVE_LINE** — You're missing XRP for the reserve of the LP tokens' trust line.
- **temBAD_FEE** — `TradingFee` greater than 1000.
- **temBAD_AMM_TOKENS** — The two assets are the same.
- **tecFROZEN** / **tecNO_AUTH** — Token frozen, or the issuer requires authorization and you don't have it.
- **telINSUF_FEE_P** — `Fee` below the incremental owner reserve.

## Example

```json
{
  "TransactionType": "AMMCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Amount": "10000000",
  "Amount2": {
    "currency": "USD",
    "issuer": "rZZZZ_EMISOR",
    "value": "10"
  },
  "TradingFee": 500
}
```

Creates an XRP/USD pool with 10 XRP and 10 USD and a 0.5% fee.

## Try it on testnet

1. You need a trust line to `rZZZZ_EMISOR` for USD with a balance (the issuer must have `DefaultRipple`). If you don't have one yet, send a [TrustSet](/tx/TrustSet) first and request funds from the test issuer.
2. Check that you have at least 10 free XRP above the reserve plus 0.2 XRP for the special fee.
3. Fill in the builder with the example and send it. Notice that `Fee` is set to 200000 drops.
4. In the metadata you'll see three `CreatedNode` entries: `AMM`, `AccountRoot` (the pseudo-account), and `RippleState` (USD and LP token trust lines).
5. Call `amm_info` with `asset: {currency: "XRP"}` and `asset2: {currency: "USD", issuer: ...}`: you'll see `amount`, `amount2`, `lp_token` with your balance, `trading_fee: 500`, and your account in `vote_slots` and `auction_slot`.
6. With `account_lines` on your account, the LP tokens line appears (hex currency starting with `03`).

## Related

- [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [AMM](/objects/AMM), [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [AMMClawback](/amendments/AMMClawback), [fixAMMv1_3](/amendments/fixAMMv1_3), [MPTokensV2](/amendments/MPTokensV2)
- [TrustSet](/tx/TrustSet), [AccountSet](/tx/AccountSet)
