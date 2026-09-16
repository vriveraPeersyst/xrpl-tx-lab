---
title: fixPriceOracleOrder
summary: Canonically orders asset pairs when creating a price oracle.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpriceoracleorder
---

## What changes

When creating an Oracle object with [OracleSet](/tx/OracleSet), `PriceDataSeries` is an array of `BaseAsset`/`QuoteAsset` pairs with their price. Before this fix, creation stored the array in the same order in which it arrived in the transaction. With fixPriceOracleOrder enabled, `OracleSet` internally builds a map ordered by the `(BaseAsset, QuoteAsset)` key of each entry and dumps that map into the `PriceDataSeries` array, so the pairs always end up in the same canonical order regardless of how the client sent them. Updates to an already existing oracle are not affected by this change: they continue to merge new and existing entries by key, as they did before.

## Affected transactions and objects

- [OracleSet](/tx/OracleSet): changes the order in which `PriceDataSeries` is serialized on creation.
- Oracle object (created by `OracleSet`, deleted by `OracleDelete`): its `PriceDataSeries` array ends up deterministically ordered.

## Status and context

Without this fix, two oracles created with the same asset pairs but submitted in a different order stored `PriceDataSeries` with a different internal order, which made it harder to compare oracles or look up a specific pair without scanning the whole array. The fix makes the order predictable and dependent only on the content, not on how the transaction arrived.
