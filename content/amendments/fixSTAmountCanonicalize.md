---
title: fixSTAmountCanonicalize
summary: Corrige un caso límite de la canonicalización de STAmount que podía provocar overflow al deserializar cantidades válidas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixstamountcanonicalize
---

## Qué cambia

`STAmount` es el tipo interno con el que rippled representa cantidades de XRP o de tokens emitidos, guardando mantisa y exponente por separado para los importes de IOU. Al deserializar un valor, se "canonicaliza": se normaliza la mantisa al rango esperado ajustando el exponente en consecuencia. Antes de este fix, en casos extremos ese ajuste podía hacer que una cantidad serializada válida desbordara durante la deserialización, en vez de reconstruirse correctamente.

Con fixSTAmountCanonicalize activo, la lógica de canonicalización corrige ese caso límite, de modo que cantidades válidas ya no producen overflow al leerlas de vuelta desde su forma serializada.

## Transacciones y objetos afectados

- Cualquier transacción con campos de tipo Amount en tokens emitidos (por ejemplo [Payment](/tx/Payment), [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet)): la deserialización de esos campos pasa por `STAmount::canonicalize`.
- Objetos del ledger que almacenan balances o límites en tokens emitidos, como [RippleState](/objects/RippleState).

## Estado y contexto

Es un fix de bajo nivel sobre el tipo de dato que representa todas las cantidades en tokens del protocolo: corrige un edge case de serialización, no una regla de negocio. Sin él, ciertos valores extremos pero legítimos podían fallar al reconstruirse en vez de procesarse con normalidad.
