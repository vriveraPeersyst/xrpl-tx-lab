---
title: fixFillOrKill
summary: Corrige el cruce de ofertas con la flag tfFillOrKill para que no se anulen indebidamente cuando el TakerGets no se gasta por completo.
xrplDocs: https://xrpl.org/resources/known-amendments#fixfillorkill
---

## Qué cambia

Una [OfferCreate](/tx/OfferCreate) con `tfFillOrKill` debe ejecutarse por completo o no ejecutarse en absoluto. El motor de cruce de ofertas (`flowCross`, en `StrandFlow`) manejaba mal esta combinación cuando también estaba presente `tfSell`: la implementación previa exigía que se gastase la totalidad del `TakerGets` de la oferta entrante para darla por satisfecha, aunque con `tfFillOrKill` sin `tfSell` lo único obligatorio es que el propietario de la oferta contraria reciba la totalidad de su `TakerPays`, sin necesidad de agotar el `TakerGets`. Eso provocaba que ofertas `FillOrKill` válidas se anulasen (`tecPATH_PARTIAL` o eliminación de la oferta) cuando en realidad se habían podido completar. Con `fixFillOrKill` activo, el motor distingue ambos casos: sin `tfSell`, basta con entregar el `TakerPays` completo; con `tfSell`, sigue exigiéndose gastar el `TakerGets` completo.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate): cambia la condición de éxito/fracaso al cruzar una oferta con `tfFillOrKill`.
- [Offer](/objects/Offer): afecta a qué ofertas sobreviven o se retiran durante el cruce.

## Estado y contexto

Corrige un bug de interpretación de las flags `tfFillOrKill`/`tfSell` en el motor de pagos (`flowCross`), que podía rechazar de forma incorrecta ofertas "todo o nada" perfectamente ejecutables cuando no se combinaban con `tfSell`. El fix hace que el comportamiento coincida con la semántica documentada de la flag.
