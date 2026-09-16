---
title: fixEnforceNFTokenTrustline
summary: Corrige que aceptar una oferta de NFToken con transfer fee pudiera crear una trustline no deseada para el emisor del NFT.
xrplDocs: https://xrpl.org/resources/known-amendments#fixenforcenftokentrustline
---

## Qué cambia

Cuando un [NFToken](/objects/NFToken) tiene un `TransferFee` distinto de cero y se paga en un token emitido (no en XRP), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) tiene que enviar esa comisión al emisor del NFT (el "minter"). Antes de este fix, si el minter no tenía trustline con el emisor del token de pago, rippled se la creaba automáticamente para poder acreditarle la comisión, generándole una obligación de reserva y una línea de confianza que no había pedido. Con `fixEnforceNFTokenTrustline` activo, en su lugar la transacción falla con `tecNO_LINE` cuando el NFT no lleva la flag `tfTransferable`/`kFlagCreateTrustLines` que autoriza esa creación automática, el minter no es el propio emisor del token de pago, y no existe ya una trustline entre ambos.

## Transacciones y objetos afectados

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): añade la comprobación de trustline antes de liquidar el `TransferFee`.
- [RippleState](/objects/RippleState): deja de crearse implícitamente para el minter en este flujo.

## Estado y contexto

Corrige un bug de la implementación de NFTs con transfer fee: la creación automática de trustlines sin consentimiento del titular contradice el principio general de XRPL de que las trustlines (y su coste de reserva) las decide explícitamente cada cuenta. [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) amplía después esta corrección añadiendo también la comprobación de que el emisor del token de pago autoriza recibirlo.
