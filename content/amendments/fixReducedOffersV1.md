---
title: fixReducedOffersV1
summary: Corrige el redondeo al reducir el tamaño de una oferta para que su calidad nunca empeore la original.
xrplDocs: https://xrpl.org/resources/known-amendments#fixreducedoffersv1
---

## Qué cambia

Cuando el motor Flow de pagos con paths cruza parcialmente una [Offer](/objects/Offer), calcula una versión "reducida" de esa oferta con menos cantidad en ambos lados. Ese cálculo implica redondear, y antes de este fix el redondeo podía producir una oferta reducida con una calidad (tasa `TakerPays`/`TakerGets`) ligeramente peor que la de la oferta original. Una oferta reducida con peor calidad que la mejor oferta disponible en el libro bloqueaba efectivamente ese nivel de precio: quedaba ahí sin poder cruzarse, pero tampoco se retiraba.

Con fixReducedOffersV1 activo, el redondeo se ajusta para que la calidad de la oferta reducida sea siempre igual o mejor que la de la oferta original, de modo que nunca empeora respecto al precio que el creador de la oferta aceptó originalmente.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate) y [Payment](/tx/Payment) con paths: el cálculo del tamaño reducido de una oferta al cruzarla parcialmente.
- [Offer](/objects/Offer): el objeto que queda en el ledger tras un cruce parcial.

## Estado y contexto

Corrige un bug del motor Flow que podía dejar libros de ofertas efectivamente bloqueados en un nivel de precio por una oferta residual con peor calidad de la que debería. [fixReducedOffersV2](/amendments/fixReducedOffersV2) amplía esta misma corrección a otro caso de redondeo que este fix no cubría.
