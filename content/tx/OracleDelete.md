---
title: OracleDelete
summary: Elimina un oráculo de precios y libera la reserva que consumía.
category: oraculos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/oracledelete
amendment: PriceOracle
level: básico
---

## Qué hace

`OracleDelete` borra un objeto [Oracle](/objects/Oracle) completo del ledger: todos los pares de precios que contenía desaparecen de una vez, y recuperas la reserva de propietario que consumía. Se identifica exactamente igual que al crearlo, con `OracleDocumentID`, ya que una cuenta puede mantener varios oráculos en paralelo.

No hay borrado parcial de pares con esta transacción — para eso usas [OracleSet](/tx/OracleSet) omitiendo `AssetPrice` en la entrada que quieras retirar. `OracleDelete` es todo o nada.

## Cuándo usarlo

- Retirar un feed de precios que ya no vas a mantener actualizado.
- Liberar la reserva de un oráculo obsoleto o de pruebas.
- Limpiar oráculos antes de un `AccountDelete`, si acumulan reserva de propietario.
- Sustituir un oráculo por otro con distinto `OracleDocumentID` sin arrastrar el histórico de pares antiguos: en vez de sobrescribir con [OracleSet](/tx/OracleSet), a veces es más simple borrar y volver a crear desde cero.

## Cómo funciona por dentro

**`OracleDelete::preflight`** no valida nada específico: siempre devuelve `tesSUCCESS`.

**`OracleDelete::preclaim`** comprueba que existe un oráculo con tu cuenta como propietario y el `OracleDocumentID` indicado; si no, `tecNO_ENTRY`.

**`OracleDelete::doApply`**, a través de la función interna `deleteOracle`, elimina el objeto del directorio de propietario (`tefBAD_LEDGER` si el directorio está en un estado inconsistente), reduce tu owner count en 1 y borra el objeto del ledger. El efecto es inmediato: el oráculo y todos sus pares de precios dejan de existir en ese mismo ledger.

## Campos clave

- **OracleDocumentID** — el identificador del oráculo a borrar, el mismo que usaste al crearlo con [OracleSet](/tx/OracleSet).

## Errores habituales

- **tecNO_ENTRY** — no existe ningún oráculo con ese `OracleDocumentID` en tu cuenta.
- **tefBAD_LEDGER** — inconsistencia interna al eliminar la entrada del directorio de propietario.

A diferencia de `OracleSet`, aquí no hay validaciones de tiempo ni de formato: si el oráculo existe y es tuyo, la transacción tiene éxito. Ten en cuenta que cualquier aplicación que dependa de ese `OracleDocumentID` (por ejemplo, un `LoanBrokerSet` que lo referencia como fuente de precio) dejará de poder consultarlo una vez borrado.

## Ejemplo

```json
{
  "TransactionType": "OracleDelete",
  "Account": "rXXXX_TU_CUENTA",
  "OracleDocumentID": 1
}
```

Elimina el oráculo número 1 de tu cuenta.

## Pruébalo en testnet

1. Crea un oráculo de prueba con [OracleSet](/tx/OracleSet) si aún no tienes uno.
2. Confirma que existe consultando `get_aggregate_price` con tu cuenta y `oracle_document_id: 1`.
3. Firma y envía el `OracleDelete` del ejemplo.
4. Repite la consulta `get_aggregate_price`: ahora fallará porque el oráculo ya no existe. Comprueba también con `account_objects` (`type: "oracle"`) que el objeto ha desaparecido.
5. Envía el mismo `OracleDelete` otra vez: recibirás `tecNO_ENTRY`.

## Relacionado

- [OracleSet](/tx/OracleSet) — crea o actualiza el oráculo.
- Objetos: [Oracle](/objects/Oracle).
- Amendments: [PriceOracle](/amendments/PriceOracle).
