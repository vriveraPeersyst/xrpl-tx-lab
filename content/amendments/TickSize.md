---
title: TickSize
summary: Permite a un emisor fijar TickSize en AccountSet para redondear la calidad de las ofertas de su token a un número de dígitos significativos.
xrplDocs: https://xrpl.org/resources/known-amendments#ticksize
---

## Qué cambia

Añade el campo `TickSize` a [AccountSet](/tx/AccountSet): un emisor de tokens puede fijar entre 3 y 15 dígitos significativos (o 0 para desactivarlo) como la precisión con la que se expresa la "calidad" (el precio, `TakerPays`/`TakerGets`) de las ofertas que involucran su token en el libro de órdenes. El valor se guarda en el `AccountRoot` del emisor.

Cuando una oferta se cruza o se inserta en el libro, el motor del DEX redondea la calidad de la oferta al número de dígitos significativos que marca el `TickSize` del emisor del token implicado (si hay dos tokens emitidos por cuentas distintas con `TickSize` diferente en la misma oferta, se usa el más restrictivo, el de menos dígitos). Esto agrupa ofertas que antes tendrían precios distintos por diferencias mínimas en el último decimal dentro del mismo "tick" de precio, de modo que compiten por orden de llegada en vez de por fracciones de precio insignificantes.

## Transacciones y objetos afectados

- [AccountSet](/tx/AccountSet): nuevo campo `TickSize`.
- [AccountRoot](/objects/AccountRoot): almacena el `TickSize` configurado por el emisor.
- [OfferCreate](/tx/OfferCreate): la calidad de la oferta se redondea según el `TickSize` del emisor del token antes de insertarse en el libro de ofertas.

## Estado y contexto

Sin un tick mínimo, los market makers pueden mejorar una oferta existente con una diferencia de precio arbitrariamente pequeña (por ejemplo, una unidad en el último decimal representable), lo que en la práctica es una "guerra de céntimos" que no aporta liquidez real y satura el libro de órdenes con ofertas casi idénticas compitiendo por microscópicas ventajas de precio. Fijar un `TickSize` razonable obliga a que una oferta nueva mejore la anterior en un salto de precio significativo para adelantarla, lo que favorece libros de órdenes más profundos y estables sobre el token del emisor.
