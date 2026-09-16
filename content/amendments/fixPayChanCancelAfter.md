---
title: fixPayChanCancelAfter
summary: Rechaza crear un PaymentChannel cuyo CancelAfter ya esté en el pasado en el momento de la creación.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpaychancancelafter
---

## Qué cambia

[PaymentChannelCreate](/tx/PaymentChannelCreate) admite un campo opcional `CancelAfter`: una marca de tiempo a partir de la cual cualquiera puede cerrar el canal. Antes del fix, no se comprobaba esa fecha en el momento de crear el canal, así que era posible abrir un [PayChannel](/objects/PayChannel) con un `CancelAfter` ya vencido respecto al `parentCloseTime` del ledger: un canal que nacía ya "caducado", sin haber podido usarse nunca para nada.

Con `fixPayChanCancelAfter` activo, `PaymentChannelCreate::doApply` compara el `CancelAfter` de la transacción con el `parentCloseTime` del ledger en el momento de aplicarse; si `CancelAfter` ya ha pasado, la transacción falla con `tecEXPIRED` en lugar de crear un canal inútil desde el primer momento.

## Transacciones y objetos afectados

- [PaymentChannelCreate](/tx/PaymentChannelCreate): comprobación añadida en `doApply` antes de insertar el objeto.
- [PayChannel](/objects/PayChannel): evita que se lleguen a crear instancias con `CancelAfter` ya vencido.

## Estado y contexto

Es un fix defensivo de validación: sin él, un cliente podía gastar la reserva y la comisión de una transacción en abrir un canal de pago que, por un `CancelAfter` mal calculado o ya pasado, era inservible desde el instante de su creación y solo podía cerrarse. El amendment está retirado en el código; la comprobación forma hoy parte permanente de `PaymentChannelCreate`.
