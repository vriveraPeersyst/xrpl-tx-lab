---
title: AMM
summary: An automated liquidity pool between two assets, with its trading fee, provider votes, and the discounted auction slot.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/amm
createdBy: AMMCreate
modifiedBy: AMMDeposit, AMMWithdraw, AMMVote, AMMBid, AMMClawback, AMMDelete, Payment, OfferCreate
reserve: 0
---

## What it represents

An `AMM` is an automated market maker: a pool with two assets (XRP, issued tokens, or MPTs) that anyone can use to swap one for the other at a price set by the constant product formula. Whoever provides liquidity receives *LP tokens*, a token issued by the AMM's pseudo-account that represents their share.

The `AMM` object stores the pool's configuration and governance. The funds are not held in it, but in the pseudo-account: an [AccountRoot](/objects/AccountRoot) with the `AMMID` field pointing to this object, with no private keys, whose balances live in `Balance` (XRP), in [RippleState](/objects/RippleState) lines with `lsfAMMNode`, or in [MPToken](/objects/MPToken) objects with `lsfMPTAMM`.

## Lifecycle

- **Creation**: [AMMCreate](/tx/AMMCreate) creates the object, the pseudo-account (`createPseudoAccount` in `AMMCreate::doApply`), and the first deposit. This transaction charges as its fee the equivalent of an owner reserve increment (`AMMCreate::calculateBaseFee`), 0.2 XRP on testnet, instead of the normal fee.
- **Modification**: [AMMDeposit](/tx/AMMDeposit) and [AMMWithdraw](/tx/AMMWithdraw) move `LPTokenBalance`; [AMMVote](/tx/AMMVote) updates `VoteSlots` and recalculates `TradingFee`; [AMMBid](/tx/AMMBid) changes `AuctionSlot`; [AMMClawback](/tx/AMMClawback) lets an issuer with clawback enabled withdraw its token from the pool; any [Payment](/tx/Payment) or [OfferCreate](/tx/OfferCreate) that crosses the pool changes the pseudo-account's balances, not this object.
- **Deletion**: when the last withdrawal leaves `LPTokenBalance` at zero, `AMMWithdraw` attempts to delete the AMM and its pseudo-account. If there are too many trust lines to clean up in a single transaction (`tecINCOMPLETE`), you need to finish the job with [AMMDelete](/tx/AMMDelete).

## Key fields

- **Account** — address of the pseudo-account that holds the assets and issues the LP tokens.
- **Asset / Asset2** — the pool's two assets, in canonical order. Their hash determines the object's key.
- **LPTokenBalance** — total LP tokens in circulation. The currency is a 160-bit hex code computed from the two assets (`ammLPTCurrency`).
- **TradingFee** — fee in units of 1/100,000 (1000 = 1%, maximum 1000). It is the weighted average of `VoteSlots`.
- **VoteSlots** — up to 8 votes; each stores `Account`, `TradingFee`, and `VoteWeight` (share of LP tokens at the time of the vote).
- **AuctionSlot** — who won the 24-hour auction: `Account`, `Price` paid in LP tokens, `Expiration`, `DiscountedFee` (one-tenth of `TradingFee`), and up to 4 `AuthAccounts` who also enjoy the discount.

## Flags

It has no `lsf*` flags of its own.

## How to query it

The dedicated command is `amm_info` (with `asset` and `asset2`, or with `amm_account`). With `ledger_entry`, pass the asset pair:

```json
{ "method": "ledger_entry", "params": [{ "amm": { "asset": { "currency": "XRP" }, "asset2": { "currency": "USD", "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq" } }, "ledger_index": "validated" }] }
```

The key is `SHA512Half(0x0041 || asset1 || asset2)` (`keylet::amm`). In `account_objects` of the pseudo-account, use `type: "amm"`. Typical response:

```json
{
  "node": {
    "LedgerEntryType": "AMM",
    "Account": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE",
    "Asset": { "currency": "XRP" },
    "Asset2": { "currency": "USD", "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq" },
    "LPTokenBalance": { "currency": "03930D02208264E2E40EC1B0C09E4DB96EE197B1", "issuer": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE", "value": "1000" },
    "TradingFee": 500,
    "VoteSlots": [ { "VoteEntry": { "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "TradingFee": 500, "VoteWeight": 100000 } } ],
    "AuctionSlot": { "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "DiscountedFee": 50, "Expiration": 811500000, "Price": { "currency": "03930D02208264E2E40EC1B0C09E4DB96EE197B1", "issuer": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE", "value": "0" } },
    "OwnerNode": "0"
  }
}
```

## Reserve

The object belongs to the pseudo-account, not to you, so it does not add to your `OwnerCount`. What you pay is `AMMCreate`'s special fee (a reserve increment, which is burned) and the reserve for your LP token trust line.

## Related

- [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [RippleState](/objects/RippleState), [MPToken](/objects/MPToken), [Offer](/objects/Offer)
- [AMM](/amendments/AMM), [AMMClawback](/amendments/AMMClawback), [fixAMMv1_3](/amendments/fixAMMv1_3)
