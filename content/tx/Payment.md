---
title: Payment
summary: Sends XRP, issued tokens (IOU), or MPT to another account, with path routing and currency conversion.
category: pagos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/payment
level: basic
---

## What it does

`Payment` is the most-used transaction on the XRPL: it moves value from one account to another. It can send XRP directly, tokens issued by a third party via trust lines, or Multi-Purpose Tokens (MPT). If the destination doesn't exist and you send enough XRP, the transaction itself creates the account.

Think of it as a bank transfer with a built-in exchange engine: you can specify what you want to arrive (`Amount`) and, optionally, what you're willing to pay for it (`SendMax`). The payment engine (`RippleCalc`) searches for routes through the DEX and trust lines to fulfill the order.

Objects it touches: modifies the source's and destination's [AccountRoot](/objects/AccountRoot) (or creates it), adjusts [RippleState](/objects/RippleState) when tokens circulate, may consume [Offer](/objects/Offer) entries from the order book, and, with MPT, modifies [MPToken](/objects/MPToken).

## When to use it

- Sending XRP to another person or an exchange (with `DestinationTag`).
- Activating a new account by sending it at least the base reserve (1 XRP on testnet today).
- Paying with an IOU token (for example, USD issued by a gateway) to someone who has a trust line with that issuer.
- Converting currencies on the fly: paying in USD while spending XRP, letting the DEX do the conversion.
- Partial payments and limited-quality payments for liquidity integrations.

## How it works inside

**`Payment::preflight`** validates the structure without touching the ledger. It rejects amounts ≤ 0 (`temBAD_AMOUNT`), a missing destination (`temDST_NEEDED`), and a payment to yourself in the same currency without `Paths` (`temREDUNDANT`). For an XRP → XRP payment ("xrpDirect") nothing about the routing engine makes sense, so it returns specific errors if you add `SendMax` (`temBAD_SEND_XRP_MAX`), `Paths` (`temBAD_SEND_XRP_PATHS`), `tfPartialPayment` (`temBAD_SEND_XRP_PARTIAL`), `tfLimitQuality` (`temBAD_SEND_XRP_LIMIT`), or `tfNoRippleDirect` (`temBAD_SEND_XRP_NO_DIRECT`). `DeliverMin` requires `tfPartialPayment`, must be the same currency as `Amount`, and can't exceed it. With [MPTokensV1](/amendments/MPTokensV1) active (and without MPTokensV2, which isn't on testnet) an MPT payment doesn't support `Paths` or conversions: `Amount` and `SendMax` must be the same asset. The `tfSponsorCreatedAccount` flag requires [Sponsor](/amendments/Sponsor), which isn't active on testnet: today it returns `temDISABLED`.

**`Payment::preclaim`** looks at the ledger. If the destination doesn't exist: it can only be created with XRP (`tecNO_DST` for a token), never with a partial payment (`telNO_DST_PARTIAL`), and the amount must be ≥ the base reserve (`tecNO_DST_INSUF_XRP`). If it exists and has `lsfRequireDestTag`, a missing `DestinationTag` gives `tecDST_TAG_NEEDED`. It limits the number and length of paths (`telBAD_PATH_COUNT`). With `DomainID` ([PermissionedDEX](/amendments/PermissionedDEX)), source and destination must both belong to the permissioned domain, otherwise `tecNO_PERMISSION`. `CredentialIDs` are validated with `credentials::valid` (may return `tecEXPIRED`).

**`Payment::doApply`** creates the destination's `AccountRoot` if it didn't exist (with `Sequence` = current ledger number) and then takes one of three paths:

1. *Payment with routes* (there are `Paths`, `SendMax`, or `Amount` isn't XRP): checks deposit preauthorization (`verifyDepositPreauth`) and runs `RippleCalc`. If it delivers less than `Amount` and falls below `DeliverMin`, `tecPATH_PARTIAL`; if the engine returns a retriable `ter`, it converts it to `tecPATH_DRY` to charge the fee.
2. *Direct MPT payment*: requires authorization on both sides (`requireAuth`), that the issuance allows transfers (`canTransfer`), that neither side is locked (`tecLOCKED`), and applies the issuance's `TransferFee` when the payment is between holders.
3. *Direct XRP*: requires that the balance before the fee is charged covers `Amount` + reserve (`tecUNFUNDED_PAYMENT`). If the destination has `lsfDepositAuth`, it only passes if the sender is preauthorized, or if both the amount and the destination's balance are ≤ the base reserve (anti-lockout rule). Pseudo-accounts (AMM, Vault) can't receive direct XRP: `tecNO_PERMISSION`.

## Key fields

- **Amount** — what must arrive at the destination. A string in drops for XRP; an object `{currency, issuer, value}` for IOU; `{mpt_issuance_id, value}` for MPT.
- **SendMax** — the maximum you accept to spend, in the source currency. In practice required for payments with conversion; prohibited in XRP → XRP.
- **DeliverMin** — the minimum acceptable in a partial payment. Without it, a `tfPartialPayment` can deliver any amount > 0.
- **Paths** — explicit routes. If you omit them, the engine uses the direct route and the default ones (unless `tfNoRippleDirect`).
- **DestinationTag** — an integer identifying the final beneficiary in shared accounts (exchanges). The ledger doesn't interpret it.
- **InvoiceID** — a free 256-bit hash for correlating with your own system.
- **DomainID** — restricts the payment to the given permissioned domain.

## Flags

- **tfNoRippleDirect** — don't use the default route; only the given `Paths`.
- **tfPartialPayment** — allows delivering less than `Amount` (down to `DeliverMin`) instead of failing. Watch out when integrating: check `delivered_amount` in the metadata, not `Amount`.
- **tfLimitQuality** — discards routes whose input/output ratio is worse than `Amount / SendMax`.
- **tfSponsorCreatedAccount** — sponsored account creation; requires the Sponsor amendment, not active on testnet.

## Common errors

- **tecNO_DST_INSUF_XRP** — the destination doesn't exist and you're sending less than the base reserve. Send ≥ 1 XRP.
- **tecNO_DST** — you're trying to send a token to an account that doesn't exist. Activate it with XRP first.
- **tecDST_TAG_NEEDED** — the destination requires `DestinationTag`.
- **tecUNFUNDED_PAYMENT** — you don't have enough XRP above the reserve to cover `Amount`.
- **tecPATH_DRY** — there's no liquidity or trust lines connecting source and destination (for example, the destination has no trust line to the issuer).
- **tecPATH_PARTIAL** — the route exists but doesn't cover `Amount` (or `DeliverMin`) within `SendMax`.
- **tecNO_PERMISSION** — the destination has `DepositAuth` and you're not preauthorized, or you don't belong to the `DomainID`.
- **temREDUNDANT** — you're paying yourself in the same currency without `Paths`.

## Example

```json
{
  "TransactionType": "Payment",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "Amount": "1000000",
  "DestinationTag": 12345
}
```

Sends 1 XRP (1,000,000 drops) with tag 12345.

## Try it on testnet

1. Connect your account in the builder and leave the example as-is; the builder fills in `Fee`, `Sequence`, and `LastLedgerSequence`.
2. Sign and submit. Wait for the `tesSUCCESS` result and the validated ledger.
3. Query `account_info` for the destination account: its `Balance` will have gone up by 1,000,000 drops.
4. Repeat toward a new (unactivated) address with `Amount: "500000"`: you'll see `tecNO_DST_INSUF_XRP`. Raise it to `"1000000"` and you'll confirm the account is created.
5. For a token payment, first create a trust line with [TrustSet](/tx/TrustSet) from the destination to the issuer and use `Amount: {currency, issuer, value}`; in the metadata you'll see the `RippleState` object modified.

## Related

- [TrustSet](/tx/TrustSet) — needed to receive tokens.
- [DepositPreauth](/tx/DepositPreauth) and [AccountSet](/tx/AccountSet) (`asfDepositAuth`, `asfRequireDest`).
- [OfferCreate](/tx/OfferCreate) — the DEX liquidity used by payments with conversion.
- [CheckCreate](/tx/CheckCreate) — a deferred payment collected by the recipient.
- Objects: [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [MPToken](/objects/MPToken).
- Amendments: [MPTokensV1](/amendments/MPTokensV1), [Credentials](/amendments/Credentials), [PermissionedDEX](/amendments/PermissionedDEX), [DepositAuth](/amendments/DepositAuth).
