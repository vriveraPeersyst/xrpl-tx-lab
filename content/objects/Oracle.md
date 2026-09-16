---
title: Oracle
summary: A price feed published on-chain by a provider, with one or more asset pairs and their quote.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/oracle
createdBy: OracleSet
modifiedBy: OracleSet
reserve: 1
---

## What it represents

An `Oracle` publishes reference prices in the ledger: for example, how much 1 XRP is worth in USD according to a particular provider. Each entry in `PriceDataSeries` is a `BaseAsset`/`QuoteAsset` pair with its price (`AssetPrice`) and scale (`Scale`). There is no validation that the price is correct: any account can create an `Oracle` and publish whatever it wants; whoever consumes it (for example, a `Vault` with lending, or an external application) decides which providers to trust.

A single account can have several `Oracle` objects, distinguished by `OracleDocumentID`.

## Lifecycle

- **Creation**: [OracleSet](/tx/OracleSet) without a prior `Oracle` under that `OracleDocumentID`. Sets `Provider` (provider name, in bytes), `AssetClass` (asset category, e.g. "currency") and the initial price series.
- **Update**: the same [OracleSet](/tx/OracleSet), on an existing `Oracle` with the same `Owner` and `OracleDocumentID`, replaces `PriceDataSeries` and updates `LastUpdateTime`. There's no protocol-level rate limit, but a `LastUpdateTime` too far in the past or future relative to the ledger's `close_time` causes the transaction to fail.
- **Deletion**: [OracleDelete](/tx/OracleDelete), only by the `Owner`.

## Key fields

- **Owner** — who publishes the oracle and pays its reserve.
- **OracleDocumentID** — local identifier (chosen by the owner) to distinguish multiple oracles from the same account.
- **Provider** — name of the data provider, in free-form bytes (e.g. the name of a feed provider company).
- **AssetClass** — category of the quoted asset (currency, commodity, etc.), in free-form bytes.
- **PriceDataSeries** — array of `BaseAsset`/`QuoteAsset` pairs with `AssetPrice` and `Scale`; the actual price is `AssetPrice / 10^Scale`.
- **LastUpdateTime** — Unix seconds (not Ripple Epoch, unlike almost everything else in the ledger) of the last price update.
- **URI** — optional link to documentation or additional metadata from the provider.

## Flags

Has no `lsf*` flags.

## How to query it

`account_objects` with `type: "oracle"` returns it for the `Owner`. With `ledger_entry`, `oracle` accepts `account` and `oracle_document_id`:

```json
{ "method": "ledger_entry", "params": [{ "oracle": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "oracle_document_id": 1 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0052 || AccountID_owner || OracleDocumentID)` (`keylet::oracle`, namespace `'R'`). Typical response:

```json
{
  "index": "0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A",
  "node": {
    "LedgerEntryType": "Oracle",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Provider": "6465785F70726F76696465725F31",
    "AssetClass": "63757272656E6379",
    "LastUpdateTime": 1757980800,
    "PriceDataSeries": [
      { "PriceData": { "BaseAsset": "XRP", "QuoteAsset": "USD", "AssetPrice": "5432", "Scale": 4 } }
    ],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the owner.

## Related

- [OracleSet](/tx/OracleSet), [OracleDelete](/tx/OracleDelete)
- [Vault](/objects/Vault), [LoanBroker](/objects/LoanBroker)
