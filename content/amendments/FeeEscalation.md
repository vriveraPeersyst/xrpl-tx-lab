---
title: FeeEscalation
summary: Cambia el mecanismo de transaction cost para que suba automáticamente con la carga de la red en lugar de ser un valor fijo.
xrplDocs: https://xrpl.org/resources/known-amendments#feeescalation
---

## Qué cambia

Antes de FeeEscalation, el coste de una transacción era un valor de red prácticamente fijo (la `base fee`), independiente de cuánta demanda hubiera en ese momento. Con este amendment, cada validador calcula un coste mínimo por transacción en función de cuántas transacciones compiten ya por entrar en el ledger abierto: cuantas más transacciones en cola, mayor el coste necesario para que la tuya se incluya. El coste se expresa como un múltiplo de la `base fee` y escala de forma no lineal con la ocupación del ledger, penalizando fuertemente los picos de tráfico.

Esto convierte el campo `Fee` de cada transacción en un mecanismo de puja implícita: quien paga más que el mínimo del momento tiene prioridad para entrar en el siguiente ledger cerrado, mientras que transacciones con `Fee` bajo pueden quedarse fuera repetidamente durante congestión y acabar expirando si llevan `LastLedgerSequence`.

## Transacciones y objetos afectados

Afecta al campo `Fee`, presente en todas las transacciones, y a cómo cada `rippled` ordena su cola local de transacciones candidatas antes de proponerlas para el consenso. No introduce ni modifica objetos del ledger.

## Estado y contexto

Antes de este amendment, un atacante podía saturar la red con transacciones baratas y bloquear el procesamiento de las legítimas, ya que todas costaban lo mismo sin importar la congestión. FeeEscalation introduce un mercado de fees dentro de cada servidor: el coste sube solo cuando hace falta, protegiendo la red frente a spam sin penalizar el uso normal en momentos de baja demanda. Está retirado (`XRPL_RETIRE_FEATURE` en `features.macro`): el mecanismo de fee escalation es hoy el único que existe en la red. No debe confundirse con [XRPFees](/amendments/XRPFees), que ajusta valores concretos de reserva y fee base, no el mecanismo de escalado en sí.
