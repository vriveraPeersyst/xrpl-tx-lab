---
title: BatchV1_1
summary: Permite agrupar varias transacciones en un Batch atómico o secuencial; sustituye al amendment Batch original, retirado por un fallo crítico.
xls: XLS-0056
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0056-batch
xrplDocs: https://xrpl.org/resources/known-amendments#batchv1_1
introducedIn: 3.3.0
---

## Qué cambia

Introduce la transacción `Batch`, que envuelve hasta ocho transacciones internas (`RawTransactions`) y las aplica en un mismo ledger según el modo elegido con flags: `tfAllOrNothing` (todas o ninguna), `tfOnlyOne` (se aplica la primera que tenga éxito), `tfUntilFailure` (en orden hasta el primer fallo) o `tfIndependent` (cada una por su cuenta). Las transacciones internas llevan el flag `tfInnerBatchTxn`, no van firmadas ni pagan `Fee` propia: la firma y la comisión las aporta la transacción externa. Si las internas pertenecen a varias cuentas, cada una firma el conjunto en `BatchSigners`.

En `Transactor::preflight` una transacción con `tfInnerBatchTxn` que llegue fuera de un Batch se rechaza con `temINVALID_FLAG` si el amendment no está activo, y con `temINVALID_INNER_BATCH` si no tiene `parentBatchId`. Como las internas se aplican sobre una vista cerrada, varios códigos `tel*` que no son válidos ahí se sustituyen por `tef*` (por ejemplo `tefNO_DST_PARTIAL` o `tefBAD_PATH_COUNT` en `Payment::preclaim`). Además, el amendment activa la regla de que las pseudocuentas no pueden firmar transacciones (`tefBAD_AUTH`).

## Transacciones y objetos afectados

- Nueva: [Batch](/tx/Batch).
- Modificadas: cualquier transactor acepta ser transacción interna; [Payment](/tx/Payment) y [LoanSet](/tx/LoanSet) tienen reglas específicas para ese caso (LoanSet interno sin `Counterparty` devuelve `temBAD_SIGNER`).
- No crea objetos nuevos; consume un `Sequence` por cada transacción interna de la cuenta.

## Estado y contexto

Hasta ahora no había forma de garantizar que dos operaciones ocurrieran juntas: si una dApp necesitaba crear una trust line y pagar en el mismo instante, dependía de dos envíos separados. La XLS-56 aporta atomicidad para flujos como swaps entre dos partes, creación de cuenta y configuración inicial, o mint y venta.

El amendment original `Batch` llegó en rippled 2.5.0 pero se desactivó en 3.1.1 al descubrirse un fallo crítico (ver también `fixBatchInnerSigs`). BatchV1_1 es la reimplementación corregida con un ID de amendment nuevo.
