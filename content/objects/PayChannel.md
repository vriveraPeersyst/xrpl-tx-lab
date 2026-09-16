---
title: PayChannel
summary: A unidirectional XRP payment channel: the sender deposits funds and authorizes incremental off-chain payments via signatures.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/paychannel
createdBy: PaymentChannelCreate
modifiedBy: PaymentChannelFund, PaymentChannelClaim
reserve: 1
---

## What it represents

A `PayChannel` enables repeated, low-value payments (micropayments, content streaming, usage-based billing) without publishing a transaction for each one. The sender locks XRP in `Amount` and signs off-chain "claims" for increasing amounts up to `Balance`; the recipient only needs to publish a transaction when they want to cash in the accumulated amount, presenting the most recent signature. The rest of the time, the channel generates no ledger traffic.

It's more flexible than an [Escrow](/objects/Escrow) for repeated payments because there's no need to create a new object for each payment: it's the same channel, only `Balance` gets updated.

## Lifecycle

- **Creation**: [PaymentChannelCreate](/tx/PaymentChannelCreate). The sender sets `Amount` (total funding), `SettleDelay` (grace period after requesting closure), and `PublicKey` (the key that will sign the claims). `Balance` starts at zero.
- **Top-up**: [PaymentChannelFund](/tx/PaymentChannelFund), by the sender, adds more XRP to `Amount` and optionally extends `Expiration`.
- **Claim**: [PaymentChannelClaim](/tx/PaymentChannelClaim), by the recipient, presenting `Balance` and `Signature` signed by `PublicKey`; they can only claim up to that accumulated figure, never more. It's also used for the sender to initiate closure (with `tfClose`) after `SettleDelay`, or to cancel it earlier if the recipient cooperates.
- **Closure**: when the sender requests closure and `SettleDelay` passes without the recipient claiming more, or when both parties agree to close it with `tfClose`, the object is deleted and the remainder of `Amount` returns to the sender.

## Key fields

- **Account / Destination** — who funds the channel and who can claim from it.
- **Amount** — total funds deposited; the recipient can never claim more than this.
- **Balance** — the amount already claimed so far; grows with each successful `PaymentChannelClaim`, never decreases.
- **PublicKey** — the key that must sign each off-chain claim; usually different from `Account`'s transaction-signing key.
- **SettleDelay** — seconds the sender must wait after requesting closure before being able to recover the remainder, giving the recipient time to present their latest claim.
- **Expiration / CancelAfter** — `Expiration` is mutable (can be extended with `PaymentChannelFund`); `CancelAfter` is a fixed limit set at creation that cannot be moved.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "payment_channel"` returns it for `Account`. With `ledger_entry`, `payment_channel` only accepts the object ID directly:

```json
{ "method": "ledger_entry", "params": [{ "payment_channel": "96F76F27D8A327FC48753167EC04A46AA0E382E6916C40D14A423D5E9366F02", "ledger_index": "validated" }] }
```

The ID is `SHA512Half(0x0078 || AccountID_sender || AccountID_destination || Sequence)` (`keylet::payChannel`, namespace `'x'`), and is found in the `PaymentChannelCreate`'s metadata. Typical response:

```json
{
  "index": "96F76F27D8A327FC48753167EC04A46AA0E382E6916C40D14A423D5E9366F02",
  "node": {
    "LedgerEntryType": "PayChannel",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Amount": "100000000",
    "Balance": "5000000",
    "PublicKey": "32D2471DB72B27E3310F355BB33E339BF26F8392DDDA1DF43C9F2A6D9C41E5C0D",
    "SettleDelay": 86400,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the sender while it exists.

## Related

- [PaymentChannelCreate](/tx/PaymentChannelCreate), [PaymentChannelFund](/tx/PaymentChannelFund), [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [Escrow](/objects/Escrow), [Check](/objects/Check)
