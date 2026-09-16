---
title: FlowSortStrands
summary: Mejora el orden en que el motor Flow evalúa los distintos strands (rutas) de un pago con paths para obtener mejores resultados de forma más eficiente.
xrplDocs: https://xrpl.org/resources/known-amendments#flowsortstrands
---

## Qué cambia

Cuando un [Payment](/tx/Payment) especifica varios `Paths` posibles, el motor [Flow](/amendments/Flow) descompone cada uno en un strand (una secuencia concreta de order books y trustlines) y los evalúa para decidir cuánto puede entregar cada uno al mejor precio. El orden en que Flow procesa esos strands importa: procesarlos en un orden subóptimo puede hacer que se agote liquidez barata en un strand secundario antes de aprovecharla desde el strand principal, o forzar a Flow a repetir iteraciones para converger al mismo resultado.

FlowSortStrands cambia el criterio de ordenación con el que Flow decide en qué secuencia probar los strands, priorizando aquellos con mejor calidad de precio estimada primero. Esto reduce el número de iteraciones necesarias para que el cálculo converja y hace más probable que el resultado final sea el óptimo (la mayor cantidad entregada al mejor precio agregado posible), en lugar de depender del orden en que el remitente listó los paths.

## Transacciones y objetos afectados

- [Payment](/tx/Payment): pagos con múltiples `Paths` se benefician de una evaluación más eficiente y con mejores resultados.
- [OfferCreate](/tx/OfferCreate): el cruce de una oferta contra varios niveles de precio del libro también pasa por el mismo ordenamiento de strands.
- No introduce objetos ni campos nuevos; es un cambio en el algoritmo interno de [Flow](/amendments/Flow).

## Estado y contexto

Es una optimización de rendimiento y calidad de resultado sobre Flow, no un cambio de comportamiento visible para quien construye una transacción: los campos de entrada y salida de `Payment` no cambian, pero la cantidad realmente entregada o el coste efectivo de un pago con paths puede variar ligeramente respecto al comportamiento previo, siempre a favor del remitente. Junto con [FlowCross](/amendments/FlowCross), termina de consolidar el motor Flow como sustituto completo del motor de paths original.
