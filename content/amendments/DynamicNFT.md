---
title: DynamicNFT
summary: Permite marcar un NFToken como mutable en el momento de acuñarlo y actualizar después su URI con una nueva transacción.
xls: XLS-0046
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0046-dynamic-NFT
xrplDocs: https://xrpl.org/resources/known-amendments#dynamicnft
---

## Qué cambia

Antes de este amendment, la `URI` de un NFToken quedaba fijada para siempre en el momento de acuñarlo. DynamicNFT añade el flag `tfMutable` a [NFTokenMint](/tx/NFTokenMint): cuando lo activas, `NFTokenMint::getFlagsMask` amplía la máscara de flags permitidos (`tfNFTokenMintMask` en vez de la máscara sin mutable) y el token nace con `nft::kFlagMutable` (`0x0010`) puesto en el identificador del NFT.

Solo los tokens acuñados con ese flag pueden actualizarse después con la nueva transacción [NFTokenModify](/tx/NFTokenModify), que también introduce este amendment. En `preclaim`, `NFTokenModify` comprueba que el flag `kFlagMutable` esté presente en el `NFTokenID` (si no, falla con `tecNO_PERMISSION`) y que quien firma sea el emisor o el `NFTokenMinter` autorizado por el emisor; el propietario actual del NFT no tiene por qué ser quien lo modifica. La transacción reemplaza el campo `URI` almacenado en el `NFTokenPage` correspondiente sin tocar ningún otro dato del token.

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint): nuevo flag `tfMutable` en la máscara de flags permitidos.
- Nueva: [NFTokenModify](/tx/NFTokenModify), delegable, que actualiza la `URI`.
- Objeto [NFToken](/objects/NFToken) (dentro de [NFTokenPage](/objects/NFTokenPage)): el identificador codifica el flag de mutabilidad y la `URI` deja de ser inmutable para los tokens que lo llevan.

## Estado y contexto

Los NFT de la XRPL representan a menudo activos cuyos metadatos cambian con el tiempo: el estado de un coleccionable evolutivo, un certificado que se actualiza, un ticket que pasa de "válido" a "usado". Sin este amendment, cualquier cambio de metadatos obligaba a quemar el NFT y acuñar uno nuevo, rompiendo su identidad y su historial. DynamicNFT resuelve esto de forma explícita y opcional: la mutabilidad se declara al acuñar, así que un comprador siempre sabe si el token que adquiere puede cambiar de contenido más adelante.
