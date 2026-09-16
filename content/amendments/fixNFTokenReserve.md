---
title: fixNFTokenReserve
summary: Hace que los NFTokenPage de una cuenta cuenten para su owner reserve y valida la reserva al aceptar ofertas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenreserve
---

## Qué cambia

Cada objeto que posee una cuenta en el ledger —líneas de confianza, ofertas, páginas de NFT— incrementa su `OwnerCount` y, con ello, la reserva en XRP que la cuenta debe mantener bloqueada. El almacenamiento de NFT usa páginas (`NFTokenPage`) que agrupan varios tokens, y solo se crea o destruye una página nueva cuando hace falta más o menos espacio, no en cada mint o burn individual.

El fix asegura que ese `OwnerCount` se actualice correctamente al crear o consolidar páginas de NFT (`increaseOwnerCount`/`decreaseOwnerCount` en `NFTokenHelpers`), de modo que poseer NFT cuesta reserva real de forma consistente, y añade además una comprobación en [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): tras aceptar una oferta de compra, se verifica que el número de objetos que pasa a poseer el comprador siga cumpliendo su reserva, evitando que el comprador termine con una cuenta por debajo de la reserva mínima exigida.

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn): creación y consolidación de [NFTokenPage](/objects/NFTokenPage), con su correspondiente ajuste de `OwnerCount`.
- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): comprobación de reserva tras la transferencia del NFT al comprador.
- [AccountRoot](/objects/AccountRoot): campo `OwnerCount`.

## Estado y contexto

Sin esta reserva bien contabilizada, una cuenta podía acumular NFT sin que ello incrementara proporcionalmente el XRP bloqueado que exige el ledger, o aceptar una oferta de compra que la dejara con más objetos de los que su balance puede respaldar. El fix alinea el coste de poseer NFT con el resto de objetos del ledger.
