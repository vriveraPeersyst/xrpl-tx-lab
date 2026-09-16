---
title: DepositPreauth
summary: Pre-authorization for a specific account, or for whoever presents certain credentials, to send you funds even though you have DepositAuth enabled.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/depositpreauth
createdBy: DepositPreauth
modifiedBy: DepositPreauth
reserve: 1
---

## What it represents

When an account enables `lsfDepositAuth` on its [AccountRoot](/objects/AccountRoot), no one can deposit funds into it except itself. A `DepositPreauth` is the exception: an allowlist. There are two variants, depending on which field is set:

- **By account**: `Authorize` indicates an address that is allowed to pay you.
- **By credentials**: `AuthorizeCredentials` indicates a set of (`Issuer`, `CredentialType`) pairs. Any account that holds all of those accepted, non-expired credentials ([Credential](/objects/Credential)) can pay you, supplying its `CredentialIDs` in the transaction.

It's checked by `Payment`, `EscrowFinish`, `PaymentChannelClaim`, `CheckCash`, and `AccountDelete` when the destination has `lsfDepositAuth`.

## Lifecycle

- **Creation**: [DepositPreauth](/tx/DepositPreauth) with `Authorize` or with `AuthorizeCredentials` (1 to 8 entries, no duplicates). `preclaim` checks that the authorized account exists and that the same preauthorization doesn't already exist; with credentials, that each issuer exists. `doApply` creates the object and adds 1 to `OwnerCount`.
- **Modification**: doesn't exist. To change it you delete it and create it again.
- **Deletion**: the same transaction with `Unauthorize` or `UnauthorizeCredentials`. [AccountDelete](/tx/AccountDelete) deletes it in cascade.

You don't need `lsfDepositAuth` enabled to create preauthorizations; you can set them up before enabling the flag.

## Key fields

- **Account** — who grants the authorization (the recipient of the future payments).
- **Authorize** — the authorized account. Present only in the account variant.
- **AuthorizeCredentials** — array of `Credential` with `Issuer` and `CredentialType`. Present only in the credentials variant. Order doesn't matter: the key is computed over the sorted hashes.

The two variants have different keys (`keylet::depositPreauth` with two parameters or with the credential vector), so they can coexist.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "deposit_preauth"`. With `ledger_entry`, pass `owner` plus `authorized` or `authorized_credentials` (exactly one of the two):

```json
{ "method": "ledger_entry", "params": [{ "deposit_preauth": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorized": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

```json
{ "method": "ledger_entry", "params": [{ "deposit_preauth": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorized_credentials": [ { "issuer": "rIssuerKYCxxxxxxxxxxxxxxxxxxxxxxxxx", "credential_type": "4B5943" } ] }, "ledger_index": "validated" }] }
```

The account-based key is `SHA512Half(0x0070 || Account || Authorize)`; the credentials-based key is `SHA512Half(0x0071 || Account || sorted_hashes)`. Typical response for the account variant:

```json
{
  "node": {
    "LedgerEntryType": "DepositPreauth",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Flags": 0,
    "OwnerNode": "0",
    "PreviousTxnID": "F1E2D3C4B5A69788796A5B4C3D2E1F00112233445566778899AABBCCDDEEFF00",
    "PreviousTxnLgrSeq": 20800150
  }
}
```

## Reserve

1 owner reserve unit for each preauthorization.

## Related

- [DepositPreauth](/tx/DepositPreauth), [AccountSet](/tx/AccountSet), [Payment](/tx/Payment)
- [Credential](/objects/Credential), [AccountRoot](/objects/AccountRoot), [PermissionedDomain](/objects/PermissionedDomain)
- [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth), [Credentials](/amendments/Credentials)
</content>
</invoke>
<parameter name="file_path">/Users/vrc-mini/Projects/Peersyst/peersyst-Workspace/xrpl-tx-lab/content/objects/DirectoryNode.md