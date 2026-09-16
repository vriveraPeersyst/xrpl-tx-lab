---
title: PaymentChannelClaim
summary: Claims XRP from a payment channel by presenting a signed claim, or requests its closure (tfClose) or the removal of its expiration (tfRenew).
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelclaim
level: advanced
---

## What it does

`PaymentChannelClaim` is the transaction used to settle a [PayChannel](/objects/PayChannel). It has three uses that can be combined:

1. **Claim**: the recipient presents `Balance` (the total accumulated authorized amount) together with the `Signature` the owner generated off-ledger and the channel's `PublicKey`. The ledger pays the difference between that `Balance` and what's already been claimed. The owner can also send `Balance` without a signature to pay directly.
2. **Close** (`tfClose`): the recipient closes the channel instantly; the owner can only schedule the close for `SettleDelay` seconds later.
3. **Renew** (`tfRenew`): the owner removes any `Expiration` that had been set.

When the channel closes, the unclaimed XRP returns to the owner and the object is removed from both accounts' directories.

Any of these actions on an already-expired channel simply closes it without doing anything else.

## When to use it

- The recipient wants to settle what's accumulated in claims without waiting for the channel to close.
- The owner wants to pay directly through the channel without generating a signature.
- Either party wants to end the relationship: the recipient by closing on the spot, the owner by starting the countdown.

## How it works inside

**`PaymentChannelClaim::preflight`**:
- `Channel` set to zero → `temMALFORMED` (with `fixCleanup3_2_0`, active).
- `Balance` and `Amount`, if present, must be positive XRP amounts, with `Balance ≤ Amount`; otherwise `temBAD_AMOUNT`.
- `tfClose` and `tfRenew` together → `temMALFORMED`.
- If `Signature` is present, it requires `PublicKey` and `Balance`; it cryptographically verifies the signature over the message `serializePayChanAuthorization(channelID, Amount or Balance)`. A signature that doesn't validate returns `temBAD_SIGNATURE`. Note that the amount signed here is `Amount` (if you provide it) while what's claimed is `Balance`; that's why `Balance` can't exceed `Amount`.
- Validates the format of `CredentialIDs` if included.

**`PaymentChannelClaim::preclaim`**: with [Credentials](/amendments/Credentials) active, checks that the given credentials exist, are accepted, and belong to the signer (`credentials::valid`).

**`PaymentChannelClaim::doApply`**:
1. Looks up the channel; if it doesn't exist, `tecNO_TARGET`.
2. If it has expired via `CancelAfter` or `Expiration`, it closes it (`closeChannel`) and stops there.
3. If `Account` is neither the owner nor the recipient → `tecNO_PERMISSION`.
4. If `Balance` is present:
   - The recipient without `Signature` gets `tecNO_PERMISSION`.
   - The transaction's `PublicKey` must match the channel's; otherwise `tecNO_PERMISSION` (before `fixCleanup3_2_0` these were `temBAD_SIGNATURE`/`temBAD_SIGNER`).
   - `Balance` greater than the channel's funds → `tecUNFUNDED_PAYMENT`. `Balance` less than or equal to what's already claimed → also `tecUNFUNDED_PAYMENT`: a stale claim doesn't work.
   - The recipient must exist (`tecNO_DST`) and accept the deposit: `verifyDepositPreauth` applies [DepositAuth](/amendments/DepositAuth); if the recipient has `lsfDepositAuth`, the owner needs preauthorization or valid credentials, unless it's the recipient itself doing the claiming.
   - Updates the channel's `Balance` and pays the difference to the recipient.
5. `tfRenew`: owner only (`tecNO_PERMISSION` otherwise); clears `Expiration`.
6. `tfClose`: if sent by the recipient, or if the channel is drained (`Balance == Amount`), it closes immediately. If sent by the owner, it sets `Expiration = parent ledger close + SettleDelay` (unless one was already set earlier). The actual close happens on the next transaction that touches the channel after that date.

Amendments that affect this: [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) (`tec` codes instead of `tem` for signature failures in `doApply`), [Credentials](/amendments/Credentials), [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth).

## Key fields

- **Channel** — the channel's ID (64 hex characters).
- **Balance** — the total accumulated amount being claimed, not the increment. The ledger pays `Balance − previous_balance`. Must be greater than what's already claimed and not exceed the channel's `Amount`.
- **Amount** — the amount the signature covers. If omitted, the signature is verified against `Balance`. Lets you reuse a signature for X to claim less than X.
- **Signature** — the hex signature of the claim generated off-ledger (`channel_authorize` on your own node, or a client library). Not the transaction's own signature.
- **PublicKey** — must exactly match the channel's `PublicKey`.
- **CredentialIDs** — credentials to satisfy the recipient's `DepositAuth`.

## Flags

- **tfRenew** — removes `Expiration`. Owner only.
- **tfClose** — immediate close if requested by the recipient or if the channel is drained; deferred close (`SettleDelay` seconds) if requested by the owner.

## Common errors

- **tecNO_TARGET** — the `Channel` doesn't exist or has already closed.
- **tecNO_PERMISSION** — you're not party to the channel, `PublicKey` doesn't match, the recipient is claiming without `Signature`, or `tfRenew` was sent by the recipient.
- **tecUNFUNDED_PAYMENT** — `Balance` exceeds the channel's funds or isn't greater than what's already claimed.
- **temBAD_SIGNATURE** — the signature doesn't validate against `PublicKey` and the amount (`Amount` or `Balance`). Usually caused by an `Amount` different from the one signed.
- **temBAD_AMOUNT** — non-XRP amounts, zero, or `Balance > Amount`.
- **tecNO_DST** — the recipient deleted their account.

## Example

```json
{
  "TransactionType": "PaymentChannelClaim",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Channel": "C1AE6DDDEEC05CF2978C0BAD6FE302948E9533691DC749DCDD3B9E5992CA6198",
  "Balance": "1000000",
  "Amount": "1000000",
  "Signature": "",
  "PublicKey": "ED9434799226374926EDA3B54B1B461B4ABF7237962EAE18528FEA67595397FA32"
}
```

This is the form used by the recipient: fill `Signature` with the actual claim signature. If you're the **owner** paying directly, remove `Signature`, `PublicKey`, and `Amount`: a present `Signature` (even an empty one) is verified in `preflight` and, if it doesn't validate, the transaction is rejected with `temBAD_SIGNATURE`.

## Try it on testnet

1. Open a 5 XRP channel with [PaymentChannelCreate](/tx/PaymentChannelCreate) from your account and copy the `channel_id`.
2. **Direct payment by the owner**: submit `PaymentChannelClaim` with `Channel` and `Balance: "1000000"`, without `Signature` or `PublicKey`. In `account_channels` you'll see `balance: 1000000` and in the other account's `account_info` a +1 XRP.
3. Resubmit the same `Balance`: `tecUNFUNDED_PAYMENT`, because the claim doesn't increase what's already been claimed.
4. **Claim by the recipient**: generate the signature with `channel_authorize` (your own node) or a library, and submit from the other account `Balance`, `Amount`, `Signature`, and `PublicKey`. Verify first with `channel_verify`.
5. **Closing**: from the other account, submit `Flags: 131072` (`tfClose`) without `Balance`: the channel disappears from `account_channels` and your balance recovers the remaining 4 XRP. From your account, `tfClose` only adds an `expiration` to the channel.

## Related

- [PaymentChannelCreate](/tx/PaymentChannelCreate)
- [PaymentChannelFund](/tx/PaymentChannelFund)
- [PayChannel](/objects/PayChannel)
- [DepositPreauth](/tx/DepositPreauth)
- [DepositAuth](/amendments/DepositAuth)
- [Credentials](/amendments/Credentials)
