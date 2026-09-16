---
title: CredentialAccept
summary: The subject of a credential accepts it, making it operational for preauthorizations and permissioned domains.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialaccept
amendment: Credentials
level: intermediate
---

## What it does

When an issuer creates a credential with [CredentialCreate](/tx/CredentialCreate), it remains pending: it exists on the ledger but doesn't count as valid for anything (it can't pass a [PermissionedDomain](/objects/PermissionedDomain) check nor be used for a credential-based deposit preauthorization). `CredentialAccept` is the step where the subject of the credential acknowledges and activates it, marking the [Credential](/objects/Credential) object with the `lsfAccepted` flag.

This two-step design prevents anyone from "tagging" you with claims you don't want associated with your account: no one can force you to accept a credential, and until you do, it has no effect anywhere else in the protocol.

## When to use it

- Confirming a KYC/AML credential a provider has issued you, before operating on a permissioned DEX.
- Activating an "accredited client" credential to be able to deposit into accounts with credential-based `DepositPreauth`.
- Any onboarding flow where a third party first certifies something about you and then you confirm it.

## How it works inside

**`CredentialAccept::preflight`** validates form: `Issuer` cannot be empty (`temINVALID_ACCOUNT_ID`) and `CredentialType` must be between 1 and 64 bytes (`temMALFORMED`). With [fixInvalidTxFlags](/amendments/fixInvalidTxFlags), any flag outside the universal ones is rejected.

**`CredentialAccept::preclaim`** checks against the ledger: the `Issuer` must exist as an account (`tecNO_ISSUER`), a credential must exist with that Subject (the sender)/Issuer/CredentialType triple (`tecNO_ENTRY` if not), and that credential must not already be accepted (`tecDUPLICATE`).

**`CredentialAccept::doApply`** locates the `Credential` object, checks the available owner reserve on the accepting account (the owner count may grow), and activates the `lsfAccepted` flag. If the credential has already expired according to `Expiration` relative to the previous ledger's close time, the transaction fails with `tecEXPIRED` instead of accepting a dead credential.

## Key fields

- **Issuer** — the account that created the credential. Together with your own account (as the implicit `Subject`) and `CredentialType`, it identifies the object to accept.
- **CredentialType** — must match exactly (same hex) the one used in the original `CredentialCreate`.

There are no other fields: `CredentialAccept` doesn't carry `URI` or `Expiration` — those are only set when creating the credential.

## Common errors

- **tecNO_ENTRY** — there's no pending credential with that `Issuer` and `CredentialType` for your account. Check that the `CredentialCreate` was sent correctly.
- **tecNO_ISSUER** — the account indicated in `Issuer` doesn't exist (or was never activated).
- **tecDUPLICATE** — the credential was already accepted; no need to repeat the operation.
- **tecEXPIRED** — the credential's `Expiration` has already passed; ask the issuer to create a new one.
- **temMALFORMED** — `CredentialType` is empty or too long.

## Example

```json
{
  "TransactionType": "CredentialAccept",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Issuer": "rYYYY_OTHER_ACCOUNT",
  "CredentialType": "4B5943"
}
```

Accepts, from your account, the "KYC" type credential that `rYYYY_OTHER_ACCOUNT` issued to you.

## Try it on testnet

1. From another account, first submit [CredentialCreate](/tx/CredentialCreate) toward your account as `Subject` (same `CredentialType`).
2. Sign and send the `CredentialAccept` above from your account.
3. Query `account_objects` with `type: "credential"` on your account or the issuer's: the object shows `Flags: 65536` (`lsfAccepted`).
4. Try sending the same `CredentialAccept` again: you'll get `tecDUPLICATE`.
5. Use that accepted credential as `AcceptedCredentials` when creating a [PermissionedDomainSet](/tx/PermissionedDomainSet) from the issuer's account.

## Related

- [CredentialCreate](/tx/CredentialCreate) — creates it, in pending state.
- [CredentialDelete](/tx/CredentialDelete) — revokes or removes it after expiration.
- [PermissionedDomainSet](/tx/PermissionedDomainSet) — consumes accepted credentials.
- [DepositPreauth](/tx/DepositPreauth) — preauthorizes deposits by credential.
- Objects: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
