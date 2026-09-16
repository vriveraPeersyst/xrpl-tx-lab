---
title: DepositPreauth
summary: Authorizes (or revokes) a specific account, or anyone holding certain credentials, to send you funds when you have Deposit Authorization enabled.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/depositpreauth
xls: XLS-0070
amendment: DepositPreauth
level: intermediate
---

## What it does

When an account enables `asfDepositAuth` with [AccountSet](/tx/AccountSet), it stops accepting incoming payments from anyone. `DepositPreauth` is the allow-list: it creates a [DepositPreauth](/objects/DepositPreauth) object that says "this account can deposit to me" or, since [Credentials](/amendments/Credentials), "anyone holding this set of credentials can deposit to me."

It's like a bank account that rejects incoming transfers except from previously verified senders. The preauthorization is checked by [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim), [CheckCash](/tx/CheckCash), and other transactions that deliver funds.

Each object created counts as 1 unit of owner reserve for the authorizing account.

## When to use it

- Exchanges or custodians that only accept deposits from known accounts (compliance).
- Accounts with `DepositAuth` that need to receive from a specific partner.
- Accepting funds from any account holding a KYC credential from a trusted issuer, without listing accounts one by one.
- Revoking access when the relationship ends.

## How it works inside

**`DepositPreauth::preflight`** requires **exactly one** of these four fields: `Authorize`, `Unauthorize`, `AuthorizeCredentials`, or `UnauthorizeCredentials`; any other combination is `temMALFORMED`. If it's by account, the address can't be zero (`temINVALID_ACCOUNT_ID`) or your own (`temCANNOT_PREAUTH_SELF`). If it's by credentials, `credentials::checkArray` validates the array (non-empty, no duplicates, maximum size of 8 entries, `CredentialType` with a valid length). `checkExtraFeatures` blocks the credential fields if the Credentials amendment isn't active (it is active on testnet).

**`DepositPreauth::preclaim`**:

- `Authorize`: the account must exist (`tecNO_TARGET`), must not be a pseudo-account such as an AMM (`tecPSEUDO_ACCOUNT`, with [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)), and must not already be authorized (`tecDUPLICATE`).
- `Unauthorize`: the entry must exist (`tecNO_ENTRY`).
- `AuthorizeCredentials`: all credential issuers must exist (`tecNO_ISSUER`); the ordered set can't already be registered (`tecDUPLICATE`).
- `UnauthorizeCredentials`: the entry for that set must exist (`tecNO_ENTRY`).

**`DepositPreauth::doApply`**: when authorizing, it checks that you cover the reserve for one more object (`checkReserve`, which returns `tecINSUFFICIENT_RESERVE`), creates the `DepositPreauth` object with `Account` and `Authorize` (or with the `AuthorizeCredentials` array, ordered by issuer and type), inserts it into your owner directory, and increases your `OwnerCount`. When revoking, `DepositPreauth::removeFromLedger` removes the object from the directory, decreases the `OwnerCount`, and deletes it.

Important: the transaction does **not** require you to have `asfDepositAuth` enabled. You can prepare the allow-list before enabling the flag; it simply has no effect until then. It also doesn't require the authorized account to do anything.

## Key fields

- **Authorize** — account that will be able to deposit to you. One per transaction.
- **Unauthorize** — account whose preauthorization you're removing.
- **AuthorizeCredentials** — array of `{Credential: {Issuer, CredentialType}}` (1 to 8). A sender passes if they present, in `CredentialIDs`, accepted and non-expired credentials that cover the **entire** set.
- **UnauthorizeCredentials** — same array, to delete that entry. Must match the registered set exactly (order doesn't matter; the code sorts it).

## Common errors

- **tecDUPLICATE** — that account or credential set is already authorized.
- **tecNO_ENTRY** — you're trying to revoke something that doesn't exist.
- **tecNO_TARGET** — the account to authorize isn't in the ledger.
- **tecINSUFFICIENT_RESERVE** — you don't have XRP for one more object (0.2 XRP on testnet).
- **temCANNOT_PREAUTH_SELF** — you're authorizing yourself; not needed, since a payment to yourself always goes through.
- **temMALFORMED** — you set two fields at once, or none, or the credentials array is invalid.

## Example

```json
{
  "TransactionType": "DepositPreauth",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Authorize": "rYYYY_OTHER_ACCOUNT"
}
```

## Try it on testnet

1. Enable Deposit Authorization on your account: [AccountSet](/tx/AccountSet) with `SetFlag: 9`.
2. From the other account, send a [Payment](/tx/Payment) of 2 XRP to yours: it will fail with `tecNO_PERMISSION` (if your balance exceeds the base reserve).
3. Send the `DepositPreauth` example. Query `account_objects` with `type: "deposit_preauth"`: you'll see an object with `Authorize: rYYYY_OTHER_ACCOUNT`. In `account_info`, your `OwnerCount` increases by 1.
4. Repeat the 2 XRP payment from the other account: now `tesSUCCESS`.
5. Revoke with `{"TransactionType": "DepositPreauth", "Account": "...", "Unauthorize": "rYYYY_OTHER_ACCOUNT"}` and verify the object disappears.
6. Credentials variant: if an issuer has given you a credential (see [CredentialCreate](/tx/CredentialCreate)), authorize with `AuthorizeCredentials` and the sender will need to include `CredentialIDs` in their payment.

## Related

- [AccountSet](/tx/AccountSet) — `asfDepositAuth` (value 9).
- [Payment](/tx/Payment), [CheckCash](/tx/CheckCash), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim) — transactions that check the preauthorization.
- [CredentialCreate](/tx/CredentialCreate) / [CredentialAccept](/tx/CredentialAccept) — credentials used in `AuthorizeCredentials`.
- Objects: [DepositPreauth](/objects/DepositPreauth), [Credential](/objects/Credential).
- Amendments: [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth), [Credentials](/amendments/Credentials).
