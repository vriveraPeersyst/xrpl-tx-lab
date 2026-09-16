---
title: fixMPTDeliveredAmount
summary: Añade el metadato delivered_amount a los Payment directos que mueven un MPT cuando el importe entregado difiere del solicitado.
xrplDocs: https://xrpl.org/resources/known-amendments#fixmptdeliveredamount
---

## Qué cambia

Cuando un [Payment](/tx/Payment) mueve un Multi-Purpose Token (MPT) de forma directa entre emisor y receptor —sin pasar por el motor de pagos genérico— el importe realmente entregado puede diferir del solicitado por dos motivos: se permite un pago parcial (`tfPartialPayment`) o el emisor del MPT cobra una comisión de transferencia (`TransferRate`). En ambos casos, antes del fix la metadata de la transacción no reflejaba ese ajuste: el campo `delivered_amount` no se actualizaba con la cantidad efectivamente enviada al destinatario.

Con `fixMPTDeliveredAmount` activo, tras aplicar `accountSend` para un MPT, si el importe entregado (`amountDeliver`) es distinto del importe solicitado (`dstAmount`) el código llama a `ctx_.deliver(amountDeliver)`, que fija `DeliveredAmount` en la metadata con el valor real entregado. Sin este dato, cualquier servicio que dependa de `delivered_amount` (exchanges, wallets, indexadores) no podía saber cuánto MPT había recibido realmente el destinatario en un pago parcial o con comisión.

## Transacciones y objetos afectados

- [Payment](/tx/Payment): metadata `delivered_amount` cuando el `Amount` es un MPT y se entrega vía transferencia directa.

## Estado y contexto

Corrige una laguna heredada de MPTokensV1: el mecanismo de `delivered_amount` ya existía para XRP e IOU desde hace años (tras el problema histórico de pagos parciales sin metadata), pero no se había replicado para los pagos directos de MPT al añadirse ese tipo de activo.
