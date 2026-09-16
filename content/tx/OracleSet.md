---
title: OracleSet
summary: Creates or updates an on-chain price oracle with a series of base/quote pairs.
category: oraculos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/oracleset
amendment: PriceOracle
level: intermediate
---

## What it does

`OracleSet` publishes an [Oracle](/objects/Oracle) object on the ledger: a price provider (an exchange, an aggregator, yourself) declares the value of one or more asset pairs (`BaseAsset`/`QuoteAsset`) at a specific time. An account can maintain several distinct oracles, distinguished by `OracleDocumentID`, a numeric identifier you choose.

The price isn't stored as a decimal but as an integer (`AssetPrice`) plus a scale (`Scale`): the actual value is `AssetPrice / 10^Scale`. For example, `AssetPrice: 2500, Scale: 4` represents 0.2500. Any on-chain application (or the `get_aggregate_price` RPC method) can read these prices to, for example, calculate loan liquidations or swap limits.

## When to use it

- Publishing your own price feed (XRP/USD, an index, an exchange rate) for other contracts or applications to query on the ledger.
- Periodically updating an existing oracle with the latest price.
- Feeding the lending engine ([LoanBrokerSet](/tx/LoanBrokerSet) and related transactions), which relies on price oracles to value collateral.
- Combining several oracles with `get_aggregate_price` to get a median that's resistant to manipulation from a single source.

## How it works inside

**`OracleSet::preflight`** requires `PriceDataSeries` to not be empty (`temARRAY_EMPTY`) nor exceed the maximum number of entries (`temARRAY_TOO_LARGE`). `Provider`, `URI`, and `AssetClass`, if included, cannot be empty or exceed their maximum length (`temMALFORMED`).

**`OracleSet::preclaim`** requires `LastUpdateTime` (Unix timestamp, not Ripple Epoch) to fall within a window around the close of the previous ledger — neither too far in the past nor in the future (`tecINVALID_UPDATE_TIME` if it's out of range). Each entry in `PriceDataSeries` must have a `BaseAsset` different from `QuoteAsset`, and the same pair can't be repeated twice in the same call (`temMALFORMED`). If the oracle already exists (same account + `OracleDocumentID`), the update requires a `LastUpdateTime` strictly later than the stored one (`tecINVALID_UPDATE_TIME` if it doesn't advance), and `Provider`/`AssetClass`, if repeated, must match what's already registered. An entry without `AssetPrice` on an existing pair marks it for deletion; on a nonexistent pair, it's an error (`temMALFORMED`).

**`OracleSet::doApply`** creates the object the first time (consuming owner reserve, `tecDIR_FULL` if your directory is full) or updates the given pairs, adding, replacing, or removing entries from `PriceDataSeries` as described in `preclaim`.

## Key fields

- **OracleDocumentID** — an integer you choose to identify this oracle among those your account maintains. It doesn't change between updates of the same feed.
- **LastUpdateTime** — Unix timestamp (seconds since 1970, not Ripple Epoch) of when the price was taken. Must advance on each update and stay close to the current ledger close.
- **PriceDataSeries** — a list of `PriceData`, each with `BaseAsset`, `QuoteAsset`, `AssetPrice` (integer), and `Scale` (decimals). Omitting `AssetPrice` on an existing pair removes it from the oracle.
- **Provider** and **AssetClass** — free-form (hex) metadata identifying the source and the asset category; they must stay consistent across updates of the same oracle.

## Common errors

- **tecINVALID_UPDATE_TIME** — `LastUpdateTime` is outside the allowed window relative to the ledger, or doesn't advance relative to the previous value.
- **temARRAY_EMPTY** / **tecARRAY_EMPTY** — `PriceDataSeries` is empty.
- **temARRAY_TOO_LARGE** / **tecARRAY_TOO_LARGE** — too many entries in `PriceDataSeries`.
- **tecTOKEN_PAIR_NOT_FOUND** — you're trying to delete (by omitting `AssetPrice`) a pair that didn't exist in the oracle.
- **tecINSUFFICIENT_RESERVE** — you don't have enough XRP above the reserve to create the oracle.
- **temMALFORMED** — `Provider`/`AssetClass` inconsistent with a previous update, or a duplicate pair in the same call.

## Example

```json
{
  "TransactionType": "OracleSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "OracleDocumentID": 1,
  "Provider": "70726F7669646572",
  "AssetClass": "63757272656E6379",
  "LastUpdateTime": "{{unix}}",
  "PriceDataSeries": [
    { "PriceData": { "BaseAsset": "XRP", "QuoteAsset": "USD", "AssetPrice": 2500, "Scale": 4 } }
  ]
}
```

Publishes oracle 1 with an XRP/USD price of 0.2500.

## Try it on testnet

1. Sign and submit the example as-is; the builder fills `LastUpdateTime` with the current Unix timestamp.
2. Query with the `get_aggregate_price` method, passing your account and `oracle_document_id: 1`: you'll see the aggregated price.
3. Submit a second `OracleSet` with the same `OracleDocumentID`, a later `LastUpdateTime`, and a different `AssetPrice`: check that it updates.
4. Repeat the submission with the same `LastUpdateTime` as the previous step: you'll get `tecINVALID_UPDATE_TIME`.
5. Delete the oracle with [OracleDelete](/tx/OracleDelete) and confirm with `account_objects` (`type: "oracle"`) that it has disappeared.

## Related

- [OracleDelete](/tx/OracleDelete) — deletes the oracle.
- [LoanBrokerSet](/tx/LoanBrokerSet) — the lending protocol consumes oracle prices.
- Objects: [Oracle](/objects/Oracle).
- Amendments: [PriceOracle](/amendments/PriceOracle).
