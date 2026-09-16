---
title: Flow
summary: Sustituye el motor de pagos antiguo por "Flow", el motor moderno que calcula rutas y ejecuta pagos y cruces de ofertas en XRPL.
xrplDocs: https://xrpl.org/resources/known-amendments#flow
---

## Qué cambia

Flow reemplaza por completo el motor de pagos original de rippled (conocido como "payment engine" o motor de paths clásico) por una implementación nueva pensada para ser más predecible, más fácil de razonar y más eficiente. El motor antiguo calculaba paths de forma bastante opaca y tenía casos límite conocidos con resultados difíciles de explicar (cantidades entregadas mayores o menores de lo esperado, paths que fallaban sin motivo claro). Flow reescribe ese cálculo como una composición de "strands": cada strand es una secuencia de pasos (order book, trustline) que el pago puede atravesar, y el motor combina varios strands en paralelo para maximizar la cantidad entregada al mismo coste, similar a un algoritmo de flujo máximo en un grafo.

El resultado es el mismo tipo de operación que antes —enviar un pago que puede atravesar varios order books y trustlines, o convertir una moneda en otra sobre la marcha— pero calculado de forma más rigurosa, con mejor manejo de `SendMax`, `DeliverMin` y de los flags de parcialidad de [Payment](/tx/Payment).

## Transacciones y objetos afectados

- [Payment](/tx/Payment): todo pago con paths (cross-currency o que atraviesa varios saltos) se calcula ahora mediante Flow en lugar del motor antiguo.
- [OfferCreate](/tx/OfferCreate): el cruce de ofertas al crear una oferta nueva reutiliza la misma maquinaria de Flow para determinar cuánto se cruza contra el libro de órdenes.
- Objetos [Offer](/objects/Offer) y [RippleState](/objects/RippleState) (trustlines), que son los nodos que Flow recorre al construir strands.

## Estado y contexto

Antes de Flow, rippled usaba el llamado "legacy path engine", con una lógica acumulada desde los primeros años de Ripple que era difícil de mantener y de auditar. Flow se diseñó explícitamente para reemplazarlo con un algoritmo más formal y testeable, y se convirtió en la base de todas las mejoras posteriores del DEX de XRPL: [FlowCross](/amendments/FlowCross) y [FlowSortStrands](/amendments/FlowSortStrands) son extensiones directas suyas, y funcionalidades como el AMM o [PermissionedDEX](/amendments/PermissionedDEX) dan por hecho que el motor de ejecución es Flow. Es, junto con el propio libro de órdenes, el núcleo del DEX nativo de XRPL.
