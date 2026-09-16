---
title: fixPriceOracleOrder
summary: Ordena de forma canónica los pares de activos al crear un oráculo de precios.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpriceoracleorder
---

## Qué cambia

Al crear un objeto Oracle con [OracleSet](/tx/OracleSet), `PriceDataSeries` es un array de pares `BaseAsset`/`QuoteAsset` con su precio. Antes de este fix, la creación guardaba el array en el mismo orden en que llegaba en la transacción. Con fixPriceOracleOrder activo, `OracleSet` construye internamente un mapa ordenado por la clave `(BaseAsset, QuoteAsset)` de cada entrada y vuelca ese mapa al array `PriceDataSeries`, de modo que los pares quedan siempre en el mismo orden canónico con independencia de cómo los envió el cliente. Las actualizaciones de un oráculo ya existente no se ven afectadas por este cambio: siguen combinando entradas nuevas y existentes por clave, como hacían antes.

## Transacciones y objetos afectados

- [OracleSet](/tx/OracleSet): cambia el orden en que se serializa `PriceDataSeries` al crear el objeto.
- Objeto Oracle (creado por `OracleSet`, borrado por `OracleDelete`): su array `PriceDataSeries` queda ordenado de forma determinista.

## Estado y contexto

Sin este fix, dos oráculos creados con los mismos pares de activos pero en distinto orden de envío almacenaban `PriceDataSeries` con distinto orden interno, lo que complicaba comparar oráculos o buscar un par concreto sin recorrer todo el array. El fix hace que el orden sea predecible y dependa solo del contenido, no de cómo llegó la transacción.
