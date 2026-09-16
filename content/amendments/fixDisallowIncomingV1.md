---
title: fixDisallowIncomingV1
summary: Corrige que las flags lsfDisallowIncoming* de una cuenta no bloqueaban la creación de nuevas trustlines mediante TrustSet.
xrplDocs: https://xrpl.org/resources/known-amendments#fixdisallowincomingv1
---

## Qué cambia

El amendment [DisallowIncoming](/amendments/DisallowIncoming) añadió flags de cuenta como `asfDisallowIncomingTrustline` para que un emisor pudiera rechazar objetos entrantes no deseados. Sin embargo, su aplicación original tenía un hueco: cuando un usuario creaba una trustline hacia un emisor con `lsfDisallowIncomingTrustline` activada mediante [TrustSet](/tx/TrustSet), la operación se permitía igualmente si la trustline no implicaba un balance en contra del emisor, dejando pasar líneas de confianza que la flag debía impedir. `fixDisallowIncomingV1` corrige ese caso para que `TrustSet` respete la flag también al crear una trustline nueva, no solo en flujos indirectos como el cruce de ofertas.

## Transacciones y objetos afectados

- [TrustSet](/tx/TrustSet): comprueba `lsfDisallowIncomingTrustline` del emisor antes de crear la trustline.
- [AccountRoot](/objects/AccountRoot): las flags `lsfDisallowIncomingTrustline`, `lsfDisallowIncomingNFTokenOffer`, `lsfDisallowIncomingCheck` y `lsfDisallowIncomingPayChan` pasan a aplicarse de forma consistente en todos los caminos de creación de objeto.

## Estado y contexto

Corrige un bug de la implementación inicial de DisallowIncoming: sin este fix, una cuenta que había activado `asfDisallowIncomingTrustline` para evitar acumular líneas de confianza no solicitadas podía terminar recibiéndolas igualmente vía TrustSet directo. En el código actual el amendment está retirado (`XRPL_RETIRE_FIX(DisallowIncomingV1)` en `features.macro`): el comportamiento corregido es ya el único existente y no queda rama de código condicionada a él, salvo referencias en tests que documentan el bug original.
