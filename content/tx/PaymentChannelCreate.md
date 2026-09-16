---
title: PaymentChannelCreate
summary: Opens a one-way XRP payment channel: locks up funds that the recipient will be able to claim with signatures issued outside the ledger.
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate
level: intermediate
---

## What it does

`PaymentChannelCreate` sets aside an amount of XRP from your account and stores it in a new [PayChannel](/objects/PayChannel) object on the ledger, under a `Destination`. From there you can sign **claims** off-ledger (messages authorizing the recipient to claim up to a certain accumulated balance) with the key given in `PublicKey`. The recipient presents the highest claim they have with [PaymentChannelClaim](/tx/PaymentChannelClaim) whenever they want to settle. Only the owner can add funds ([PaymentChannelFund](/tx/PaymentChannelFund)); only XRP moves, and only in one direction.

The analogy is a bar tab: you leave a deposit at the bar, sign tickets saying "I owe up to X in total," and the bartender cashes the last ticket at closing time. If you want to leave earlier, you have to give `SettleDelay` seconds of notice so the bartender can collect what's pending.

The object consumes one unit of owner reserve (0.2 XRP on testnet) and is linked into both accounts' owner directories.

## When to use it

- Frequent micropayments to the same recipient (streaming, pay-per-use API) without paying a fee or waiting on a ledger for each one.
- Intermittent settlement between two parties exchanging many signed messages.
- Bidirectional channels: one in each direction.

## How it works inside

**`PaymentChannelCreate::preflight`**:
- `Amount` must be XRP and greater than zero; otherwise `temBAD_AMOUNT`.
- `Account` and `Destination` can't match: `temDST_IS_SRC`.
- `PublicKey` must be a valid public key (secp256k1 or ed25519): otherwise `temMALFORMED`.

**`PaymentChannelCreate::preclaim`**:
- Checks your reserve and balance: with [Sponsor](/amendments/Sponsor) inactive (as on testnet), `Balance < reserve(OwnerCount + 1)` → `tecINSUFFICIENT_RESERVE`, and `Balance < reserve + Amount` → `tecUNFUNDED`. That is, on top of what you lock up you must also keep the full reserve.
- The destination must exist (`tecNO_DST`), must not have `lsfDisallowIncomingPayChan` (`tecNO_PERMISSION`), and if it has `lsfRequireDestTag` you need `DestinationTag` (`tecDST_TAG_NEEDED`). Pseudo-accounts (AMM, vaults) can't receive channels: `tecNO_PERMISSION`.

**`PaymentChannelCreate::doApply`**:
- With [fixPayChanCancelAfter](/amendments/fixPayChanCancelAfter) (active), if `CancelAfter` is earlier than the parent ledger's close, the transaction fails with `tecEXPIRED` instead of creating an already-dead channel.
- Creates the object with key `keylet::payChannel(Account, Destination, Sequence)`. Stores `Amount` (total funds), `Balance` at 0 (what's already paid), `SettleDelay`, `PublicKey`, `CancelAfter`, `SourceTag`, `DestinationTag`, and, thanks to `fixIncludeKeyletFields`, the `Sequence`.
- Inserts the object into your owner directory (`OwnerNode`) and, per [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir), also into the recipient's (`DestinationNode`), so the recipient also can't delete their account while the channel exists.
- Subtracts `Amount` from your balance and increases your `OwnerCount`.

There are no transaction-specific flags. `Expiration` isn't set at creation: it appears later when the owner requests to close the channel.

## Key fields

- **Amount** — XRP in drops locked into the channel. You can add more later with `PaymentChannelFund`.
- **SettleDelay** — seconds the channel stays open after the owner requests closure. Gives the recipient a window to present the final claim. A comfortable value for testing is 60-3600; the example uses 86400 (one day).
- **PublicKey** — public key (hex, 33 bytes) you'll use to sign the claims. It doesn't have to be the account's own key, but in practice the builder uses the connected account's key. It's immutable: changing it requires opening a different channel.
- **CancelAfter** — immutable expiration in Ripple Epoch seconds (since 2000-01-01). Past that date, any transaction touching the channel closes it.
- **DestinationTag** — required if the destination has `lsfRequireDestTag`.

## Common errors

- **tecUNFUNDED** — insufficient balance to lock up `Amount` while still covering the reserve. Reduce `Amount`.
- **tecINSUFFICIENT_RESERVE** — you don't cover the reserve with one more object (1 XRP + 0.2 XRP per object on testnet).
- **tecNO_DST** — the destination isn't funded.
- **tecNO_PERMISSION** — the destination enabled `asfDisallowIncomingPayChan` or is a pseudo-account.
- **tecDST_TAG_NEEDED** — the destination requires `DestinationTag`.
- **tecEXPIRED** — `CancelAfter` is already in the past.
- **temMALFORMED** — `PublicKey` isn't a valid key (check that it's 66 hex characters).
- **temDST_IS_SRC** — you've set your own account as the destination.

## Example

```json
{
  "TransactionType": "PaymentChannelCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "Amount": "5000000",
  "SettleDelay": 86400,
  "PublicKey": "ED9434799226374926EDA3B54B1B461B4ABF7237962EAE18528FEA67595397FA32"
}
```

Locks up 5 XRP for `rYYYY_OTHER_ACCOUNT` with a one-day close notice period.

## Try it on testnet

1. Make sure you have at least `Amount` + reserve (for example, 10 XRP to lock up 5).
2. Fill `Destination` with the second account and let the builder put your public key in `PublicKey`. Submit.
3. Query `account_channels` with your account: you'll see `channel_id`, `amount` (5000000), `balance` (0), `settle_delay`, and `public_key`.
4. In `account_info` check that `Balance` dropped by 5 XRP plus the fee and that `OwnerCount` went up by 1. Also check `account_objects` on the other account with `type: payment_channel`: the channel shows up there too.
5. Save `channel_id`: you'll need it for [PaymentChannelFund](/tx/PaymentChannelFund) and [PaymentChannelClaim](/tx/PaymentChannelClaim).
6. To sign claims without writing code, use the `channel_authorize` RPC method on your own node (public nodes disable it) or a client library; then verify with `channel_verify`.

## Related

- [PaymentChannelFund](/tx/PaymentChannelFund)
- [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [PayChannel](/objects/PayChannel)
- [AccountSet](/tx/AccountSet) (`asfDisallowIncomingPayChan`, `asfRequireDest`)
- [fixPayChanCancelAfter](/amendments/fixPayChanCancelAfter)
- [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir)
