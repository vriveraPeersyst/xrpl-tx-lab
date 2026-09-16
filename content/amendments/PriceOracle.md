---
title: PriceOracle
summary: Allows publishing on-chain price series for asset pairs, signed by a data provider.
xls: XLS-0047
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0047-price-oracle
xrplDocs: https://xrpl.org/resources/known-amendments#priceoracle
introducedIn: 2.2.0
---

## What changes

Introduces the `Oracle` object (`ltORACLE`), owned by an account (`Owner`), additionally identified by an optional `OracleDocumentID` to allow multiple oracles per account. It stores a `Provider` (data provider identifier, up to `kMaxOracleProvider` bytes), an `AssetClass` (asset category, e.g. "currency"), a `LastUpdateTime`, and the central field, `PriceDataSeries`: an array of up to `kMaxOracleDataSeries` `BaseAsset`/`QuoteAsset` pairs with their price.

`OracleSet` creates or updates the oracle. In `preflight` it validates that `PriceDataSeries` is not empty and does not exceed the maximum number of entries, and that `Provider`, `URI` and `AssetClass` respect their maximum lengths; it rejects duplicate asset pairs within the same series using the `(BaseAsset, QuoteAsset)` key. `OracleDelete` removes the object from the ledger. Any account can read the object and use its prices; the `fixPriceOracleOrder` amendment later fixes an issue in the validation order of `OracleSet`, and `fixIncludeKeyletFields` adds keylet metadata to the transaction.

## Affected transactions and objects

- New: [OracleSet](/tx/OracleSet) and [OracleDelete](/tx/OracleDelete).
- Object: new [Oracle](/objects/Oracle).
- Consumed by later AMM and lending protocol features that need an on-chain price reference to calculate collateral, liquidations, or position valuation.

## Status and context

Before this amendment, XRPL had no native way to bring external price data (outside of the on-chain order book itself) onto the ledger: any protocol that needed a reference price—for example XRP/USD to calculate the value of collateral—depended on off-chain infrastructure with no way to verify it on-chain. PriceOracle defines a standard format for data providers to publish and update prices directly on the ledger, signed by their own account, serving as a price database for AMM functions, collateralized lending, and other uses that require an auditable source of price truth.
