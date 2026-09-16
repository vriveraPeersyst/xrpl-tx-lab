---
title: Vault
summary: A single-asset pool (Single Asset Vault) that pools deposits from multiple users and issues an MPT representing each one's share.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/vault
createdBy: VaultCreate
modifiedBy: VaultSet, VaultDeposit, VaultWithdraw, VaultClawback
reserve: 2
---

## What it represents

A `Vault` is a shared basket of a single asset (`Asset`: XRP, an issued token, or an MPT): depositors put in that asset and in exchange receive units of `ShareMPTID`, an [MPTokenIssuance](/objects/MPTokenIssuance) automatically created alongside the vault that represents their proportional share. The value of the deposited asset can grow (for example, lent out through a [LoanBroker](/objects/LoanBroker) that generates interest) without needing to move each depositor's capital individually: it is enough for `AssetsTotal` to rise for each `ShareMPTID` unit to be worth more.

It can be public (`lsfVaultPrivate` absent, anyone can deposit) or private (only accounts with access to a specific [PermissionedDomain](/objects/PermissionedDomain)).

## Lifecycle

- **Creation**: [VaultCreate](/tx/VaultCreate), by the `Owner`. Sets `Asset`, `WithdrawalPolicy` (how withdrawals are processed) and, if private, the `DomainID` that restricts who can participate. Automatically creates the associated `ShareMPTID`.
- **Configuration**: [VaultSet](/tx/VaultSet) adjusts mutable parameters such as `AssetsMaximum` or the `DomainID` of a private vault.
- **Deposit/withdrawal**: [VaultDeposit](/tx/VaultDeposit) puts in the asset and delivers `ShareMPTID`; [VaultWithdraw](/tx/VaultWithdraw) returns `ShareMPTID` and takes out the proportional asset, subject to `AssetsAvailable` (what is not lent out to a `LoanBroker`).
- **Clawback**: [VaultClawback](/tx/VaultClawback), only if the underlying asset allows clawback, lets the issuer recover asset from a specific depositor.
- **Deletion**: [VaultDelete](/tx/VaultDelete), only when `AssetsTotal` is zero (everyone has withdrawn).

## Key fields

- **Owner / Account** — who controls the vault (sets its parameters) and the internal account that custodies the funds, respectively; in practice they usually coincide.
- **Asset** — the single asset this vault accepts, fixed forever at creation.
- **AssetsTotal / AssetsAvailable / AssetsMaximum** — the theoretical total (including what is lent out), the liquid amount available to withdraw right now, and the capital cap the vault accepts.
- **ShareMPTID** — the `MPTokenIssuance` that represents each depositor's share; its `OutstandingAmount` is the vault's total "shares".
- **WithdrawalPolicy** — how withdrawals are resolved when there is no immediate liquidity (e.g. waiting queue vs. rejection).
- **LossUnrealized** — losses detected but not yet passed through to the per-unit value of `ShareMPTID` (e.g. from a defaulted loan not fully settled).
- **Data** — free bytes for vault metadata.

## Flags

- **lsfVaultPrivate** — the vault only accepts deposits from accounts with credentials accepted by its `DomainID`; without this flag, it is open to anyone.

## How to query it

`account_objects` with `type: "vault"` returns it for the `Owner`. With `ledger_entry`, `vault` accepts `owner` and `seq` (the `Sequence` of the `VaultCreate`):

```json
{ "method": "ledger_entry", "params": [{ "vault": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0056 || AccountID_owner || Sequence)` (`keylet::vault`, namespace `'V'`). Typical response:

```json
{
  "index": "5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F",
  "node": {
    "LedgerEntryType": "Vault",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Asset": { "currency": "XRP" },
    "AssetsTotal": "1000000000",
    "AssetsAvailable": "400000000",
    "ShareMPTID": "00000D8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F",
    "Flags": 0,
    "OwnerNode": "0"
  }
}
```

## Reserve

Consumes 2 owner reserve units (0.4 XRP on testnet) from the `Owner`: one for the `Vault` itself and another for the `ShareMPTID`'s `MPTokenIssuance` created with it.

## Related

- [VaultCreate](/tx/VaultCreate), [VaultSet](/tx/VaultSet), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [LoanBroker](/objects/LoanBroker), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
