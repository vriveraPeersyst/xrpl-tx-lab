---
title: CheckCashMakesTrustLine
summary: CheckCash crea automáticamente la trust line necesaria al cobrar un cheque de un token emitido, sin TrustSet previo.
xrplDocs: https://xrpl.org/resources/known-amendments#checkcashmakestrustline
introducedIn: 1.8.0
---

## Qué cambia

Cuando cobras un [Check](/objects/Check) de un token emitido y todavía no tienes una trust line con el emisor, `CheckCash` la crea por ti con límite 0, igual que hace `OfferCreate` cuando compras un token en el DEX. Antes, el cobro fallaba con `tecNO_LINE` y tenías que enviar un `TrustSet` aparte.

La trust line automática cuenta como objeto propio del destinatario, así que debes cubrir el owner reserve adicional; si no, `CheckCash` falla con `tecNO_LINE_INSUF_RESERVE`. Los cheques en XRP no se ven afectados.

## Transacciones y objetos afectados

- Modificada: [CheckCash](/tx/CheckCash).
- Objetos: puede crear una [RippleState](/objects/RippleState) al liquidar un [Check](/objects/Check).

## Estado y contexto

Los cheques se pensaron como una forma de "pago diferido" en la que el receptor decide cuándo cobrar. Obligar a preparar una trust line antes de cobrar rompía esa idea, sobre todo para usuarios que reciben un token por primera vez. Este cambio alinea `CheckCash` con el comportamiento del DEX: aceptar un activo implica consentimiento para tener la línea. Sigue sin ser posible forzar a nadie a recibir un token que no quiere, porque el cobro lo inicia siempre el destinatario.

Este amendment está retirado en rippled: su comportamiento forma parte del protocolo base y ya no se puede desactivar.
