---
title: fixCleanup3_4_0
summary: Agrupa en un único amendment el conjunto de correcciones de comportamiento acumuladas para la versión 3.4.0 de rippled.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_4_0
introducedIn: 3.4.0
---

## Qué cambia

Tercera entrega de la serie de amendments "paraguas" tras [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) y [fixCleanup3_3_0](/amendments/fixCleanup3_3_0). Activa varias correcciones dispersas de cara a rippled 3.4.0, entre ellas cambios en `RippleStateHelpers`, `CredentialHelpers` y `NFTokenHelpers`, en `LendingHelpers` y `LoanSet`/`LoanManage`/`LoanPay`, en `EscrowFinish`/`EscrowCancel`, `MPTokenAuthorize`, `NFTokenAcceptOffer`, `SponsorshipTransfer` y en el motor de pagos (`OfferStream`, `Payment`). También modifica el esquema de firmas: con `fixCleanup3_4_0` activo, una firma en `CounterpartySignature` o `SponsorSignature` cubre un prefijo distinto al de la firma propia de la transacción (`CPT`/`CPM` y `SPN`/`SPM` respectivamente), de modo que ya no se puede mover una firma de un rol a otro.

## Transacciones y objetos afectados

[EscrowFinish](/tx/EscrowFinish), [EscrowCancel](/tx/EscrowCancel), [MPTokenAuthorize](/tx/MPTokenAuthorize), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [Payment](/tx/Payment), y transacciones con `CounterpartySignature` o `SponsorSignature` como las de `Sponsor` y `LoanSet`/`LoanManage`/`LoanPay`.

## Estado y contexto

Como el resto de la serie, no responde a una única propuesta de diseño sino al empaquetado periódico de correcciones de bugs de distintos subsistemas bajo un solo amendment votable por versión. La API-CHANGELOG de rippled documenta explícitamente el cambio de prefijos de firma como parte visible de este amendment, dado que afecta a clientes que construyen firmas fuera de rippled.
