---
title: PaymentChannelFund
summary: Adds XRP to an open payment channel and, optionally, sets or delays its expiration; only the channel's owner can send it.
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelfund
level: intermediate
---

## What it does

`PaymentChannelFund` tops up an existing [PayChannel](/objects/PayChannel): it adds `Amount` to the channel's locked funds (the object's `Amount` field) and subtracts that same amount from your balance. It also lets you set a mutable `Expiration`: a date after which the channel closes if anyone touches it, as long as it respects the agreed `SettleDelay`.

It's the "top up the deposit" operation for the channel. It doesn't create or delete objects, so it doesn't change your `OwnerCount`, but it does have an important side effect: if the channel has already expired (via `CancelAfter` or `Expiration`), the transaction **doesn't add any funds and closes it instead**, returning the unclaimed XRP to the owner.

## When to use it

- The recipient has consumed almost all the claimable balance and you want to keep paying through the same channel instead of opening a new one.
- You want to set a deadline on the channel (`Expiration`) without closing it immediately.
- Delaying an expiration you set earlier (only into the future).

## How it works inside

**`PaymentChannelFund::preflight`**:
- With `fixCleanup3_2_0` (active on testnet) a `Channel` set to zero is `temMALFORMED`.
- `Amount` must be positive XRP; otherwise `temBAD_AMOUNT`.

There's no dedicated `preclaim`: all checks against the ledger happen in `doApply`, so state-related errors are `tec` codes (you pay the fee).

**`PaymentChannelFund::doApply`**, in this order:
1. Looks up the channel by its ID (`Keylet(ltPAYCHAN, Channel)`). If it doesn't exist, `tecNO_ENTRY`.
2. If the channel has expired (`isChannelExpired`, via `CancelAfter` or `Expiration` relative to the parent ledger's close), it calls `closeChannel`: removes the object from both owner directories, returns `Amount − Balance` to the owner, lowers their `OwnerCount`, and deletes the channel. The transaction ends in `tesSUCCESS` **without having added any funds**.
3. If `Account` isn't the channel's owner, `tecNO_PERMISSION`. This check comes after the previous one: anyone can use a `PaymentChannelFund` to close an already-expired channel.
4. If you send `Expiration`, it calculates the minimum allowed: `parent ledger close + SettleDelay`, or the current expiration if that's earlier. A value below that minimum returns `tecNO_PERMISSION` (with `fixCleanup3_2_0`; previously it was `temBAD_EXPIRATION`). If it's valid, it's stored.
5. Checks the reserve and funds: `checkReserve` verifies that your balance covers the current reserve, and then `Balance ≥ reserve + Amount` is required, otherwise `tecUNFUNDED`. There's no increase to `OwnerCount` because no object is created.
6. The channel's recipient must still exist (`tecNO_DST`): you can't top up a channel whose recipient deleted their account.
7. Adds `Amount` to the channel and subtracts it from your `Balance`.

The transactor has no flags. The expiration comparison uses [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) to handle the exact instant consistently with other objects that expire.

## Key fields

- **Channel** — the channel's ID: 64 hex characters. You get it from `account_channels` (`channel_id`) or `account_objects` (`index`).
- **Amount** — drops of XRP added to the channel's total. Can't be 0.
- **Expiration** — Ripple Epoch seconds (since 2000-01-01). Must be at least `now + SettleDelay` and can't move an already-set expiration earlier. It's different from `CancelAfter`, which is immutable from creation. To remove an existing `Expiration` use [PaymentChannelClaim](/tx/PaymentChannelClaim) with `tfRenew`.

## Common errors

- **tecNO_ENTRY** — the `Channel` doesn't exist (ID copied wrong, or channel already closed).
- **tecNO_PERMISSION** — you're not the channel's owner, or `Expiration` is earlier than `now + SettleDelay`.
- **tecUNFUNDED** — you don't have `Amount` to spare above your reserve.
- **tecNO_DST** — the channel's recipient account no longer exists.
- **temBAD_AMOUNT** — `Amount` isn't XRP or is zero.
- **temMALFORMED** — `Channel` is all zeros.
- **tesSUCCESS but the channel disappears** — the channel had expired; the transaction closed it and returned the remainder to you. Check `CancelAfter`/`Expiration` before topping up.

## Example

```json
{
  "TransactionType": "PaymentChannelFund",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Channel": "C1AE6DDDEEC05CF2978C0BAD6FE302948E9533691DC749DCDD3B9E5992CA6198",
  "Amount": "1000000"
}
```

Adds 1 XRP to the given channel.

## Try it on testnet

1. Open a channel with [PaymentChannelCreate](/tx/PaymentChannelCreate) and copy its `channel_id` from `account_channels`.
2. Paste the ID into `Channel`, set `Amount: "1000000"`, and submit from the **same** account that created the channel.
3. Query `account_channels`: `amount` will have gone from 5000000 to 6000000 while `balance` stays the same.
4. Repeat the transaction from the other account (the recipient) and observe `tecNO_PERMISSION`.
5. Try setting `Expiration` to a value less than now + `SettleDelay`: `tecNO_PERMISSION`. With a valid value, the `expiration` field appears in `account_channels`.
6. If you want to see the automatic close, create a channel with `CancelAfter` a few minutes out, wait, and submit a `PaymentChannelFund`: the channel disappears and your balance recovers the funds.

## Related

- [PaymentChannelCreate](/tx/PaymentChannelCreate)
- [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [PayChannel](/objects/PayChannel)
- [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
