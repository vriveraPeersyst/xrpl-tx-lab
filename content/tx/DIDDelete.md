---
title: DIDDelete
summary: Elimina el identificador descentralizado (DID) de tu cuenta y libera su reserva.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/diddelete
amendment: DID
level: básico
---

## Qué hace

`DIDDelete` borra el objeto [DID](/objects/DID) de tu cuenta, si existe, y te devuelve la unidad de owner reserve que consumía. Es la transacción más simple del sistema de identidad: no lleva campos propios, actúa siempre sobre el (único) DID de quien la envía.

Úsala cuando ya no quieras mantener un identificador descentralizado publicado, cuando el documento DID se haya vuelto obsoleto sin intención de sustituirlo, o como paso previo obligatorio para poder borrar la cuenta con [AccountDelete](/tx/AccountDelete), que no procede mientras existan objetos que consuman reserva.

## Cuándo usarlo

- Retirar tu DID público porque ya no lo necesitas o quieres empezar de cero.
- Liberar la reserva de un XRP que el objeto `DID` mantenía bloqueada.
- Preparar tu cuenta para un `AccountDelete`, limpiando primero este objeto.

## Cómo funciona por dentro

**`DIDDelete::preflight`** no valida nada: siempre devuelve `tesSUCCESS`, porque la transacción no tiene campos propios que comprobar.

**`DIDDelete::doApply`** localiza el `DID` de tu cuenta mediante `keylet::did(accountID_)`. Si no existe, falla con `tecNO_ENTRY`: no hay nada que borrar. Si existe, lo elimina de tu directorio de propietario (`dirRemove`); si esa operación no encuentra la entrada esperada en el directorio —un estado interno inconsistente que no debería darse en un ledger sano—, devuelve `tefBAD_LEDGER`. A continuación reduce tu owner count en 1 y borra el objeto del ledger.

El resultado es determinista: o el `DID` desaparece y recuperas la reserva, o la transacción no tiene efecto porque no había nada que borrar.

## Campos clave

No lleva campos específicos más allá de los comunes a toda transacción (`Account`, `Fee`, `Sequence`...).

## Errores habituales

- **tecNO_ENTRY** — tu cuenta no tiene ningún `DID` publicado; no hay nada que eliminar.
- **tefBAD_LEDGER** — inconsistencia interna del directorio de propietario; indicativo de un problema de ledger, no de tu transacción.

## Ejemplo

```json
{
  "TransactionType": "DIDDelete",
  "Account": "rXXXX_TU_CUENTA"
}
```

Elimina el DID de tu cuenta, si existe.

## Pruébalo en testnet

1. Si tu cuenta no tiene DID todavía, créalo primero con [DIDSet](/tx/DIDSet).
2. Confirma con `account_objects` (`type: "did"`) que el objeto existe.
3. Firma y envía el `DIDDelete` del ejemplo.
4. Repite `account_objects`: el objeto ya no aparece, y `account_info` mostrará que tu `OwnerCount` ha bajado en uno y la reserva efectiva disminuye en consecuencia.
5. Envía el mismo `DIDDelete` otra vez: recibirás `tecNO_ENTRY`, porque ya no queda nada que borrar.

## Relacionado

- [DIDSet](/tx/DIDSet) — crea o actualiza el DID.
- [AccountDelete](/tx/AccountDelete) — exige eliminar antes el DID (y otros objetos) de la cuenta.
- Objetos: [DID](/objects/DID).
- Amendments: [DID](/amendments/DID).
