---
title: AMMVote
summary: Votes on an AMM's trading fee; vote weight is your share of LP tokens.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammvote
xls: XLS-0030
amendment: AMM
level: basic
---

## What it does

An [AMM](/objects/AMM)'s trading fee isn't set permanently by anyone: it's decided by liquidity providers through weighted voting. With `AMMVote` you propose a `TradingFee`, and the AMM recalculates the fee as the average of the current votes, weighted by each voter's LP tokens.

The AMM object stores up to 8 votes in `VoteSlots` (`kVoteMaxSlots`). If all 8 are occupied, you can only get in if you have more LP tokens than the voter with the fewest (or the same amount and you propose a higher fee), and you bump that voter out. Every `AMMVote` also refreshes the weights of all votes based on current LP token balances, and discards voters who are no longer LPs.

## When to use it

- As a significant LP, raising the fee to earn more per trade or lowering it to attract volume.
- Refreshing `VoteSlots` weights after large deposits or withdrawals (any vote recalculates them).
- Bringing the fee back to 0 on a pool you want to use as a cheap "bridge" between two assets.

## How it works inside

`AMMVote::preflight`: `Asset` ≠ `Asset2` and both valid (`temBAD_AMM_TOKENS`); `TradingFee` ≤ `kTradingFeeThreshold` = 1000 (`temBAD_FEE`).

`AMMVote::preclaim`: no AMM → `terNO_AMM`; `LPTokenBalance == 0` → `tecAMM_EMPTY`; if your account has no LP tokens for this AMM (`ammLPHolds == 0`) → `tecAMM_INVALID_TOKENS`.

`AMMVote::doApply` (in `applyVote`):
1. Walks `VoteSlots`. For each entry it looks up the voter's current LP token balance; if it's 0 it discards the entry. If the entry is yours, it replaces its `TradingFee` with the new one. It accumulates `num += fee × tokens` and `den += tokens`, and recalculates `VoteWeight = tokens × 100000 / LPTokenBalance`.
2. Locates the "minimum" vote (fewest tokens; on a tie, lowest fee; on a further tie, lowest AccountID).
3. If you had no vote: with fewer than 8 entries yours is added; with 8, the minimum one is replaced only if `your tokens > minTokens` or (`equal` and `your fee > minFee`). Otherwise your vote **doesn't get in but the transaction still succeeds** (`tesSUCCESS`) and only serves to refresh the weights.
4. The new fee is `num / den` truncated to an integer. If it comes out 0, the AMM's `TradingFee` field and the auction slot's `DiscountedFee` are removed. Otherwise, `TradingFee` is set and `DiscountedFee = TradingFee / 10` (`kAuctionSlotDiscountedFeeFraction`).

The changes immediately affect all operations that go through the AMM, including the discounted fee of the [auction slot](/tx/AMMBid) holder.

## Key fields

- **Asset** / **Asset2** — The pair identifying the AMM (no amounts).
- **TradingFee** — Your proposal, in units of 1/100,000: `300` = 0.3%. Range 0–1000. This is what you want the pool to charge, not what it will end up charging: the final value is the weighted average of all `VoteSlots`.

## Common errors

- **tecAMM_INVALID_TOKENS** — You have no LP tokens for this AMM. Deposit first with [AMMDeposit](/tx/AMMDeposit).
- **terNO_AMM** — The pair has no AMM (check `Asset`/`Asset2` and `issuer`).
- **tecAMM_EMPTY** — The pool is empty; there's nothing to vote on.
- **temBAD_FEE** — `TradingFee` greater than 1000.
- **temBAD_AMM_TOKENS** — `Asset` and `Asset2` are the same.

## Example

```json
{
  "TransactionType": "AMMVote",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_ISSUER" },
  "TradingFee": 300
}
```

## Try it on testnet

1. Be an LP of the XRP/USD AMM (if you created it yourself with `TradingFee: 500`, you already have a vote in `VoteSlots`).
2. Query `amm_info` and note `trading_fee` and `vote_slots` (each entry shows `account`, `trading_fee`, and `vote_weight`).
3. Send the example with `TradingFee: 300`. If you're the only LP, `trading_fee` becomes 300 and `auction_slot.discounted_fee` becomes 30.
4. Have another account deposit (for example, half of your liquidity) and vote `TradingFee: 900`: the resulting fee will be the weighted average (with weights 2/3 and 1/3, it would land at 500).
5. Withdraw everything with one of the accounts and vote again with the other: the entry for the LP that left disappears from `vote_slots`.

## Related

- [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMBid](/tx/AMMBid), [AMMWithdraw](/tx/AMMWithdraw)
- [AMM](/objects/AMM)
- [AMM](/amendments/AMM)
