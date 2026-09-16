---
title: LoanBroker
summary: A loan manager that borrows capital from a Vault and places it into individual loans to borrowers.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/loanbroker
createdBy: LoanBrokerSet
modifiedBy: LoanBrokerSet, LoanBrokerCoverDeposit, LoanBrokerCoverWithdraw, LoanBrokerCoverClawback, LoanSet, LoanDelete
reserve: 2
---

## What it represents

A `LoanBroker` is the intermediary between a [Vault](/objects/Vault) (which pools depositors' capital) and individual borrowers. The broker borrows from the vault up to `DebtMaximum`, and for each loan it grants a [Loan](/objects/Loan) linked to it appears. The broker also maintains its own "cover": a reserve of its own capital (`CoverAvailable`) that absorbs default losses first, before they reach the vault's depositors. `CoverRateMinimum` and `CoverRateLiquidation` mark the thresholds of that coverage relative to `DebtTotal`.

It is the central piece of the lending system: it groups policies common to all its loans (fees, interest rates) so they don't have to be repeated in every `Loan`.

## Lifecycle

- **Creation**: [LoanBrokerSet](/tx/LoanBrokerSet) without a prior `LoanBrokerID`. It is anchored to an existing `VaultID` and sets the fees (`ManagementFeeRate`) and coverage thresholds.
- **Update**: the same [LoanBrokerSet](/tx/LoanBrokerSet), passing the `LoanBrokerID`, to adjust parameters that do not affect already-open loans.
- **Coverage**: [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) adds the broker's own capital to `CoverAvailable`; [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw) withdraws it if there is a surplus above the minimum; [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback) consumes it to cover a default.
- **Loans**: every [LoanSet](/tx/LoanSet) that uses this broker increases `DebtTotal` and `OwnerCount`; every [LoanDelete](/tx/LoanDelete) reduces them.
- **Deletion**: [LoanBrokerDelete](/tx/LoanBrokerDelete), only if it has no open `Loan` left and no debt to the vault.

## Key fields

- **VaultID / VaultNode** — the vault the broker borrows capital from, and its directory link.
- **Owner / Account** — the broker's owner, who pays the reserve and receives the management fee.
- **LoanSequence** — internal counter used to number the `Loan`s that belong to this broker (together with `LoanBrokerID` it forms each loan's key).
- **DebtTotal / DebtMaximum** — the broker's current debt to the vault and the cap it can reach.
- **CoverAvailable / CoverRateMinimum / CoverRateLiquidation** — the broker's own backing capital and the thresholds that trigger warnings or liquidation if `CoverAvailable` falls too low relative to `DebtTotal`.
- **ManagementFeeRate** — the fee the broker charges on loan payments, before the remainder goes to the vault.
- **Data** — free-form bytes for broker metadata (name, URI, etc., per application convention).

## Flags

It has no `lsf*` flags of its own.

## How to query it

`account_objects` with `type: "loan_broker"` returns it for its `Owner`. With `ledger_entry`, `loan_broker` accepts `owner` and `seq` (the `Sequence` of the `LoanBrokerSet` that created it):

```json
{ "method": "ledger_entry", "params": [{ "loan_broker": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790200 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x006C || AccountID_owner || Sequence)` (`keylet::loanBroker`, namespace `'l'`). Typical response:

```json
{
  "index": "5A7C9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C",
  "node": {
    "LedgerEntryType": "LoanBroker",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "VaultID": "9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B",
    "DebtTotal": "0",
    "DebtMaximum": "500000000000",
    "CoverAvailable": "10000000000",
    "ManagementFeeRate": 500,
    "OwnerNode": "0",
    "VaultNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 2 units of owner reserve (0.4 XRP on testnet) when created.

## Related

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [Vault](/objects/Vault), [Loan](/objects/Loan)
