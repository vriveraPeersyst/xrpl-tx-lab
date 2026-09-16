---
title: fixNonFungibleTokensV1_2
summary: Agrupa varias correcciones al soporte original de NFT, entre ellas evitar tokens imposibles de quemar y errores en el brokering de ofertas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnonfungibletokensv1_2
---

## Qué cambia

Tras la primera versión del soporte de NFT en XRPL (NonFungibleTokensV1_1), se detectaron varios fallos que este fix corrige de forma conjunta: NFT que quedaban en la práctica imposibles de quemar bajo ciertas condiciones de ofertas asociadas, errores en la lógica de brokering al hacer coincidir una oferta de compra y una de venta a través de un tercero, un tratamiento incorrecto de las comisiones de transferencia (`TransferRate`) del emisor en algunos flujos de venta, y la imposibilidad de que un emisor comerciara con sus propios NFT. También cierra la posibilidad de que, mediante brokering, una misma cuenta ejecutara una operación consigo misma para manipular el estado de sus ofertas.

Al ser un paquete de fixes sobre el mismo subsistema, no introduce campos u objetos nuevos: ajusta la lógica interna de [NFTokenBurn](/tx/NFTokenBurn), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) y [NFTokenCreateOffer](/tx/NFTokenCreateOffer) para que se comporten según lo previsto en los casos límite descritos.

## Transacciones y objetos afectados

- [NFTokenBurn](/tx/NFTokenBurn): garantiza que un NFT con ofertas activas se pueda quemar correctamente.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): corrige el brokering (emparejamiento de oferta de compra y venta por un tercero) y la aplicación de `TransferRate`.
- [NFTokenCreateOffer](/tx/NFTokenCreateOffer): permite al emisor operar con sus propios tokens y evita el auto-trading vía brokering.
- [NFTokenOffer](/objects/NFTokenOffer): objeto sobre el que actúan estas correcciones.

## Estado y contexto

Es un fix de consolidación: llegó poco después del lanzamiento de las NFT en mainnet para resolver de golpe varios bugs de comportamiento descubiertos en producción, antes de que el ecosistema de marketplaces y wallets se asentara sobre un comportamiento defectuoso.
