---
title: fixRmSmallIncreasedQOffers
summary: Elimina del libro las ofertas residuales minúsculas cuya calidad quedaba anormalmente alta tras un cruce parcial.
xrplDocs: https://xrpl.org/resources/known-amendments#fixrmsmallincreasedqoffers
---

## Qué cambia

Cuando una [Offer](/objects/Offer) se cruza parcialmente, puede quedar en el libro un resto con una cantidad muy pequeña. Antes de este fix, ese resto podía tener una calidad (tasa `TakerPays`/`TakerGets`) muy distinta, y notablemente peor, que la de la oferta original, como consecuencia del redondeo al reducir sus cantidades. Al ser una cantidad ínfima, ni las transacciones normales de cruce ni los pagos con paths la retiraban del libro por el cauce habitual con el que se eliminan ofertas totalmente consumidas o sin fondos: quedaba ahí, ocupando ese nivel de precio sin aportar liquidez real.

Con fixRmSmallIncreasedQOffers activo, este tipo de ofertas residuales se detecta y se retira del libro de la misma forma en que ya se retiran las ofertas completamente consumidas o sin fondos, en vez de dejarlas huérfanas en el ledger.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate) y [Payment](/tx/Payment) con paths: al cruzar una oferta, el motor comprueba si el resto resultante entra en este caso y lo elimina.
- [Offer](/objects/Offer): deja de acumular entradas fantasma de cantidad mínima y calidad degradada.

## Estado y contexto

Es un fix de higiene del libro de ofertas: sin él, cruces parciales sucesivos podían dejar el DEX salpicado de ofertas minúsculas con calidad anómala que no se limpiaban solas, complicando la lectura del libro y el cálculo de rutas de pago sobre él.
