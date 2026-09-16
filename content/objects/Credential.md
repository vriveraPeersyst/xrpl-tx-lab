---
title: Credential
summary: A verifiable on-chain credential: an issuer asserts something about a subject, and the subject accepts it in order to use it.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/credential
createdBy: CredentialCreate
modifiedBy: CredentialAccept, CredentialDelete
reserve: 1
---

## What it represents

A `Credential` is a signed assertion in the ledger: the `Issuer` account declares that the `Subject` account satisfies something identified by `CredentialType` (for example, "KYC verified" or "EU resident"). The actual content of the verification is not stored on chain; the object only points to it via `URI` and records who is asserting it, about whom, and until when.

Its practical use lies in other objects: a [DepositPreauth](/objects/DepositPreauth) can authorize "whoever holds these credentials" instead of a specific account, and a [PermissionedDomain](/objects/PermissionedDomain) is defined by the list of credentials it accepts. A [Payment](/tx/Payment) to an account with `lsfDepositAuth` can carry `CredentialIDs` to prove it qualifies.

## Lifecycle

- **Creation**: [CredentialCreate](/tx/CredentialCreate) by the issuer. `preclaim` requires the subject to exist and that there isn't already a credential with the same triple (`Subject`, `Issuer`, `CredentialType`). `doApply` creates the object without the `lsfAccepted` flag, links it in the issuer's directory (`IssuerNode`) and in the subject's (`SubjectNode`), and charges the reserve to the issuer. If the issuer issues it to itself, it's born accepted.
- **Acceptance**: [CredentialAccept](/tx/CredentialAccept) by the subject. It sets `lsfAccepted` and transfers the reserve: `CredentialAccept::doApply` subtracts 1 from the issuer's `OwnerCount` and adds 1 to the subject's. If the credential has already expired, accepting it deletes it instead of activating it (`tecEXPIRED`).
- **Deletion**: [CredentialDelete](/tx/CredentialDelete). It can be deleted by the issuer or the subject at any time; anyone can delete it once `Expiration` has passed. [AccountDelete](/tx/AccountDelete) of either one also removes it.

An unaccepted credential is useless: `checkCredentials` in `CredentialHelpers.cpp` ignores those that don't have `lsfAccepted` or have expired.

## Key fields

- **Subject** — the account something is being asserted about.
- **Issuer** — the account issuing it. Whoever consumes it (a `DepositPreauth`, a domain) trusts this issuer, not the subject.
- **CredentialType** — a hex blob of 1 to 64 bytes chosen by the issuer. It's part of the key, so the same issuer can give several distinct credentials to the same person.
- **Expiration** — seconds since the Ripple Epoch. Once past, the credential no longer counts even though it remains in the ledger.
- **URI** — up to 256 hex bytes, normally pointing to the document backing the assertion.
- **IssuerNode / SubjectNode** — pages of the directories where it's linked.

## Flags

- **lsfAccepted** — the subject has accepted it with `CredentialAccept`. Without this flag, the credential is not considered valid in any check.

## How to query it

`account_objects` with `type: "credential"` lists it for both the issuer and the subject. With `ledger_entry`:

```json
{ "method": "ledger_entry", "params": [{ "credential": { "subject": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy", "issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "credential_type": "4B5943" }, "ledger_index": "validated" }] }
```

The key is `SHA512Half(0x0044 || Subject || Issuer || CredentialType)` (`keylet::credential`). Typical response:

```json
{
  "node": {
    "LedgerEntryType": "Credential",
    "Subject": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "CredentialType": "4B5943",
    "Expiration": 843000000,
    "URI": "68747470733A2F2F6578616D706C652E636F6D2F6B7963",
    "Flags": 65536,
    "IssuerNode": "0",
    "SubjectNode": "0",
    "PreviousTxnID": "1F2E3D4C5B6A79887766554433221100FFEEDDCCBBAA99887766554433221100",
    "PreviousTxnLgrSeq": 20800120
  }
}
```

## Reserve

1 unit of owner reserve. Paid by the issuer until the subject accepts it; from then on, paid by the subject.

## Related

- [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete)
- [DepositPreauth](/objects/DepositPreauth), [PermissionedDomain](/objects/PermissionedDomain), [DID](/objects/DID)
- [Credentials](/amendments/Credentials), [PermissionedDomains](/amendments/PermissionedDomains)
