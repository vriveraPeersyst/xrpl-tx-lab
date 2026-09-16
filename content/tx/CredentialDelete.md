---
title: CredentialDelete
summary: Deletes a credential: the issuer revokes it, the subject gives it up, or anyone cleans up one that has already expired.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialdelete
amendment: Credentials
level: intermediate
---

## What it does

`CredentialDelete` removes a [Credential](/objects/Credential) object from the ledger and frees up the associated owner reserve. Unlike creating or accepting, here what matters isn't so much who you are relative to the credential but which role you play: you can delete a credential where you appear as `Issuer` or as `Subject` without restrictions, but you can only delete a third party's credential (neither issuer nor subject) if it has already expired.

The transaction is flexible with its fields: if you omit `Subject` or `Issuer`, the transactor assumes that field is you. So the account that was the subject can delete "its" credential by passing only the `Issuer`, and the issuer can revoke it by passing only the `Subject`.

## When to use it

- The issuer revokes a credential because the client no longer meets the criteria (e.g., lost their accreditation).
- The subject gives up a credential they no longer need, freeing up their reserve.
- Any account cleans up an expired credential a third party left abandoned on the ledger, to recover its own reserve if applicable or simply to sanitize the state.
- Before deleting an account with [AccountDelete](/tx/AccountDelete): associated credentials block the deletion if not cleaned up first.

## How it works inside

**`CredentialDelete::preflight`** requires at least one of `Subject` or `Issuer` to be present (`temMALFORMED` if neither is); if either is present it cannot be the zero account (`temINVALID_ACCOUNT_ID`). `CredentialType` must be between 1 and 64 bytes.

**`CredentialDelete::preclaim`** resolves `Subject` and `Issuer`: if missing, it takes the value of `Account` (the sender of the transaction). It checks that a credential with that exact triple exists; if not, `tecNO_ENTRY`.

**`CredentialDelete::doApply`** is where the permission rule is applied: if neither the credential's `Subject` nor its `Issuer` matches the sender of the transaction, deletion is only allowed if it has already expired (checked against the previous ledger's `parentCloseTime`); if it hasn't expired, `tecNO_PERMISSION`. If you're the issuer or the subject, you can delete it at any time, whether or not it's accepted or expired. On deletion, the object is released from the owner directory and the owner count of the account that owned it is adjusted (the issuer, except in self-acceptance).

## Key fields

- **Subject** — optional; if omitted, your own account is assumed. Provide it when the issuer deletes a specific subject's credential.
- **Issuer** — optional; if omitted, your own account is assumed. Provide it when the subject deletes a credential someone else issued to them.
- **CredentialType** — must match exactly the one used when creating it.

In practice you only omit one of the two fields: it makes no sense to omit both (fails in `preflight`) nor to include both if you're also one of them (although valid, it's redundant).

## Common errors

- **tecNO_ENTRY** — no credential exists with that Subject/Issuer/CredentialType triple.
- **tecNO_PERMISSION** — you're trying to delete a third party's credential that hasn't expired yet.
- **temMALFORMED** — you didn't indicate `Subject` or `Issuer`, or `CredentialType` has an invalid length.
- **temINVALID_ACCOUNT_ID** — `Subject` or `Issuer` points to the zero account.

## Example

```json
{
  "TransactionType": "CredentialDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Subject": "rYYYY_OTHER_ACCOUNT",
  "CredentialType": "4B5943"
}
```

As issuer (`rXXXX_YOUR_ACCOUNT`), revokes the "KYC" credential you issued about `rYYYY_OTHER_ACCOUNT`.

## Try it on testnet

1. Create and accept a credential between two test accounts (see [CredentialCreate](/tx/CredentialCreate) and [CredentialAccept](/tx/CredentialAccept)).
2. As issuer, send the `CredentialDelete` from the example indicating the `Subject`.
3. Query `account_objects` with `type: "credential"` on both accounts: the object no longer appears.
4. Repeat the flow but this time try deleting it from a third account that's neither issuer nor subject: you'll see `tecNO_PERMISSION` as long as it hasn't expired.
5. Create a credential with `Expiration` set in the near past and, after that moment has passed, delete it from the third account: now it will succeed.

## Related

- [CredentialCreate](/tx/CredentialCreate) — creates it.
- [CredentialAccept](/tx/CredentialAccept) — activates it.
- [AccountDelete](/tx/AccountDelete) — requires cleaning up credentials before deleting the account.
- Objects: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
