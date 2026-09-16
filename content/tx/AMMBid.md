---
title: AMMBid
summary: Bid with LP tokens for an AMM's auction slot to trade for 24 hours at a discounted fee (1/10 of the normal fee).
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammbid
xls: XLS-0030
amendment: AMM
level: advanced
---

## What it does

Each [AMM](/objects/AMM) has a single **auction slot**: whoever holds it trades against the pool paying only a tenth of the trading fee (`DiscountedFee = TradingFee / 10`) for 24 hours, and can designate up to 4 additional accounts (`AuthAccounts`) that enjoy the same discount. It's a mechanism designed for arbitrageurs: whoever gets the most value from trading cheaply pays for it, and that payment (in LP tokens) is **burned**, which increases the value of every other provider's LP tokens.

`AMMBid` is the bid. You pay with your LP tokens; if the slot is free or expired you pay the minimum price, and if someone holds it you pay an increasing price, part of which is refunded to the previous holder for the time they had left. It only modifies the AMM object (`AuctionSlot`, `LPTokenBalance`) and the LP token trust lines involved.

## When to use it

- Arbitraging between the AMM and the order book or other markets: with enough trades, the discount offsets the slot's price.
- Trading at a reduced fee from several accounts in your operation using `AuthAccounts`.
- As an LP, you don't need to do anything: every bid burns LP tokens and revalues yours.

## How it works inside

`AMMBid::preflight`: `Asset` ≠ `Asset2`; `BidMin` and `BidMax` must be positive if present; `AuthAccounts` with at most 4 entries (`kAuctionSlotMaxAuthAccounts`), and since [fixAMMv1_3](/amendments/fixAMMv1_3) no duplicates or your own account (`temMALFORMED`).

`AMMBid::preclaim`: no AMM → `terNO_AMM`; empty pool → `tecAMM_EMPTY`; every `AuthAccounts[].Account` must exist (`terNO_ACCOUNT`); if you have no LP tokens → `tecAMM_INVALID_TOKENS`. `BidMin`/`BidMax` must be the AMM's LP token (`temBAD_AMM_TOKENS`), must not exceed your balance or the pool's total, and `BidMin ≤ BidMax` (`tecAMM_INVALID_TOKENS`).

`AMMBid::doApply` (in `applyBid`):
- Minimum price: `ammAuctionMinSlotPrice` = `LPTokenBalance × TradingFee / 25` (`kAuctionSlotMinFeeFraction`, with `TradingFee` as a fraction). The day is divided into 20 intervals of 72 minutes each (`kAuctionSlotTimeIntervals`, `kAuctionSlotIntervalDuration`), and `ammAuctionTimeSlot` calculates which one the current holder is in.
- **Free or expired slot** (or the holder is in interval 19, or their account no longer exists): you pay `minSlotPrice` and it's all burned.
- **Occupied slot**: in interval 0 the price is `pricePaid × 1.05 + minSlotPrice`; in the rest, `pricePaid × 1.05 × (1 − fractionUsed^60) + minSlotPrice`, so it drops quickly as the slot gets used up. The previous holder is refunded `remainingFraction × pricePaid`, and the difference is burned.
- `getPayPrice` applies your limits: with `BidMin` you pay `max(price, BidMin)`; with `BidMax` the bid fails with `tecAMM_FAILED` if the price exceeds it; if the final price exceeds your LP tokens → `tecAMM_INVALID_TOKENS`. With [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) (not yet active on testnet) pools with `TradingFee` 0 will use a minimum price calculated with fee 1 to avoid free bids; today on testnet a pool with fee 0 has a minimum price of 0.
- `updateSlot` writes `Account`, `Expiration = now + 86400` (`kTotalTimeSlotSecs`), `DiscountedFee`, `Price`, and `AuthAccounts` into the `AuctionSlot`, burns the LP tokens with `redeemIOU`, and reduces `LPTokenBalance`.

## Key fields

- **BidMin** — Minimum you're willing to pay (in LP tokens). Useful for ensuring you outbid a rival even if the calculated price is lower.
- **BidMax** — Maximum you'll accept paying. If the calculated price exceeds it, the transaction fails instead of spending more.
- **AuthAccounts** — Up to 4 objects `{ "AuthAccount": { "Account": "r..." } }` that also trade at the discount. It fully replaces the previous list; if you omit it, the slot is left with no authorized accounts.

All three amounts are expressed in the AMM's LP token: `{currency: "03…", issuer: <pseudo-account>, value}` as it appears in `amm_info` → `lp_token`.

## Common errors

- **tecAMM_INVALID_TOKENS** — You're not an LP, or the price to pay (or `BidMin`/`BidMax`) exceeds your LP tokens or the pool's total.
- **tecAMM_FAILED** — The calculated price exceeds `BidMax`.
- **temBAD_AMM_TOKENS** — `BidMin`/`BidMax` aren't this AMM's LP token.
- **temMALFORMED** — More than 4 `AuthAccounts`, duplicates, or your own account.
- **terNO_ACCOUNT** — Some account in `AuthAccounts` doesn't exist in the ledger.
- **terNO_AMM** / **tecAMM_EMPTY** — The pair has no AMM or it's empty.

## Example

```json
{
  "TransactionType": "AMMBid",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" }
}
```

Without `BidMin`/`BidMax` you pay exactly the calculated price.

## Try it on testnet

1. Be an LP of the XRP/USD AMM. Query `amm_info` and look at `auction_slot`: if you created it, you'll see your account as the holder with `price` 0 and `expiration` 24 h after creation.
2. From **another** account that is also an LP (do an [AMMDeposit](/tx/AMMDeposit) with it) send the example. Since the slot is occupied in interval 0, it will pay `0 × 1.05 + minSlotPrice`; check in the metadata that its LP token line goes down, that the AMM's `LPTokenBalance` goes down by the burned amount, and that `auction_slot.account` changes.
3. Repeat from the first account with a very low `BidMax` (e.g. `"value": "0.000001"`) to trigger `tecAMM_FAILED`.
4. Add `AuthAccounts` with `rYYYY_OTHER_ACCOUNT` and check that it appears in `auction_slot.auth_accounts`.
5. To see the discount in action, do a [Payment](/tx/Payment) with an XRP→USD conversion from the holder account and compare the price obtained with that of an account without a slot.

## Related

- [AMMVote](/tx/AMMVote) (sets `TradingFee` and thus `DiscountedFee`), [AMMDeposit](/tx/AMMDeposit), [AMMCreate](/tx/AMMCreate)
- [AMM](/objects/AMM)
- [AMM](/amendments/AMM), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
