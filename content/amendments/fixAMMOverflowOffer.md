---
title: fixAMMOverflowOffer
summary: Corrige un overflow al calcular la oferta sintética que un AMM proyecta contra el libro de órdenes central.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammoverflowoffer
---

## Qué cambia

Cuando un pago o un `OfferCreate` cruza liquidez, el motor de pagos compara la mejor oferta del libro central con la oferta sintética que un [AMM](/objects/AMM) generaría a ese mismo `Quality`. Ese cálculo implica operaciones sobre los balances del pool que, en determinadas combinaciones de balances extremos, podían desbordar el tipo numérico usado internamente y lanzar una excepción `overflow_error` o producir un resultado incorrecto en lugar de simplemente indicar que el AMM no podía ofrecer a esa calidad.

fixAMMOverflowOffer corrige ese cálculo para que, ante esas combinaciones extremas, el motor de rutas trate la situación como "el AMM no tiene una oferta válida en este rango" en vez de desbordar. El efecto práctico es que los pagos que atraviesan pools con balances muy desproporcionados dejan de fallar de forma imprevisible.

## Transacciones y objetos afectados

- [Payment](/tx/Payment) y [OfferCreate](/tx/OfferCreate): al calcular ofertas sintéticas de AMM durante el enrutamiento de pagos (`BookStep`, `AMMLiquidity`).
- [AMM](/objects/AMM): el cálculo de la oferta que el pool proyecta contra el libro de órdenes.

## Estado y contexto

Es una corrección puntual del motor de liquidez de AMM introducido por el amendment [AMM](/amendments/AMM): sin ella, ciertos estados de pool con balances muy desiguales podían provocar fallos internos al enrutar pagos que combinaban liquidez de AMM y del libro central. Está retirado (`XRPL_RETIRE_FIX` en `features.macro`): la corrección es hoy el único comportamiento posible.
