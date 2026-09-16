---
title: fixNFTokenPageLinks
summary: Corrige el enlazado entre páginas de NFTokenPage cuando se borra el último NFT de la página terminal del directorio.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenpagelinks
---

## Qué cambia

Los [NFToken](/objects/NFTokenPage) de una cuenta se almacenan en una lista enlazada de páginas ([NFTokenPage](/objects/NFTokenPage)), unidas por `PreviousPageMin` y `NextPageMin`. La última página de esa lista tiene siempre la clave máxima posible (todo el rango `nft::kPageMask` a unos); es un ancla estructural del directorio, no una página cualquiera.

Antes del fix, al quemar el último NFT de esa página terminal cuando además tenía una página anterior no vacía, el código simplemente desenlazaba y borraba la página vacía, dejando la página anterior como nueva "última". Como esa página anterior no tenía la clave máxima, se rompía la invariante de que la página terminal del directorio siempre ocupa esa posición, lo que podía dejar el directorio de NFT mal enlazado.

Con `fixNFTokenPageLinks` activo, en ese caso concreto (página vacía, con `prev`, y clave igual a `kPageMask`) el código copia el contenido de `prev` a la página actual, ajusta el enlace `PreviousPageMin` de la nueva página anterior y borra `prev` en su lugar, conservando siempre la página de clave máxima como terminal del directorio.

## Transacciones y objetos afectados

- [NFTokenBurn](/tx/NFTokenBurn) y [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): disparan la consolidación de páginas al vaciarse una `NFTokenPage`.
- [NFTokenPage](/objects/NFTokenPage): se corrige el mantenimiento de sus enlaces `PreviousPageMin`/`NextPageMin`.

## Estado y contexto

Es un fix estructural sobre el mantenimiento del directorio de NFT: evita que una secuencia de quemas de tokens deje el enlazado de páginas en un estado inconsistente con la invariante de que la página terminal siempre tiene la clave máxima, invariante que además comprueba `NFTInvariant`.
