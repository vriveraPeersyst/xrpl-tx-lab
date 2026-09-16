---
title: CredentialCreate
summary: An issuer creates a verifiable credential about another account (for example, KYC passed).
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate
amendment: Credentials
level: intermediate
---

## What it does

`CredentialCreate` is the first piece of the XRPL's on-chain identity system: it allows one account (the issuer) to assert something about another account (the subject), for example "this account has passed my KYC process." The result is a [Credential](/objects/Credential) object on the ledger, identified by the `Issuer` + `Subject` + `CredentialType` triple.

The credential isn't immediately valid: it's created in a pending state, and the subject has to explicitly accept it with [CredentialAccept](/tx/CredentialAccept). This prevents someone from "tagging" you with a credential you don't recognize. You can attach a `URI` pointing to off-chain evidence (a certificate, a signed document) and an `Expiration` after which it's no longer valid.

## When to use it

- A KYC provider certifies that an account has passed its verification.
- An exchange or custodian issues an "accredited client" credential to grant access to a [PermissionedDomain](/objects/PermissionedDomain).
- Setting up a credential-based deposit preauthorization instead of one per individual account (see [DepositPreauth](/tx/DepositPreauth)).
- Issuing expirable credentials (for example, valid for 30 days) for verification processes that renew periodically.

## How it works inside

**`CredentialCreate::preflight`** only validates form: `Subject` must be present (`temMALFORMED` if missing), `CredentialType` must be between 1 and 64 bytes, and if you include `URI` it cannot be empty or exceed the maximum allowed length. With [fixInvalidTxFlags](/amendments/fixInvalidTxFlags) active, any non-universal flag is rejected.

**`CredentialCreate::preclaim`** looks at the ledger: the `Subject` must exist (`tecNO_TARGET` if not), a credential with the same Issuer/Subject/CredentialType triple must not already exist (`tecDUPLICATE`), and —with [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)— the subject cannot be a pseudo-account such as an AMM or a Vault (`tecPSEUDO_ACCOUNT`).

**`CredentialCreate::doApply`** creates the `Credential` object with `Issuer` = the sender of the transaction and `Subject` = the indicated account, adds it to the issuer's directory, and, if the issuer and the subject are the same account, marks it as accepted automatically (`lsfAccepted`) without needing a subsequent `CredentialAccept`. It consumes owner reserve and can fail with `tecDIR_FULL` if the issuer's directory is full, or with `tecEXPIRED` if the indicated `Expiration` has already passed relative to the ledger that creates it.

## Key fields

- **Subject** — the account something is being asserted about. The credential lives in that account's namespace.
- **CredentialType** — 1 to 64 bytes of hex identifying the credential type (e.g., `4B5943` = "KYC"). Together with `Issuer` and `Subject`, it forms the credential's unique key.
- **Expiration** — timestamp in Ripple Epoch seconds (2000-01-01). Past that point, the credential is considered expired even though it remains on the ledger until someone deletes it.
- **URI** — optional hex (max 256 bytes) with a link or hash pointing to off-chain evidence. The ledger doesn't interpret it.

## Common errors

- **tecNO_TARGET** — the indicated `Subject` doesn't exist as an activated account.
- **tecDUPLICATE** — a credential with that same Issuer, Subject, and CredentialType already exists.
- **tecPSEUDO_ACCOUNT** — the `Subject` is a pseudo-account (AMM, Vault, LoanBroker), which cannot receive credentials.
- **temMALFORMED** — `Subject` is missing, or `CredentialType`/`URI` have an invalid length.
- **tecDIR_FULL** — the issuer's owner directory is at its limit.
- **tecINSUFFICIENT_RESERVE** — you don't have XRP above the reserve to create the object.

## Example

```json
{
  "TransactionType": "CredentialCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Subject": "rYYYY_OTHER_ACCOUNT",
  "CredentialType": "4B5943",
  "Expiration": "{{time+2592000}}",
  "URI": "68747470733A2F2F6578616D706C652E636F6D"
}
```

Issues a "KYC" type credential about the other account, valid for 30 days.

## Try it on testnet

1. Sign the transaction above from the account acting as issuer; the `Subject` is the other account in your test pair.
2. Check with `account_objects` (type `credential`) on the issuing account: you'll see the `Credential` object without the `lsfAccepted` flag.
3. From the `Subject` account, send [CredentialAccept](/tx/CredentialAccept) with the same `Issuer` and `CredentialType`.
4. Repeat `account_objects`: now the object has `lsfAccepted` set.
5. Try repeating the same `CredentialCreate`: you'll get `tecDUPLICATE`.

## Related

- [CredentialAccept](/tx/CredentialAccept) — the subject confirms the credential.
- [CredentialDelete](/tx/CredentialDelete) — revokes it, or the subject gives it up.
- [DepositPreauth](/tx/DepositPreauth) — uses credentials to preauthorize deposits.
- [PermissionedDomainSet](/tx/PermissionedDomainSet) — requires specific credentials to enter a domain.
- Objects: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
