---
title: FlowCross
summary: Extiende el motor Flow para que pueda cruzar ofertas del libro de órdenes dentro del propio cálculo de pago, no solo enrutar pagos directos.
xrplDocs: https://xrpl.org/resources/known-amendments#flowcross
---

## Qué cambia

El motor [Flow](/amendments/Flow) original sabía calcular cómo enrutar un pago a través de trustlines y order books existentes, pero el cruce efectivo de ofertas (offer crossing) —la lógica que decide qué ofertas del libro se consumen, en qué orden y por qué cantidad cuando una transacción interactúa con el DEX— vivía todavía en parte fuera de Flow, heredada del motor antiguo. FlowCross mueve esa lógica de cruce dentro del propio cálculo de Flow, de modo que un único pase por los strands resuelve a la vez el enrutamiento y el cruce de ofertas.

Esto es relevante sobre todo para [OfferCreate](/tx/OfferCreate): al crear una oferta nueva, rippled comprueba si cruza con ofertas existentes en el libro contrario antes de dejar un remanente en el ledger. Con FlowCross, esa comprobación de cruce usa la misma maquinaria de strands que un [Payment](/tx/Payment) multi-hop, en lugar de una ruta de código distinta, lo que unifica el comportamiento entre "pagar cruzando el DEX" y "crear una oferta que se cruza al instante".

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate): el cruce de la oferta nueva contra el libro contrario se resuelve mediante Flow.
- [Payment](/tx/Payment): pagos que cruzan varias ofertas en su camino usan el mismo cálculo unificado.
- Objeto [Offer](/objects/Offer): las ofertas parcialmente cruzadas o eliminadas por el cruce se gestionan con la lógica de Flow.

## Estado y contexto

FlowCross es la primera extensión directa de Flow tras su lanzamiento: unifica dos rutas de código que antes calculaban cruces de forma independiente y podían divergir en casos límite (por ejemplo, ofertas de muy baja calidad o cruces que dejan remanentes minúsculos). Al depender de Flow, solo puede activarse junto a él o después. Es un paso intermedio hacia el comportamiento actual del DEX, refinado después por [FlowSortStrands](/amendments/FlowSortStrands).
