---
title: ImmediateOfferKilled
summary: Cambia el código de resultado de una OfferCreate con tfImmediateOrCancel que no cruza con nada, de tesSUCCESS a tecKILLED.
xrplDocs: https://xrpl.org/resources/known-amendments#immediateofferkilled
---

## Qué cambia

El flag `tfImmediateOrCancel` en [OfferCreate](/tx/OfferCreate) pide que la oferta se cruce inmediatamente contra el libro de órdenes y, si no puede cruzar (total o parcialmente) en el momento, se cancele sin dejar remanente en el ledger. Antes de este amendment, cuando una oferta `tfImmediateOrCancel` no cruzaba nada en absoluto, la transacción devolvía igualmente `tesSUCCESS`: desde el punto de vista del código de resultado parecía haber tenido éxito, aunque en la práctica no hubiera pasado nada.

Con ImmediateOfferKilled activo, ese mismo caso —ninguna cantidad cruzada— devuelve `tecKILLED` en lugar de `tesSUCCESS`. La transacción se sigue incluyendo en el ledger (paga la comisión, como cualquier resultado `tec`), pero el código de resultado refleja correctamente que la intención de la oferta no se cumplió.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate): cambia el resultado devuelto cuando `tfImmediateOrCancel` está activo y no hay cruce alguno.
- No crea ni modifica el objeto [Offer](/objects/Offer), porque en este caso concreto nunca se llega a crear la oferta en el ledger.

## Estado y contexto

Antes del fix, un cliente que enviara una oferta IOC sin liquidez disponible para cruzar veía `tesSUCCESS` y tenía que inspeccionar los metadatos de la transacción para darse cuenta de que en realidad no se había ejecutado nada, un comportamiento confuso para quien integra trading automatizado sobre el DEX de XRPL. `tecKILLED` hace explícito ese resultado en el propio código de la transacción, sin necesidad de parsear metadatos para distinguir "se cruzó algo" de "no se cruzó nada".
