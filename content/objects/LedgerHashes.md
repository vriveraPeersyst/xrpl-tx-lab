---
title: LedgerHashes
summary: Objeto de sistema que guarda hashes de ledgers pasados para permitir saltar hacia atrás en el histórico sin recorrerlo entero.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ledgerhashes
createdBy: sistema (consenso)
modifiedBy: sistema (consenso)
reserve: 0
---

## Qué representa

Cada ledger enlaza con el anterior por su hash, pero recorrer esa cadena uno a uno para llegar a un ledger antiguo sería carísimo. `LedgerHashes` implementa una "skip list": guarda hasta 256 hashes de ledgers anteriores para que se pueda saltar directamente hacia atrás con pocos saltos, en vez de ledger a ledger.

Hay dos variantes, ambas con el mismo `LedgerEntryType`:

- **Skip list corta**: un objeto de índice fijo que se actualiza en cada ledger y guarda los últimos 256 hashes.
- **Skip list larga**: un objeto por cada rango de 65536 ledgers ("flag ledger"), que guarda los hashes de los ledgers múltiplos de 256 dentro de ese rango. Con la corta y la larga combinadas, se puede llegar a cualquier ledger histórico en como mucho dos saltos.

## Ciclo de vida

- **Creación y actualización**: automáticas, en cada cierre de ledger, como parte del propio proceso de consenso. Ninguna transacción de usuario los toca; no hay un `EnableAmendment` o `SetFee` equivalente para este tipo.
- **Borrado**: nunca se borran.

## Campos clave

- **Hashes** — vector de hasta 256 hashes de 256 bits, en orden.
- **FirstLedgerSequence** — solo en la skip list larga: el primer índice de ledger cubierto.
- **LastLedgerSequence** — solo en la skip list larga: el último índice de ledger cubierto.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

No pertenece a ninguna cuenta, así que no aparece en `account_objects`. Con `ledger_entry`, el parámetro `hashes` admite dos formas: `true` para la skip list corta, o un número de índice de ledger para la skip list larga que cubre ese rango:

```json
{ "method": "ledger_entry", "params": [{ "hashes": true, "ledger_index": "validated" }] }
```

```json
{ "method": "ledger_entry", "params": [{ "hashes": 20800000, "ledger_index": "validated" }] }
```

El índice de la corta es fijo: `SHA512Half(0x0073)` (`keylet::skip()`, namespace `'s'`). El de la larga se calcula con `SHA512Half(0x0073 || (ledger_index >> 16))`, es decir, un objeto distinto por cada bloque de 65536 ledgers. Respuesta típica:

```json
{
  "index": "B4979A36CDC7F3D3D5C31A4EAE2AC7D7209DDA877588B9AFC66799692AB0D66",
  "node": {
    "LedgerEntryType": "LedgerHashes",
    "Hashes": [
      "C6A5FDE95FC5D9A6D...",
      "A38B7C1D9E2F4A6B8C..."
    ],
    "Flags": 0
  }
}
```

En la práctica es más rápido usar directamente `ledger` con `ledger_index` para obtener un hash concreto; `LedgerHashes` se usa sobre todo internamente en rippled para servir `ledger_range` y respuestas de histórico.

## Relacionado

- [Amendments](/objects/Amendments), [FeeSettings](/objects/FeeSettings), [NegativeUNL](/objects/NegativeUNL)
