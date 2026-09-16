---
title: PermissionedDomain
summary: Defines who can participate in a restricted market or vault, based on which credentials it accepts.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/permissioneddomain
createdBy: PermissionedDomainSet
modifiedBy: PermissionedDomainSet
reserve: 1
---

## What it represents

A `PermissionedDomain` is a declarative allowlist: instead of listing specific accounts, it lists which [Credential](/objects/Credential) (issued by which issuer) grant access. Any account holding a valid credential among those accepted can operate within the domain: place `Offer`s with `DomainID`, participate in a restricted [Vault](/objects/Vault), etc. The domain owner doesn't manage account admission one by one; they only decide which credentials to trust, delegating identity verification to the issuers of those credentials.

It's the base building block for regulated markets on XRPL: for example, an RWA that can only trade between KYC-verified accounts authorized by an approved issuer.

## Lifecycle

- **Creation**: [PermissionedDomainSet](/tx/PermissionedDomainSet) without a prior `DomainID`, by the `Owner`. Sets `AcceptedCredentials`, up to 10 `Issuer`+`CredentialType` pairs.
- **Update**: the same [PermissionedDomainSet](/tx/PermissionedDomainSet), passing `DomainID`, replaces the entire `AcceptedCredentials` list.
- **Deletion**: [PermissionedDomainDelete](/tx/PermissionedDomainDelete), only by the `Owner`. Fails if there are still active `Offer`s or other objects depending on this domain.

## Key fields

- **Owner** — who controls which credentials are accepted and pays the reserve.
- **AcceptedCredentials** — list of `{Issuer, CredentialType}`; an account qualifies if it holds at least one accepted, non-expired `Credential` issued by one of those issuers with that exact type.
- **Sequence** — the account's sequence at the time of creation; together with `Owner` it forms the `DomainID`.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "permissioned_domain"` returns it for the `Owner`. With `ledger_entry`, `permissioned_domain` accepts `account` and `seq`, or the `DomainID` directly as a hex string:

```json
{ "method": "ledger_entry", "params": [{ "permissioned_domain": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x006D || AccountID_owner || Sequence)` (`keylet::permissionedDomain`, namespace `'m'`). Typical response:

```json
{
  "index": "1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B",
  "node": {
    "LedgerEntryType": "PermissionedDomain",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "AcceptedCredentials": [
      { "Credential": { "Issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "CredentialType": "4B5943" } }
    ],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the owner.

## Related

- [PermissionedDomainSet](/tx/PermissionedDomainSet), [PermissionedDomainDelete](/tx/PermissionedDomainDelete)
- [Credential](/objects/Credential), [Offer](/objects/Offer), [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [Credentials](/amendments/Credentials)
