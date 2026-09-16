---
title: MPTokenAuthorize
summary: Creates or removes your MPToken (the object that enables you as a holder) and, if the issuer requires it, authorizes it.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenauthorize
amendment: MPTokensV1
level: intermediate
---

## What it does

For a Multi-Purpose Token (MPT), receiving a payment isn't enough on its own: each holder first needs an [MPToken](/objects/MPToken) object that links them to the specific issuance ([MPTokenIssuance](/objects/MPTokenIssuance)) — something similar to what `TrustSet` does with IOU trust lines, but per-issuance and without configurable limits. `MPTokenAuthorize` is the transaction that manages that link, and it plays two distinct roles depending on who sends it and with which flag.

If the holder themselves sends it without `Holder`: it creates their `MPToken` (so they can receive the token) or, with the `tfMPTUnauthorize` flag, deletes it (so they stop holding it). If the issuer sends it with `Holder`: it authorizes or deauthorizes that specific holder, but this only has effect on issuances created with `lsfMPTRequireAuth` — an explicit allowlist, just like `RequireAuth` on trust lines.

## When to use it

- Before being able to receive an MPT for the first time, create your `MPToken` with this transaction (analogous to creating a trust line for an IOU).
- The issuer of an MPT with `lsfMPTRequireAuth` authorizes a specific holder after verifying them.
- A holder with a zero balance who no longer wants to hold the token deletes their `MPToken` to recover the reserve.
- The issuer revokes a holder's authorization (`tfMPTUnauthorize` from the issuing account) without needing a clawback.

## How it works inside

**`MPTokenAuthorize::preflight`** only rejects the trivial case where `Account` and `Holder` are the same account (`temMALFORMED`): it doesn't make sense for the issuer to "authorize" themselves with this field.

**`MPTokenAuthorize::preclaim`** branches depending on whether `Holder` is present. Without `Holder` (sent by the holder about themselves): with `tfMPTUnauthorize`, it requires that the `MPToken` exist (`tecOBJECT_NOT_FOUND`), that its public and locked balances be zero (`tecHAS_OBLIGATIONS` if not), and, if it's locked by the issuer, it doesn't allow deleting it (`tecNO_PERMISSION`); without that flag, it requires that the issuance exist (`tecOBJECT_NOT_FOUND`), that you not be the issuer (`tecNO_PERMISSION`), and that you not already have an `MPToken` for it (`tecDUPLICATE`). With `Holder` (sent by the issuer): the specified account must exist (`tecNO_DST`), the issuance must exist and have `lsfMPTRequireAuth` (`tecNO_AUTH` if it doesn't require it), and the holder must have already created their `MPToken` before the issuer can authorize it (`tecOBJECT_NOT_FOUND` if not).

**`MPTokenAuthorize::doApply`** creates, deletes, or changes the `lsfMPTAuthorized` flag of the `MPToken` following the path above, adjusting the corresponding owner reserve.

## Key fields

- **MPTokenIssuanceID** — the identifier of the issuance you're operating on.
- **Holder** — only used by the issuer, to authorize or deauthorize a specific holder. A holder managing their own `MPToken` omits it.

## Flags

- **tfMPTUnauthorize** — reverses the direction of the operation: the holder deletes their `MPToken` (without `Holder`) or the issuer withdraws authorization from a holder (with `Holder`).

## Common errors

- **tecOBJECT_NOT_FOUND** — you're trying to operate on an issuance or an `MPToken` that doesn't exist.
- **tecDUPLICATE** — you already have an `MPToken` for that issuance; no need to create it again.
- **tecHAS_OBLIGATIONS** — you're trying to delete your `MPToken` while it has a nonzero balance (public or locked). Transfer or burn the balance first.
- **tecNO_AUTH** — the issuer is trying to authorize a holder on an issuance that doesn't have `lsfMPTRequireAuth`; authorization isn't needed.
- **tecNO_PERMISSION** — the issuer is trying to create an `MPToken` for themselves, or the `MPToken` is locked and can't be deleted.
- **tecNO_DST** — the `Holder` specified by the issuer doesn't exist as an account.

## Example

```json
{
  "TransactionType": "MPTokenAuthorize",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

Creates your `MPToken` for the specified issuance, enabling you to receive that MPT.

## Try it on testnet

1. You need an existing issuance: create one first with `MPTokenIssuanceCreate` from another account.
2. Sign and send the example with the real `MPTokenIssuanceID` of that issuance.
3. Query `account_objects` with `type: "mptoken"`: you'll see your `MPToken` object with a zero balance.
4. Ask the issuing account to send you a `Payment` with `Amount: { mpt_issuance_id, value }`: your balance will rise.
5. With the balance back at zero, send `MPTokenAuthorize` with `Flags: 1` (`tfMPTUnauthorize`) to delete your `MPToken` and recover the reserve.

## Related

- [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) — locks or unlocks holders or the entire issuance.
- [Payment](/tx/Payment) — moves MPT balance between already-created `MPToken` objects.
- Objects: [MPToken](/objects/MPToken), [MPTokenIssuance](/objects/MPTokenIssuance).
- Amendments: [MPTokensV1](/amendments/MPTokensV1).
