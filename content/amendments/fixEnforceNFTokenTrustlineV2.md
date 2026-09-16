---
title: fixEnforceNFTokenTrustlineV2
summary: Amplía fixEnforceNFTokenTrustline comprobando también que el emisor del token de pago autoriza recibirlo, y ajusta el cálculo de fees rotas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixenforcenftokentrustlinev2
---

## Qué cambia

Sobre la base de [fixEnforceNFTokenTrustline](/amendments/fixEnforceNFTokenTrustline), este amendment añade en [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) una llamada a `checkTrustlineAuthorized` sobre el minter del NFT: si el emisor del token de pago exige autorización (`lsfRequireAuth`) y el minter no está autorizado, la transacción falla igual que fallaría un pago normal a una cuenta no autorizada, en vez de forzar igualmente el cobro de la comisión. También aplica esta comprobación al calcular y repartir el `brokerFee` en ofertas casadas ("brokered"), y ajusta `NFTokenHelpers` para que el reparto de fees no nativas tenga en cuenta si el amendment está activo.

## Transacciones y objetos afectados

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): valida autorización del minter además de la existencia de trustline, tanto en el pago directo como en el `brokerFee`.
- [RippleState](/objects/RippleState): respeta `lsfRequireAuth` también en el cobro automático del `TransferFee` de un NFT.

## Estado y contexto

V1 cerró el hueco de trustlines creadas sin consentimiento, pero dejaba abierto un caso relacionado: un emisor podía exigir autorización explícita (`RequireAuth`) para recibir su propio token, y el cobro automático de la comisión de transferencia de un NFT lo saltaba igualmente. V2 alinea ese cobro con las mismas reglas de autorización que ya se aplican a cualquier pago normal en ese token, cerrando la vía que quedaba para acreditar fondos a una cuenta sin su autorización.
