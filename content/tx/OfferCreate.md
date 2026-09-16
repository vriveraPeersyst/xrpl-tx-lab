---
title: OfferCreate
summary: Publishes an order on the native DEX to exchange one asset for another, first crossing any existing orders that satisfy it.
category: dex
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/offercreate
level: intermediate
---

## What it does

`OfferCreate` is the limit order of the XRPL's decentralized order book. You declare what you're delivering (`TakerGets`) and what you want in return (`TakerPays`); the ratio between the two sets the price. When applied, the transaction first tries to **cross** your order against those already in the opposite book at that price or better, using the same payment engine (`flow`) that [Payment](/tx/Payment) uses. If anything remains after crossing, the remainder is stored on the ledger as an [Offer](/objects/Offer) object that consumes one owner reserve unit (0.2 XRP on testnet).

Think of it as an order from a classic exchange, but with two differences: crossing is immediate and deterministic within the same transaction, and the order left in the book doesn't lock funds; it's only executed if you still have the balance when someone crosses it.

The transaction can also cancel a previous order in the same step (`OfferSequence`) and, with [PermissionedDEX](/amendments/PermissionedDEX), be placed in a permissioned book (`DomainID`).

## When to use it

- Exchanging XRP for an issued token (IOU) or vice versa at a price you set.
- Exchanging two tokens for each other: the engine automatically adds an intermediate route via XRP if it improves the price.
- Providing passive liquidity with `tfPassive` without crossing orders at the same price.
- Executing an "all or nothing" purchase (`tfFillOrKill`) or "whatever's available right now" (`tfImmediateOrCancel`).
- Replacing a live order with another in a single transaction using `OfferSequence`.

## How it works inside

**`OfferCreate::preflight`** (static validation):
- `tfImmediateOrCancel` and `tfFillOrKill` together → `temINVALID_FLAG`. `tfHybrid` without `DomainID` → `temINVALID_FLAG`.
- `Expiration` present but equal to 0 → `temBAD_EXPIRATION`; `OfferSequence` equal to 0 → `temBAD_SEQUENCE`.
- Both amounts must be positive. XRP for XRP → `temBAD_OFFER`; the same asset on both sides → `temREDUNDANT`; currency code "XRP" in an IOU → `temBAD_CURRENCY`; issuer inconsistent with the amount type → `temBAD_ISSUER`.
- With `fixCleanup3_2_0` (active on testnet) a `DomainID` of all zeros is `temMALFORMED`.

**`OfferCreate::preclaim`** (against the ledger):
- Neither asset can be globally frozen (`checkGlobalFrozen`).
- You must have **at least something** of the asset you're delivering: `accountFunds(TakerGets) <= 0` → `tecUNFUNDED_OFFER`. You don't need to cover the full amount.
- `OfferSequence` must be less than your current `Sequence`, otherwise `temBAD_SEQUENCE`.
- If `Expiration` has already passed → `tecEXPIRED`.
- If `TakerPays` is a token, `OfferCreate::checkAcceptAsset` checks that you can receive it: the issuer must exist (`tecNO_ISSUER`); if the issuer has `lsfRequireAuth` you need an authorized trust line (`tecNO_LINE` / `tecNO_AUTH`); a trust line in deep freeze → `tecFROZEN`.
- With `DomainID`, the account must belong to the permissioned domain or own it; if not, `tecNO_PERMISSION`.

**`OfferCreate::doApply` → `applyGuts`** (effects):
1. If there's an `OfferSequence`, it deletes that order. Not finding it isn't an error.
2. If the order has expired it returns `tecEXPIRED` (the fee is still charged).
3. If any issuer has `TickSize`, it rounds the price to that many significant digits and adjusts `TakerGets` (or `TakerPays` with `tfSell`).
4. `OfferCreate::flowCross` calls the payment engine with your own account as both source and destination. It accounts for the `TransferRate` of the issuer of the asset you're delivering and limits spending to your actual balance. With `tfPassive` it raises the quality threshold to avoid crossing orders at the same price; with `tfSell` it allows receiving more than `TakerPays` if the market offers it. Empty or unfunded orders found along the way are removed from the book.
5. After crossing it recalculates the remainder of the order, keeping the original price. If you run out of funds while crossing, nothing is created.
6. `tfFillOrKill`: if anything remains, `tecKILLED` and the partial crosses are discarded. `tfImmediateOrCancel`: never creates an object; if nothing crossed, `tecKILLED`.
7. To leave the remainder in the book, your XRP balance before the fee must cover the reserve for one more object; if not, and nothing crossed, `tecINSUF_RESERVE_OFFER` (if something did cross, the cross is kept and the remainder simply isn't placed).
8. Inserts the [Offer](/objects/Offer) object into your owner directory and into the book's directory (`keylet::quality(book, rate)`), increments `OwnerCount`, and with `tfHybrid` also adds it to the open book (`applyHybrid`, `AdditionalBooks` field).

Relevant amendments: [PermissionedDEX](/amendments/PermissionedDEX) (domain-specific books and `tfHybrid`), [ImmediateOfferKilled](/amendments/ImmediateOfferKilled) (`tecKILLED` for IoC with no cross), [fixFillOrKill](/amendments/fixFillOrKill), [fixReducedOffersV1](/amendments/fixReducedOffersV1) and [fixReducedOffersV2](/amendments/fixReducedOffersV2) (rounding of reduced orders), [fixTakerDryOfferRemoval](/amendments/fixTakerDryOfferRemoval), [DeepFreeze](/amendments/DeepFreeze).

## Key fields

- **TakerGets** — what you deliver and what whoever crosses your order receives. In drops if XRP.
- **TakerPays** — what you ask for in return. `TakerPays / TakerGets` is the price.
- **Expiration** — seconds since the Ripple Epoch (from 2000-01-01). The expired order stays on the ledger until something touches it, but it no longer crosses.
- **OfferSequence** — the `Sequence` of one of your orders that you want to cancel in the same transaction.
- **DomainID** — permissioned domain; requires credentials accepted by that domain.

## Flags

- **tfPassive** — doesn't cross orders at the same price, only better ones; useful for market-making without consuming liquidity.
- **tfImmediateOrCancel** — executes what it can right now and leaves nothing in the book.
- **tfFillOrKill** — either executes entirely or fails with `tecKILLED`.
- **tfSell** — delivers all of `TakerGets` even if you get more than the requested `TakerPays`.
- **tfHybrid** — the order lives simultaneously in the domain's book and in the open book.

## Common errors

- **tecUNFUNDED_OFFER** — you have nothing of the `TakerGets` asset. Get a balance (or a trust line with a balance) first.
- **tecINSUF_RESERVE_OFFER** — you don't cover the reserve for one more object (1 XRP base + 0.2 XRP per object on testnet) and the order didn't cross anything.
- **tecKILLED** — `tfFillOrKill` couldn't be completed, or `tfImmediateOrCancel` found no counterparty.
- **tecNO_LINE / tecNO_AUTH** — the `TakerPays` issuer requires authorization and you don't have an authorized trust line.
- **tecNO_ISSUER** — the `TakerPays` issuer doesn't exist as an account.
- **tecEXPIRED** — `Expiration` had already passed when it was applied.
- **temBAD_OFFER** — zero or negative amounts, or XRP against XRP.
- **tecNO_PERMISSION** — nonexistent `DomainID` or your account isn't in the domain.

## Example

```json
{
  "TransactionType": "OfferCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "TakerGets": "1000000",
  "TakerPays": {
    "currency": "USD",
    "issuer": "rZZZZ_ISSUER",
    "value": "1"
  }
}
```

You're offering 1 XRP and asking for 1 USD issued by `rZZZZ_ISSUER`.

## Try it on testnet

1. First create a trust line to the issuer with [TrustSet](/tx/TrustSet) (if the issuer has `lsfRequireAuth`, they'll need to authorize you).
2. Fill in `TakerGets` in drops and `TakerPays` with the token. Submit the transaction.
3. Query `account_offers` with your account: you'll see the order with `seq`, `taker_gets`, `taker_pays`, and `quality`.
4. In `account_info` notice that `OwnerCount` has risen by 1.
5. From the other account (with a balance of the token) submit the reverse order: yours will cross and disappear from `account_offers`; in the transaction's metadata you'll see the `Offer` node deleted and the trust lines modified.
6. Try `Flags: 131072` (`tfImmediateOrCancel`) without a counterparty and observe `tecKILLED`.

## Related

- [OfferCancel](/tx/OfferCancel)
- [Payment](/tx/Payment) (cross-currency payments use the same books)
- [TrustSet](/tx/TrustSet)
- [Offer](/objects/Offer)
- [DirectoryNode](/objects/DirectoryNode)
- [PermissionedDEX](/amendments/PermissionedDEX)
- [ImmediateOfferKilled](/amendments/ImmediateOfferKilled)
