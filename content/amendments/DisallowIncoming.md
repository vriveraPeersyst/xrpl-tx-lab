---
title: DisallowIncoming
summary: Cuatro flags de cuenta para bloquear cheques, canales de pago, ofertas de NFT y trust lines entrantes.
xrplDocs: https://xrpl.org/resources/known-amendments#disallowincoming
introducedIn: 1.10.0
---

## Qué cambia

Añade a `AccountSet` los flags `asfDisallowIncomingCheck`, `asfDisallowIncomingPayChan`, `asfDisallowIncomingNFTokenOffer` y `asfDisallowIncomingTrustline`. Cuando el destino tiene activo el flag correspondiente, `CheckCreate`, `PaymentChannelCreate`, `NFTokenCreateOffer` y `TrustSet` fallan con `tecNO_PERMISSION` en lugar de crear el objeto.

El caso de las trust lines tiene un matiz que introdujo `fixDisallowIncomingV1`: si ya existe una línea entre las dos cuentas, el titular del flag puede seguir modificándola; solo se bloquea la creación de líneas nuevas iniciada por terceros.

## Transacciones y objetos afectados

- Modificadas: [AccountSet](/tx/AccountSet), [CheckCreate](/tx/CheckCreate), [PaymentChannelCreate](/tx/PaymentChannelCreate), [NFTokenCreateOffer](/tx/NFTokenCreateOffer) y [TrustSet](/tx/TrustSet).
- Objetos: [AccountRoot](/objects/AccountRoot) (nuevos flags); evita la creación de [Check](/objects/Check), [PayChannel](/objects/PayChannel), [NFTokenOffer](/objects/NFTokenOffer) y [RippleState](/objects/RippleState) no deseados.

## Estado y contexto

Cualquier cuenta podía crear objetos "hacia" otra sin su consentimiento. Aunque el destinatario no paga reserve por ellos, sí le afectan: un cheque o canal pendiente impide borrar la cuenta con [AccountDelete](/tx/AccountDelete), y se usaban en estafas (ofertas de NFT o trust lines con nombres engañosos que aparecen en la wallet de la víctima). Este amendment da al titular un control sencillo y por tipo de objeto. Está retirado en rippled y forma parte del protocolo base.
