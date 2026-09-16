---
title: fixQualityUpperBound
summary: Corrige el cálculo de una cota superior de calidad usada al estimar pasos de pago con conversión de moneda.
xrplDocs: https://xrpl.org/resources/known-amendments#fixqualityupperbound
---

## Qué cambia

El motor de pagos con paths estima, para cada paso de una ruta que cambia de moneda, una cota superior de "calidad" (la mejor tasa de cambio posible, entrada/salida) para descartar de antemano rutas que no pueden mejorar el resultado ya encontrado. fixQualityUpperBound corrige un error en ese cálculo de la cota, que podía quedar mal estimada para algunos pasos de conversión de moneda.

Según la documentación de xrpl.org, el código afectado formaba parte de una ruta de estimación que en la práctica no llegaba a ejecutarse en el motor de pagos vigente, por lo que el fix no tiene impacto observable en el resultado de las transacciones: corrige el bug en el código, pero no cambia el comportamiento de ningún [Payment](/tx/Payment) real.

## Transacciones y objetos afectados

- [Payment](/tx/Payment) con paths que atraviesan más de una moneda: el cálculo interno de la cota de calidad, sin efecto observable en el resultado final.
- [OfferCreate](/tx/OfferCreate): comparte el motor de cálculo de calidad usado para cruzar y encadenar ofertas.

## Estado y contexto

Es uno de los fixes de mantenimiento del motor de pagos: corrige una fórmula interna sin cambiar el resultado de las transacciones, como documentación de rippled deja constancia explícita de que "no tiene impacto conocido en el procesamiento de transacciones". Sirve como saneamiento de código y como base más correcta para futuros cambios en el cálculo de calidad de las rutas.
