---
title: fixTakerDryOfferRemoval
summary: Corrige el autobridging para que retire del libro las ofertas secas en vez de dejarlas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtakerdryofferremoval
---

## Qué cambia

El motor de cruce de ofertas usa autobridging para encadenar dos ofertas a través de XRP cuando no hay una oferta directa igual de buena entre dos tokens. Al recorrer el libro, puede encontrarse con una oferta "seca" (dry): una oferta cuyo emisor ya no tiene fondos o línea de confianza suficiente para entregar lo que ofrece, aunque el objeto siga en el ledger. Antes de este fix, el taker podía tratar esas ofertas secas como simplemente no cruzables y saltárselas sin retirarlas del libro.

Con fixTakerDryOfferRemoval activo, el taker retira del libro las ofertas secas que encuentra al recorrerlo durante el autobridging, igual que ya se hace en el cruce normal de ofertas cuando se detecta que una oferta no puede entregar fondos.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate) y [Payment](/tx/Payment) con paths que usan autobridging a través de XRP.
- [Offer](/objects/Offer): las ofertas sin fondos encontradas durante ese recorrido se eliminan del ledger en vez de quedar como ruido.

## Estado y contexto

Sin este fix, el libro de ofertas podía acumular ofertas secas que el autobridging identificaba pero no limpiaba, obligando a recorrerlas una y otra vez en cruces sucesivos sin que aportaran liquidez real. El fix alinea el comportamiento del autobridging con el del cruce directo de ofertas.
