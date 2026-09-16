---
title: fixNFTokenRemint
summary: Impide que un NFTokenID reutilizado tras quemar un token y borrar la cuenta pueda volver a generarse con los mismos datos.
xrplDocs: https://xrpl.org/resources/known-amendments#fixnftokenremint
---

## Qué cambia

El `NFTokenID` de un NFT se calcula combinando varios campos, entre ellos un número de secuencia derivado del `Sequence` de la cuenta emisora en el momento del mint. Antes del fix, ese número de secuencia dependía directamente del `Sequence` de la cuenta emisora, que puede reiniciarse: si una cuenta quemaba todos sus NFT y luego se borraba con [AccountDelete](/tx/AccountDelete), su `AccountID` podía volver a usarse tras el periodo de espera y su `Sequence` volver a partir de un valor bajo. Eso permitía volver a acuñar un NFT con exactamente el mismo `NFTokenID` que uno ya quemado anteriormente, reutilizando metadatos o taxonomías antiguas bajo una identificación que debería ser única para siempre.

`fixNFTokenRemint` introduce el campo `FirstNFTokenSequence` en [AccountRoot](/objects/AccountRoot): la primera vez que una cuenta emite un NFT, se fija a su `Sequence` actual. El número de secuencia real de cada token pasa a calcularse como `FirstNFTokenSequence + MintedNFTokens`, un contador (`MintedNFTokens`) que solo crece y nunca se reinicia aunque la cuenta se borre y se reutilice su dirección, evitando que dos mints distintos produzcan el mismo `NFTokenID`.

## Transacciones y objetos afectados

- [NFTokenMint](/tx/NFTokenMint): cálculo del `NFTokenID` vía `FirstNFTokenSequence` y `MintedNFTokens`.
- [AccountRoot](/objects/AccountRoot): nuevos campos `FirstNFTokenSequence` y `MintedNFTokens`.
- [AccountDelete](/tx/AccountDelete): interacción con el reinicio de secuencia al borrar y reutilizar una cuenta.

## Estado y contexto

Cierra una vía de "re-acuñado": sin este fix, era posible recrear un NFT ya quemado con idéntico `NFTokenID`, lo que rompía la suposición de que un `NFTokenID` identifica de forma única y permanente a un token concreto, algo que marketplaces e indexadores dan por hecho.
