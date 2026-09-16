---
title: fixTrustLinesToSelf
summary: Borra dos trustlines de una cuenta consigo misma creadas por un bug antiguo y evita que puedan volver a crearse.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtrustlinestoself
---

## Qué cambia

Una trustline (objeto [RippleState](/objects/RippleState)) representa una relación de confianza entre dos cuentas distintas para un token; no tiene sentido que una cuenta tenga una trustline consigo misma. Un bug antiguo permitió, en un número muy reducido de casos concretos, que llegaran a crearse trustlines de ese tipo, con la propia cuenta como emisor y como titular a la vez.

fixTrustLinesToSelf hace dos cosas al activarse: borra directamente del ledger las trustlines conocidas afectadas por ese bug (identificadas por su clave de objeto), y refuerza la validación en [TrustSet](/tx/TrustSet) para que una transacción que intente crear o modificar una trustline en la que `Account` y el emisor de `LimitAmount` coinciden se rechace, cerrando la vía que permitió el problema original.

## Transacciones y objetos afectados

- [TrustSet](/tx/TrustSet): rechaza trustlines donde la cuenta y el emisor del límite son la misma cuenta.
- [RippleState](/objects/RippleState): elimina del ledger las entradas concretas afectadas por el bug.

## Estado y contexto

Es un fix de saneamiento puntual: corrige un estado inconsistente heredado de un bug histórico y cierra la vía que lo permitió, sin cambiar el comportamiento de trustlines normales entre cuentas distintas.
