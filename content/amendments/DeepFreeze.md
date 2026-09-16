---
title: DeepFreeze
summary: Congelación profunda de trust lines: el titular no puede enviar ni recibir el token congelado, ni siquiera a través de ofertas o AMM.
xls: XLS-0077
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0077-deep-freeze
xrplDocs: https://xrpl.org/resources/known-amendments#deepfreeze
introducedIn: 2.4.0
---

## Qué cambia

El *freeze* clásico de una trust line impide al titular enviar el token, pero le sigue permitiendo recibirlo. DeepFreeze añade un segundo nivel: con `tfSetDeepFreeze` en `TrustSet` el emisor bloquea también las entradas. Un titular con deep freeze no puede recibir pagos del token, sus ofertas que lo consumen o producen se consideran sin fondos y el motor de pagos evita esa línea en cualquier ruta. `tfClearDeepFreeze` lo revierte.

Reglas en `TrustSet::preflight` y `doApply`: el deep freeze solo puede aplicarse si la línea ya está (o queda) congelada con el freeze normal, no puede combinarse con `tfClearFreeze` en la misma transacción, y un emisor con `lsfNoFreeze` no puede usarlo. En `RippleState` se añaden `lsfLowDeepFreeze` y `lsfHighDeepFreeze`. Un invariante nuevo (`FreezeInvariant`) comprueba que ninguna transacción mueve saldo a través de una línea con deep freeze.

## Transacciones y objetos afectados

- Modificada: [TrustSet](/tx/TrustSet) con los flags `tfSetDeepFreeze` y `tfClearDeepFreeze`.
- Afectadas indirectamente: [Payment](/tx/Payment), [OfferCreate](/tx/OfferCreate), [CheckCash](/tx/CheckCash), [AMMDeposit](/tx/AMMDeposit) y [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) tratan la línea como bloqueada en ambos sentidos.
- Objetos: [RippleState](/objects/RippleState) con dos flags nuevos.

## Estado y contexto

Para un emisor regulado, congelar solo la salida no basta: una cuenta sancionada podía seguir acumulando el token, y el emisor seguía obligado a reconocer ese saldo. La XLS-77 da una herramienta de cumplimiento más completa y coherente con [Clawback](/amendments/Clawback), con el que suele combinarse: primero se aísla la cuenta y después se recuperan los fondos. Como el freeze normal, es una decisión visible del emisor que cualquier titular puede consultar en la trust line.
