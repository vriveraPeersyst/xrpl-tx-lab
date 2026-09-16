---
title: fixRemoveNFTokenAutoTrustLine
summary: Elimina la posibilidad de mintear NFTokens con el flag tfTrustLine, que creaba trustlines al emisor sin su permiso.
xrplDocs: https://xrpl.org/resources/known-amendments#fixremovenftokenautotrustline
---

## Qué cambia

Antes de este fix, [NFTokenMint](/tx/NFTokenMint) admitía el flag `tfTrustLine`. Un NFToken minteado con ese flag, al transferirse entre cuentas usando un token de pago distinto de XRP, creaba automáticamente una trustline hacia el emisor del NFToken en la cuenta receptora, sin que esa cuenta la hubiera solicitado ni el emisor la hubiera autorizado.

Eso permitía un ataque: dos cuentas podían intercambiarse el mismo NFToken una y otra vez para ir generando trustlines arbitrarias sobre un emisor, incrementando su reserva sin límite y sin su consentimiento. Con fixRemoveNFTokenAutoTrustLine activo, `NFTokenMint` rechaza el flag `tfTrustLine`: se elimina de la máscara de flags válidos (`tfNFTokenMintMask`/`tfNFTokenMintMaskWithoutMutable`, según si [DynamicNFT](/amendments/DynamicNFT) está activo), así que cualquier intento de mintear con ese bit falla en `preflight`.

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint): `tfTrustLine` deja de ser un flag válido.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): ya no puede desencadenar la creación automática de una trustline al emisor como efecto colateral de aceptar una oferta en un token distinto de XRP.

## Estado y contexto

Corrige un vector de abuso contra emisores de NFT: forzar la creación de trustlines no solicitadas inflaba su reserva de forma indefinida sin coste real para el atacante. El fix cierra la vía eliminando el flag que lo hacía posible, en vez de intentar limitar el abuso a posteriori.
