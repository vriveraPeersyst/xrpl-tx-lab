---
title: NonFungibleTokensV1_1
summary: Consolida y corrige el paquete original de tokens no fungibles (NFTokenMint, NFTokenBurn, ofertas) antes de su activación en mainnet.
xrplDocs: https://xrpl.org/resources/known-amendments#nonfungibletokensv1_1
introducedIn: 1.11.0
---

## Qué cambia

NonFungibleTokensV1_1 es la versión revisada del amendment original de NFTs (`NonFungibleTokensV1`, que nunca llegó a activarse en mainnet). Reemplazó por completo al amendment inicial: agrupa una serie de correcciones sobre el diseño de las `NFTokenPage` (las páginas de directorio donde se almacenan los NFTs de una cuenta, ordenadas por `NFTokenID`), sobre el cálculo de las reservas de owner asociadas a mantener NFTs, y sobre el comportamiento de quemado (`NFTokenBurn`) y de las ofertas (`NFTokenCreateOffer`, `NFTokenCancelOffer`, `NFTokenAcceptOffer`), incluyendo la gestión de brokered sales (venta intermediada, donde un tercero casa una oferta de compra con una de venta cobrando una comisión).

En la práctica, es el amendment que define el conjunto de transacciones y el objeto `NFTokenPage` tal como existen hoy en el protocolo: al estar ya integrado como comportamiento base del código (el amendment original fue retirado y sustituido), el propio funcionamiento de mint, transferencia, quema y comercio de NFTs es la implementación de esta v1.1, y las mejoras posteriores (como `NFTokenMintOffer` o `fixNonFungibleTokensV1_2`) se construyen encima de ella.

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn), [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer) y [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): conjunto completo de transacciones para el ciclo de vida de un NFT.
- Objetos: [NFTokenPage](/objects/NFTokenPage), la estructura de directorio enlazado que almacena los NFTs de una cuenta, y [NFTokenOffer](/objects/NFTokenOffer), las ofertas de compra o venta.

## Estado y contexto

El primer intento de estandarizar NFTs en el protocolo (`NonFungibleTokensV1`) se detectó con problemas de diseño antes de su despliegue en mainnet y se sustituyó por esta versión revisada, que es la que finalmente se activó. Es la base sobre la que se apoyan todas las mejoras posteriores del ecosistema NFT de XRPL, incluyendo los distintos fixes numerados (`fixNFTokenRemint`, `fixNFTokenDirV1`, etc.) y amendments como [NFTokenMintOffer](/amendments/NFTokenMintOffer).
