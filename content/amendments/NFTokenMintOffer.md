---
title: NFTokenMintOffer
summary: Permite incluir una oferta de venta directamente en la transacción NFTokenMint, sin necesitar un NFTokenCreateOffer aparte.
xrplDocs: https://xrpl.org/resources/known-amendments#nftokenmintoffer
introducedIn: 2.3.0
---

## Qué cambia

Antes de este amendment, acuñar un NFT y ponerlo en venta requería dos transacciones separadas: `NFTokenMint` para crear el token y, después, `NFTokenCreateOffer` para publicar una oferta de venta sobre él. Con NFTokenMintOffer activo, `NFTokenMint` acepta los campos opcionales `Amount`, `Destination` y `Expiration` en la misma transacción. Si `Amount` está presente, el transactor crea automáticamente una oferta de venta (`NFTokenOffer`) para el NFT recién acuñado, con el precio, el comprador restringido (`Destination`, opcional) y la caducidad (`Expiration`, opcional) indicados.

El código lo controla la función `hasOfferFields`, que detecta si la transacción trae `Amount`, `Destination` o `Expiration`: sin el amendment activo, cualquiera de esos campos en un `NFTokenMint` hace que la transacción se rechace en `preflight` (`checkExtraFeatures` devuelve `false`). Con el amendment, esos campos se procesan igual que en una `NFTokenCreateOffer` normal, incluyendo las mismas reglas de validación de precio y de tipo de emisión (XRP o token fungible).

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint): admite los nuevos campos opcionales `Amount`, `Destination` y `Expiration`.
- Objeto creado indirectamente: [NFTokenOffer](/objects/NFTokenOffer), la oferta de venta generada automáticamente al acuñar si se indica `Amount`.
- Relacionado: [NFTokenCreateOffer](/tx/NFTokenCreateOffer), cuya función sigue existiendo para crear ofertas sobre NFTs ya acuñados o para añadir más ofertas después.

## Estado y contexto

El flujo habitual de "acuñar y listar a la venta" era el caso de uso más común para creadores de NFTs, y hacerlo en dos transacciones duplicaba el coste en comisiones y la complejidad de la aplicación cliente (había que esperar a la confirmación del mint antes de poder referenciar el `NFTokenID` en la oferta). NFTokenMintOffer colapsa ambos pasos en una sola transacción atómica, simplificando la experiencia de acuñación con venta inmediata sin cambiar las reglas de negocio de las ofertas en sí.
