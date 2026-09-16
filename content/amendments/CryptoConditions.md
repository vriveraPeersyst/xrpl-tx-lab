---
title: CryptoConditions
summary: Amendment histórico que añadía crypto-conditions a los pagos suspendidos (SusPay); sin efecto propio desde que Escrow lo sustituyó.
xrplDocs: https://xrpl.org/resources/known-amendments#cryptoconditions
introducedIn: 0.50.0
---

## Qué cambia

Por sí solo, nada. CryptoConditions se diseñó como complemento del amendment `SusPay` (pagos suspendidos): añadía la posibilidad de bloquear un pago con una *crypto-condition* del Interledger Protocol (un hash PREIMAGE-SHA-256) y liberarlo presentando el *fulfillment*. `SusPay` nunca llegó a activarse y fue reemplazado por [Escrow](/amendments/Escrow), que ya incorporaba ese soporte de serie, así que este amendment quedó vacío de contenido.

## Transacciones y objetos afectados

- Ninguna de forma directa. La funcionalidad que describía vive hoy en los campos `Condition` de [EscrowCreate](/tx/EscrowCreate) y `Condition`/`Fulfillment` de [EscrowFinish](/tx/EscrowFinish), sobre el objeto [Escrow](/objects/Escrow).

## Estado y contexto

Entre 2016 y 2017 Ripple iteró varias veces el diseño de los pagos condicionados: primero `SusPay` (0.31.0), después CryptoConditions (0.50.0) para añadir las condiciones criptográficas de Interledger, y finalmente `Escrow` (0.60.0), que fusionó ambos en un único amendment con nombres de transacción definitivos. Como los IDs de amendment ya estaban publicados en software distribuido, no se podían modificar: se dejaron activos y se retiraron del código en versiones posteriores.

Hoy aparece en la lista de amendments retirados de rippled (`XRPL_RETIRE_FEATURE`). Solo tiene interés histórico: si ves su ID en un ledger antiguo, ya sabes que no cambió ninguna regla. Su hermano [CryptoConditionsSuite](/amendments/CryptoConditionsSuite), que pretendía ampliar los tipos de condición, está en la misma situación.
