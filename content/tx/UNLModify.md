---
title: UNLModify
summary: Pseudo-transacción de la Negative UNL con la que la red marca a un validador como inactivo o lo rehabilita.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/pseudo-transaction-types/unlmodify
amendment: NegativeUNL
level: avanzado
---

## Qué hace

El XRPL necesita que más del 80 % de los validadores de confianza (la UNL) estén de acuerdo para validar un ledger. Si varios validadores se caen a la vez, la red podría dejar de avanzar. La *Negative UNL* es la solución: la propia red lleva una lista de validadores que llevan tiempo sin votar y los descuenta temporalmente del quórum, para que la ausencia de unos pocos no bloquee a todos.

`UNLModify` es la pseudo-transacción que actualiza esa lista, guardada en el objeto [NegativeUNL](/objects/NegativeUNL). Con `UNLModifyDisabling: 1` propone deshabilitar a un validador; con `0` propone rehabilitarlo. La propuesta no surte efecto de inmediato: se anota como `ValidatorToDisable` o `ValidatorToReEnable` y se hace efectiva en el siguiente flag ledger, 256 ledgers después.

Como todas las pseudo-transacciones, la emite el sistema con la cuenta nula, sin fee y sin firma; ninguna cuenta puede enviarla.

## Cuándo usarlo

No se puede usar. Conviene entenderla para:

- Interpretar `server_info` o `ledger_entry` (`nunl: true`) cuando ves validadores en `DisabledValidators`.
- Saber que un validador deshabilitado sigue pudiendo validar; simplemente no cuenta para el quórum hasta que se rehabilite.
- Entender la robustez de la red frente a caídas parciales: las reglas de voto (`NegativeUNLVote`) solo permiten listar hasta el 25 % de la UNL (`kNegativeUnlMaxListed`), deshabilitar a quien haya validado menos del 50 % de los últimos 256 ledgers y rehabilitar a quien vuelva a superar el 80 %.

## Cómo funciona por dentro

Comparte el transactor `Change` (`src/libxrpl/tx/transactors/system/Change.cpp`) con [EnableAmendment](/tx/EnableAmendment) y [SetFee](/tx/SetFee).

`Transactor::invokePreflight<Change>` impone la forma de toda pseudo-transacción: `Account` cero (`temBAD_SRC_ACCOUNT`), `Fee` 0 (`temBAD_FEE`), sin firma ni `Signers` (`temBAD_SIGNATURE`), `Sequence` 0 y sin `PreviousTxnID` (`temBAD_SEQUENCE`).

`Change::preclaim` devuelve `temINVALID` si se intenta aplicar contra el ledger abierto; para `ttUNL_MODIFY` no valida nada más.

`Change::doApply` llama a `Change::applyUNLModify`, que hace todas las comprobaciones y responde `tefFAILURE` ante cualquier problema:

1. El ledger debe ser un flag ledger (`isFlagLedger(view().seq())`, múltiplo de 256).
2. Deben estar presentes `UNLModifyDisabling` (solo 0 o 1), `LedgerSequence` y `UNLModifyValidator`.
3. `LedgerSequence` debe coincidir exactamente con el índice del ledger que se está cerrando.
4. `UNLModifyValidator` debe ser una clave pública válida (`publicKeyType`).
5. Lee (o crea) el objeto `NegativeUNL` y mira si el validador ya está en `DisabledValidators`.
6. Para deshabilitar: no puede haber ya un `ValidatorToDisable` pendiente, el validador no puede ser el mismo que un `ValidatorToReEnable` pendiente y no puede estar ya en la lista. Si todo cuadra, escribe `ValidatorToDisable`.
7. Para rehabilitar: simétrico. No puede haber ya un `ValidatorToReEnable`, no puede coincidir con `ValidatorToDisable` y el validador **debe** estar en la lista. Escribe `ValidatorToReEnable`.

De aquí se deduce que en cada flag ledger solo puede haber, como mucho, una propuesta de deshabilitar y una de rehabilitar. La aplicación efectiva (mover el validador a o desde `DisabledValidators`) ocurre al cerrar el siguiente flag ledger, fuera de este transactor.

El amendment [NegativeUNL](/amendments/NegativeUNL) que introdujo todo esto está activo en testnet y el transactor ya no lo consulta.

## Campos clave

- **UNLModifyDisabling** — 1 para proponer deshabilitar, 0 para proponer rehabilitar. Cualquier otro valor es `tefFAILURE`.
- **UNLModifyValidator** — clave pública del validador (hex, la misma que ves en `validators` o en `server_info`), no su dirección ni su dominio.
- **LedgerSequence** — debe ser el índice del flag ledger en el que se incluye.

## Errores habituales

Solo aparecen en los logs de un validador (`N-UNL: applyUNLModify, ...`):

- **tefFAILURE** — cualquiera de las siete comprobaciones anteriores falla: no es flag ledger, `LedgerSequence` incorrecto, clave inválida, propuesta duplicada, deshabilitar a quien ya está listado o rehabilitar a quien no lo está.
- **temINVALID** — se intentó aplicar contra el ledger abierto.
- **temBAD_SRC_ACCOUNT, temBAD_FEE, temBAD_SIGNATURE, temBAD_SEQUENCE** — alguien intentó enviarla desde una cuenta normal.

## Ejemplo

Así aparece en un flag ledger una propuesta de deshabilitar a un validador:

```json
{
  "TransactionType": "UNLModify",
  "Account": "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
  "UNLModifyDisabling": 1,
  "UNLModifyValidator": "ED6E9F1F7A9C5F4B4E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B7C6D5E",
  "LedgerSequence": 20800000,
  "Fee": "0",
  "Sequence": 0,
  "SigningPubKey": ""
}
```

No se puede enviar. Para observar la Negative UNL de testnet usa `ledger_entry` con `nunl: true` o mira el campo `validated_ledger` de `server_info`; lo habitual es que el objeto no exista o esté vacío, porque solo se crea cuando algún validador falla de forma sostenida.

## Relacionado

- [NegativeUNL](/objects/NegativeUNL) — el objeto que modifica.
- [EnableAmendment](/tx/EnableAmendment) y [SetFee](/tx/SetFee) — las otras pseudo-transacciones del transactor `Change`.
- [NegativeUNL](/amendments/NegativeUNL) — amendment que introdujo el mecanismo.
