---
title: OracleSet
summary: Crea o actualiza un oráculo de precios on-chain con una serie de pares base/quote.
category: oraculos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/oracleset
amendment: PriceOracle
level: intermedio
---

## Qué hace

`OracleSet` publica un objeto [Oracle](/objects/Oracle) en el ledger: un proveedor de precios (un exchange, un agregador, tú mismo) declara el valor de uno o varios pares de activos (`BaseAsset`/`QuoteAsset`) a una hora concreta. Una cuenta puede mantener varios oráculos distintos, distinguidos por `OracleDocumentID`, un identificador numérico que tú eliges.

El precio no se guarda como decimal sino como un entero (`AssetPrice`) más una escala (`Scale`): el valor real es `AssetPrice / 10^Scale`. Por ejemplo, `AssetPrice: 2500, Scale: 4` representa 0,2500. Cualquier aplicación en cadena (o el método RPC `get_aggregate_price`) puede leer estos precios para, por ejemplo, calcular liquidaciones de préstamos o límites de swap.

## Cuándo usarlo

- Publicar un feed de precios propio (XRP/USD, un índice, un tipo de cambio) que otros contratos o aplicaciones consulten en el ledger.
- Actualizar periódicamente un oráculo ya existente con el precio más reciente.
- Alimentar el motor de préstamos ([LoanBrokerSet](/tx/LoanBrokerSet) y afines), que se apoya en oráculos de precio para valorar colateral.
- Combinar varios oráculos con `get_aggregate_price` para obtener una mediana resistente a manipulación de una sola fuente.

## Cómo funciona por dentro

**`OracleSet::preflight`** exige que `PriceDataSeries` no esté vacío (`temARRAY_EMPTY`) ni supere el máximo de entradas (`temARRAY_TOO_LARGE`). `Provider`, `URI` y `AssetClass`, si los incluyes, no pueden estar vacíos ni superar su longitud máxima (`temMALFORMED`).

**`OracleSet::preclaim`** exige que `LastUpdateTime` (timestamp Unix, no Ripple Epoch) esté dentro de una ventana alrededor del cierre del ledger anterior — ni demasiado en el pasado ni en el futuro (`tecINVALID_UPDATE_TIME` si se sale). Cada entrada de `PriceDataSeries` debe tener `BaseAsset` distinto de `QuoteAsset` y no puede repetirse el mismo par dos veces en la misma llamada (`temMALFORMED`). Si el oráculo ya existe (misma cuenta + `OracleDocumentID`), la actualización exige un `LastUpdateTime` estrictamente posterior al guardado (`tecINVALID_UPDATE_TIME` si no avanza) y que `Provider`/`AssetClass`, si los repites, coincidan con los ya registrados. Una entrada sin `AssetPrice` sobre un par ya existente lo marca para borrado; sobre un par inexistente, es un error (`temMALFORMED`).

**`OracleSet::doApply`** crea el objeto la primera vez (con reserva de propietario, `tecDIR_FULL` si tu directorio está lleno) o actualiza los pares indicados, añadiendo, sustituyendo o eliminando entradas de `PriceDataSeries` según lo descrito en `preclaim`.

## Campos clave

- **OracleDocumentID** — entero que tú eliges para identificar este oráculo entre los que mantiene tu cuenta. No cambia entre actualizaciones del mismo feed.
- **LastUpdateTime** — timestamp Unix (segundos desde 1970, no Ripple Epoch) de cuándo se tomó el precio. Debe avanzar en cada actualización y estar cerca del cierre de ledger actual.
- **PriceDataSeries** — lista de `PriceData`, cada una con `BaseAsset`, `QuoteAsset`, `AssetPrice` (entero) y `Scale` (decimales). Omitir `AssetPrice` sobre un par existente lo elimina del oráculo.
- **Provider** y **AssetClass** — metadatos libres (hex) que identifican la fuente y la categoría del activo; deben mantenerse consistentes entre actualizaciones del mismo oráculo.

## Errores habituales

- **tecINVALID_UPDATE_TIME** — `LastUpdateTime` está fuera de la ventana permitida respecto al ledger, o no avanza respecto al valor anterior.
- **temARRAY_EMPTY** / **tecARRAY_EMPTY** — `PriceDataSeries` va vacío.
- **temARRAY_TOO_LARGE** / **tecARRAY_TOO_LARGE** — demasiadas entradas en `PriceDataSeries`.
- **tecTOKEN_PAIR_NOT_FOUND** — intentas borrar (omitiendo `AssetPrice`) un par que no existía en el oráculo.
- **tecINSUFFICIENT_RESERVE** — no te queda XRP por encima de la reserva para crear el oráculo.
- **temMALFORMED** — `Provider`/`AssetClass` inconsistentes con una actualización previa, o un par duplicado en la misma llamada.

## Ejemplo

```json
{
  "TransactionType": "OracleSet",
  "Account": "rXXXX_TU_CUENTA",
  "OracleDocumentID": 1,
  "Provider": "70726F7669646572",
  "AssetClass": "63757272656E6379",
  "LastUpdateTime": "{{unix}}",
  "PriceDataSeries": [
    { "PriceData": { "BaseAsset": "XRP", "QuoteAsset": "USD", "AssetPrice": 2500, "Scale": 4 } }
  ]
}
```

Publica el oráculo 1 con un precio XRP/USD de 0,2500.

## Pruébalo en testnet

1. Firma y envía el ejemplo tal cual; el builder rellena `LastUpdateTime` con el timestamp Unix actual.
2. Consulta con el método `get_aggregate_price` pasando tu cuenta y `oracle_document_id: 1`: verás el precio agregado.
3. Envía un segundo `OracleSet` con el mismo `OracleDocumentID`, un `LastUpdateTime` posterior y un `AssetPrice` distinto: comprueba que se actualiza.
4. Repite el envío con el mismo `LastUpdateTime` que el paso anterior: recibirás `tecINVALID_UPDATE_TIME`.
5. Borra el oráculo con [OracleDelete](/tx/OracleDelete) y confirma con `account_objects` (`type: "oracle"`) que ha desaparecido.

## Relacionado

- [OracleDelete](/tx/OracleDelete) — elimina el oráculo.
- [LoanBrokerSet](/tx/LoanBrokerSet) — el protocolo de préstamos consume precios de oráculos.
- Objetos: [Oracle](/objects/Oracle).
- Amendments: [PriceOracle](/amendments/PriceOracle).
