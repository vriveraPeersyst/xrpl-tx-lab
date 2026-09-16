---
title: MPTokenIssuance
summary: Defines a Multi-Purpose Token: who issues it, how many units are in circulation, and what permissions it has.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/mptokenissuance
createdBy: MPTokenIssuanceCreate
modifiedBy: MPTokenIssuanceSet
reserve: 1
---

## What it represents

`MPTokenIssuance` is the "factory" of an MPT type: a fungible asset that is simpler and cheaper than a classic issued token (it does not use a 3/20-character `Currency` or bidirectional trust lines). All of the token's behavior — whether it can be transferred between third parties, whether it requires authorization, whether the issuer can freeze it or claw it back — is decided all at once at creation time, via flags, and cannot be changed afterward except for what `MPTokenIssuanceSet` explicitly allows.

Every holder who wants to hold it needs their own [MPToken](/objects/MPToken); the issuance itself does not store individual balances, only the total in circulation.

## Lifecycle

- **Creation**: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), by the issuer. Sets the immutable flags (`lsfMPTCanTransfer`, `lsfMPTCanLock`, `lsfMPTCanEscrow`, `lsfMPTRequireAuth`, `lsfMPTCanTrade`, `lsfMPTCanClawback`), `AssetScale` (decimals), `MaximumAmount` (issuance cap, optional), and `MPTokenMetadata`. The issuing account's `Sequence` at creation time is part of the key.
- **Limited update**: [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), only to lock/unlock the entire issuance (if it has `lsfMPTCanLock`) or to authorize/deauthorize specific holders if it requires `lsfMPTRequireAuth`; it does not change the capability flags or `MaximumAmount`.
- **Issuance and burning**: every `Payment` from the issuer to a holder increases `OutstandingAmount`; a `Payment` back to the issuer, or a `Clawback`, reduces it.
- **Deletion**: [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy), only if `OutstandingAmount` is zero (no one has an outstanding balance).

## Key fields

- **Issuer / Sequence** — who issues it and the account sequence at creation; together they form the 192-bit `MPTokenIssuanceID`.
- **AssetScale** — number of decimals: `MPTAmount` is expressed in the minimum unit, divided by `10^AssetScale` for the "human" value.
- **MaximumAmount** — cap on the allowed `OutstandingAmount`; if absent, the issuance is unlimited.
- **OutstandingAmount** — total currently in circulation, summing all `MPToken`s across all holders.
- **TransferFee** — fee in basis points (0-50000, up to 50%) charged by the issuer on transfers between third parties, if `lsfMPTCanTransfer` is set.
- **DomainID** — if present, only accounts with access to that [PermissionedDomain](/objects/PermissionedDomain) can trade the MPT on the DEX.
- **MPTokenMetadata** — free-form bytes (up to 1024) for name, ticker, icon, or other metadata chosen by the issuer.

## Flags

- **lsfMPTLocked** — the entire issuance is frozen by the issuer; no holder can move balance.
- **lsfMPTCanLock** — the issuer can freeze the entire issuance or individual balances.
- **lsfMPTRequireAuth** — holders need explicit authorization from the issuer before they can receive balance.
- **lsfMPTCanEscrow** — the MPT can be used in an `Escrow`.
- **lsfMPTCanTrade** — the MPT can be placed on the DEX (`OfferCreate`).
- **lsfMPTCanTransfer** — holders can transfer the MPT to each other, not only with the issuer.
- **lsfMPTCanClawback** — the issuer can reclaim balance from a holder with `Clawback`.
- **lsfMPTCanHoldConfidentialBalance** — the issuance supports encrypted balances (confidential transfers).

## How to query it

`account_objects` with `type: "mpt_issuance"` returns it for the `Issuer`. With `ledger_entry`, `mpt_issuance` accepts the `MPTokenIssuanceID` directly as a hex string:

```json
{ "method": "ledger_entry", "params": [{ "mpt_issuance": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F", "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x007E || MPTokenIssuanceID)` (`keylet::mptokenIssuance`, namespace `'~'`); the `MPTokenIssuanceID` itself already combines the account sequence and the issuer's `AccountID` (`makeMptID`). Typical response:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "MPTokenIssuance",
    "Issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "AssetScale": 2,
    "MaximumAmount": "1000000000",
    "OutstandingAmount": "5000",
    "TransferFee": 250,
    "Flags": 48,
    "OwnerNode": "0"
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the issuer.

## Related

- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy)
- [MPToken](/objects/MPToken), [PermissionedDomain](/objects/PermissionedDomain)
- [DynamicMPT](/amendments/DynamicMPT)
