---
title: PriceOracle
summary: Permite publicar en cadena series de precios de pares de activos, firmadas por un proveedor de datos.
xls: XLS-0047
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0047-price-oracle
xrplDocs: https://xrpl.org/resources/known-amendments#priceoracle
introducedIn: 2.2.0
---

## Qué cambia

Introduce el objeto `Oracle` (`ltORACLE`), propiedad de una cuenta (`Owner`), identificado además por un `OracleDocumentID` opcional para permitir varios oráculos por cuenta. Almacena un `Provider` (identificador del proveedor de datos, hasta `kMaxOracleProvider` bytes), una `AssetClass` (categoría del activo, p. ej. "currency"), un `LastUpdateTime` y, el campo central, `PriceDataSeries`: un array de hasta `kMaxOracleDataSeries` pares `BaseAsset`/`QuoteAsset` con su precio.

`OracleSet` crea o actualiza el oráculo. En `preflight` valida que `PriceDataSeries` no esté vacío ni exceda el máximo de entradas, y que `Provider`, `URI` y `AssetClass` respeten sus longitudes máximas; rechaza pares de activos duplicados dentro de la misma serie usando la clave `(BaseAsset, QuoteAsset)`. `OracleDelete` retira el objeto del ledger. Cualquier cuenta puede leer el objeto y usar sus precios; el amendment `fixPriceOracleOrder` corrige después un problema en el orden de validación de `OracleSet`, y `fixIncludeKeyletFields` añade metadatos de keylet a la transacción.

## Transacciones y objetos afectados

- Nuevas: [OracleSet](/tx/OracleSet) y [OracleDelete](/tx/OracleDelete).
- Objeto: nuevo [Oracle](/objects/Oracle).
- Consumido por funcionalidades posteriores de AMM y del protocolo de préstamos que necesitan una referencia de precio en cadena para calcular colateral, liquidaciones o valoración de posiciones.

## Estado y contexto

Antes de este amendment, XRPL no tenía forma nativa de traer datos de precios externos (fuera del propio libro de órdenes on-chain) al ledger: cualquier protocolo que necesitara un precio de referencia —por ejemplo XRP/USD para calcular el valor de una garantía— dependía de infraestructura fuera de cadena sin manera de verificarlo on-chain. PriceOracle define un formato estándar para que proveedores de datos publiquen y actualicen precios directamente en el ledger, firmados por su propia cuenta, sirviendo de base de datos de precios para funciones de AMM, préstamos colateralizados y otros usos que requieren una fuente de verdad de precio auditable.
