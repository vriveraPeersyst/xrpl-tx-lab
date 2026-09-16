---
title: fixReducedOffersV2
summary: Amplía fixReducedOffersV1 con otro caso de redondeo que podía seguir bloqueando el libro de ofertas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixreducedoffersv2
---

## Qué cambia

[fixReducedOffersV1](/amendments/fixReducedOffersV1) corrigió el redondeo al reducir el tamaño de una oferta tras un cruce parcial para que su calidad nunca empeorase, pero dejaba sin cubrir un caso adicional en el que el mismo problema podía volver a producirse. fixReducedOffersV2 ajusta ese caso restante.

En el código actual, el efecto es visible en la liquidez de AMM usada dentro de un path: `AMMOffer::limitIn` usa `quality().ceilInStrict(...)` en lugar de `quality().ceilIn(...)` cuando el amendment está activo y la ruta pasa por más de un pool o combina AMM con el libro de ofertas (`multiPath()`), lo que aplica un redondeo estricto que evita generar una oferta sintética de AMM con peor calidad que la teórica del pool.

## Transacciones y objetos afectados

- [Payment](/tx/Payment) con paths que combinan un [AMM](/objects/AMM) con otras fuentes de liquidez (otro AMM o el libro de ofertas): afecta al tamaño calculado de la oferta sintética que representa al pool en ese tramo de la ruta.
- [OfferCreate](/tx/OfferCreate) con `tfSell`/paths que crucen liquidez de AMM.

## Estado y contexto

Es la continuación directa de fixReducedOffersV1: mismo problema de fondo (una oferta reducida por redondeo puede quedar con peor calidad que la original y bloquear ese nivel de precio en el libro), pero aplicado a un segundo caso que el primer fix no cubría, principalmente en rutas con liquidez de AMM.
