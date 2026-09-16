---
title: fixCheckThreading
summary: Hace que las transacciones de cheques actualicen los metadatos de la cuenta receptora, de modo que aparezcan en su historial.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcheckthreading
introducedIn: 1.5.0
---

## Qué cambia

Cada [AccountRoot](/objects/AccountRoot) guarda `PreviousTxnID` y `PreviousTxnLgrSeq`, que apuntan a la última transacción que modificó la cuenta. Esa cadena ("threading") es lo que permite a `account_tx` recorrer el historial de una cuenta hacia atrás. Antes de este fix, [CheckCreate](/tx/CheckCreate) enlazaba el nuevo [Check](/objects/Check) en el directorio del destinatario pero no actualizaba el `PreviousTxnID` de su `AccountRoot`. Resultado: el receptor no veía en su historial el cheque que le habían emitido, aunque sí aparecía en `account_objects`.

Con fixCheckThreading activo, `CheckCreate` marca también la cuenta destino como modificada (actualiza su threading), y lo mismo hacen [CheckCash](/tx/CheckCash) y [CheckCancel](/tx/CheckCancel) con la contraparte cuando corresponde. El efecto visible es que ambas cuentas tienen la transacción en `account_tx`.

## Transacciones y objetos afectados

- [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel).
- [AccountRoot](/objects/AccountRoot) del destinatario: campos `PreviousTxnID` / `PreviousTxnLgrSeq`.
- [Check](/objects/Check): sin cambios de formato.

## Estado y contexto

Se introdujo en rippled 1.5.0 y está retirado en el código (`XRPL_RETIRE_FIX(CheckThreading)`). Los cheques habían llegado con el amendment Checks en 1.2.0 y este fue el primer ajuste necesario en producción. La misma familia de problemas (objetos que "tocan" una cuenta sin dejar rastro en su historial) se corrigió para canales de pago con [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir).
