---
title: fixAMMv1_2
summary: Obliga a comprobar y cubrir la reserva de trustline o MPToken al retirar de un AMM, y amplía cuándo el pool puede ofertar su tamaño máximo frente al libro central.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_2
---

## Qué cambia

Al ejecutar [AMMWithdraw](/tx/AMMWithdraw), el activo retirado puede requerir crear una trustline o un `MPToken` nuevo en la cuenta que retira si esta no lo tenía todavía. Antes de este fix, esa comprobación de reserva no se hacía de forma explícita para todos los casos; con el amendment activo, `sufficientReserve` verifica antes del retiro si hace falta crear una `RippleState` (trustline) o un `MPToken` para el activo recibido y, si el `MPToken` no existe, exige que esté ya autorizado por el emisor. Esto evita que un retiro deje a la cuenta sin poder recibir el activo o consuma reserva de forma inesperada a mitad de la operación.

También ajusta `AMMLiquidity` para que, cuando no hay una oferta clara del libro central (`clobQuality`) con la que comparar, el AMM pueda proponer directamente su oferta de tamaño máximo (`maxOffer`) en más situaciones, mejorando cuánta liquidez del pool queda realmente disponible para el enrutamiento de pagos.

## Transacciones y objetos afectados

- [AMMWithdraw](/tx/AMMWithdraw): comprobación de reserva para trustline o MPToken antes de retirar.
- [Payment](/tx/Payment): cálculo de la oferta máxima que un AMM proyecta frente al libro de órdenes.
- [RippleState](/objects/RippleState) y `MPToken`: pueden crearse como parte del retiro si faltan.

## Estado y contexto

Corrige un caso donde un retiro de AMM hacia un activo nuevo para la cuenta podía completarse sin la reserva o autorización necesarias, o donde el AMM ofrecía menos liquidez de la que realmente podía aportar por falta de una comparación explícita con el libro central.
