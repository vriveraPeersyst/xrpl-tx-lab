---
title: Checks
summary: Introduce los cheques: pagos diferidos que el destinatario cobra cuando quiere, hasta un importe máximo.
xrplDocs: https://xrpl.org/resources/known-amendments#checks
introducedIn: 0.90.0
---

## Qué cambia

Añade el objeto `Check` y tres transacciones para gestionarlo. Un cheque funciona como uno de papel: el emisor firma `CheckCreate` con un importe máximo (`SendMax`) y un destinatario; el dinero no se mueve hasta que el destinatario envía `CheckCash`, indicando `Amount` exacto o `DeliverMin`. Si en ese momento el emisor no tiene saldo o liquidez, el cobro falla pero el cheque permanece en el ledger para intentarlo más tarde. Emisor o destinatario pueden cancelarlo con `CheckCancel`; si tiene `Expiration` y ha vencido, cualquiera puede cancelarlo.

Introduce el código `tecEXPIRED` para intentos de crear un cheque ya caducado.

## Transacciones y objetos afectados

- Nuevas: [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash) y [CheckCancel](/tx/CheckCancel).
- Nuevo objeto [Check](/objects/Check), que consume una unidad de owner reserve del emisor.
- Interacción con [DepositAuth](/amendments/DepositAuth): una cuenta con autorización de depósito puede recibir fondos cobrando cheques, porque la transacción la envía ella misma.

## Estado y contexto

Los pagos del XRPL son *push*: el emisor decide el momento exacto y no puede enviar a cuentas que exigen autorización. Los cheques convierten el flujo en *pull*, lo que resuelve varios casos: negocios que solo aceptan fondos tras hacer sus comprobaciones, pagos condicionados a que el receptor los acepte y liquidación de facturas donde el importe final lo fija el cobrador dentro de un máximo.

Está retirado en rippled: forma parte del protocolo base. El amendment posterior [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) eliminó la necesidad de crear la trust line antes de cobrar un cheque de token.
