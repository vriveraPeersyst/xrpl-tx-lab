---
title: fixPreviousTxnID
summary: Añade PreviousTxnID y PreviousTxnLgrSeq a tipos de objeto del ledger que antes no los llevaban.
xrplDocs: https://xrpl.org/resources/known-amendments#fixprevioustxnid
---

## Qué cambia

Casi todos los objetos del ledger guardan `PreviousTxnID` (hash de la última transacción que los modificó) y `PreviousTxnLgrSeq` (el ledger en que ocurrió), lo que permite reconstruir su historial recorriendo hacia atrás desde el estado actual. Antes de este fix, cinco tipos de objeto quedaban fuera de esa regla: `DIR_NODE`, `AMENDMENTS`, `FEE_SETTINGS`, `NEGATIVE_UNL` y `AMM`. `STLedgerEntry::isThreadedType` excluía explícitamente esos tipos aunque tuvieran el campo `PreviousTxnID` en su plantilla, así que nunca se les actualizaba ni se les enlazaba en la cadena de transacciones de la cuenta.

Con fixPreviousTxnID activo, esa exclusión desaparece: los cinco tipos pasan a actualizar `PreviousTxnID`/`PreviousTxnLgrSeq` igual que el resto de objetos cada vez que una transacción los modifica.

## Transacciones y objetos afectados

- [DirectoryNode](/objects/DirectoryNode): ahora registra su última modificación.
- Objetos de tipo `AMENDMENTS`, `FEE_SETTINGS`, `NEGATIVE_UNL` y `AMM`, que hasta ahora carecían de rastro de la transacción que los tocó por última vez.

## Estado y contexto

Sin este fix, herramientas y exploradores que reconstruyen el historial de un objeto siguiendo `PreviousTxnID` se topaban con un salto: esos cinco tipos de objeto nunca apuntaban a la transacción que realmente los había cambiado. El fix no altera reglas de negocio, solo completa el rastro histórico para que sea consistente en todo el ledger.
