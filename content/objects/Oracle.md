---
title: Oracle
summary: Un feed de precios publicado on-chain por un proveedor, con una o varias parejas de activos y su cotización.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/oracle
createdBy: OracleSet
modifiedBy: OracleSet
reserve: 1
---

## Qué representa

Un `Oracle` publica precios de referencia en el ledger: por ejemplo, cuánto vale 1 XRP en USD según un proveedor concreto. Cada entrada de `PriceDataSeries` es un par `BaseAsset`/`QuoteAsset` con su precio (`AssetPrice`) y escala (`Scale`). No hay validación de que el precio sea correcto: cualquier cuenta puede crear un `Oracle` y publicar lo que quiera; quien lo consuma (por ejemplo, un `Vault` con lending, o una aplicación externa) decide en qué proveedores confía.

Una misma cuenta puede tener varios `Oracle`, distinguidos por `OracleDocumentID`.

## Ciclo de vida

- **Creación**: [OracleSet](/tx/OracleSet) sin `Oracle` previo con ese `OracleDocumentID`. Fija `Provider` (nombre del proveedor, en bytes), `AssetClass` (categoría del activo, p. ej. "currency") y la serie inicial de precios.
- **Actualización**: el mismo [OracleSet](/tx/OracleSet), sobre un `Oracle` existente del mismo `Owner` y `OracleDocumentID`, reemplaza `PriceDataSeries` y actualiza `LastUpdateTime`. No hay límite de frecuencia protocolario, pero un `LastUpdateTime` demasiado antiguo o futuro respecto al `close_time` del ledger hace que la transacción falle.
- **Borrado**: [OracleDelete](/tx/OracleDelete), solo por el `Owner`.

## Campos clave

- **Owner** — quien publica el oráculo y paga su reserva.
- **OracleDocumentID** — identificador local (elegido por el dueño) para distinguir varios oráculos de la misma cuenta.
- **Provider** — nombre del proveedor de datos, en bytes libres (p. ej. el nombre de una empresa de feeds).
- **AssetClass** — categoría del activo cotizado (moneda, materia prima, etc.), en bytes libres.
- **PriceDataSeries** — array de pares `BaseAsset`/`QuoteAsset` con `AssetPrice` y `Scale`; el precio real es `AssetPrice / 10^Scale`.
- **LastUpdateTime** — segundos Unix (no Ripple Epoch, a diferencia de casi todo lo demás en el ledger) de la última actualización de precios.
- **URI** — enlace opcional a documentación o metadatos adicionales del proveedor.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "oracle"` lo devuelve para el `Owner`. Con `ledger_entry`, `oracle` acepta `account` y `oracle_document_id`:

```json
{ "method": "ledger_entry", "params": [{ "oracle": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "oracle_document_id": 1 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0052 || AccountID_owner || OracleDocumentID)` (`keylet::oracle`, namespace `'R'`). Respuesta típica:

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

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del dueño.

## Relacionado

- [OracleSet](/tx/OracleSet), [OracleDelete](/tx/OracleDelete)
- [Vault](/objects/Vault), [LoanBroker](/objects/LoanBroker)
