---
title: Escrow
summary: Introduce los escrows de XRP condicionados por tiempo o por crypto-condition, con las transacciones EscrowCreate, EscrowFinish y EscrowCancel.
xrplDocs: https://xrpl.org/resources/known-amendments#escrow
---

## Qué cambia

Este amendment añade el objeto [Escrow](/objects/Escrow) y las tres transacciones que lo gestionan. [EscrowCreate](/tx/EscrowCreate) aparta una cantidad de XRP del emisor y la bloquea hasta que se cumpla una condición: un tiempo mínimo (`FinishAfter`), una crypto-condition (`Condition`, verificada con un `Fulfillment` en el finish) o ambas. Puede llevar también `CancelAfter`, a partir del cual cualquiera puede cancelar el escrow y devolver los fondos al creador.

[EscrowFinish](/tx/EscrowFinish) libera el XRP hacia el `Destination` fijado en la creación, una vez pasado `FinishAfter` (si existe) y, si hay `Condition`, presentando un `Fulfillment` válido para ella. [EscrowCancel](/tx/EscrowCancel) devuelve el XRP al creador original, solo disponible tras `CancelAfter`. Mientras el escrow está pendiente, el XRP no cuenta como saldo disponible del creador pero sí incrementa su `OwnerCount` y por tanto su reserva.

## Transacciones y objetos afectados

- Nuevas: [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish) y [EscrowCancel](/tx/EscrowCancel).
- Nuevo objeto: [Escrow](/objects/Escrow), enlazado en los directorios de propietario del creador y del destinatario.
- [AccountRoot](/objects/AccountRoot): el `OwnerCount` sube mientras el escrow existe.

## Estado y contexto

Es uno de los amendments fundacionales de la XRPL para pagos condicionados: permite construir depósitos en garantía, pagos diferidos programados o liberaciones sujetas a que un tercero presente una prueba criptográfica, todo sin intermediarios ni contratos inteligentes. No debe confundirse con [TokenEscrow](/amendments/TokenEscrow), un amendment posterior que extiende este mismo mecanismo a tokens emitidos (IOU) además de XRP. Al estar retirado (`XRPL_RETIRE_FEATURE` en `features.macro`), su comportamiento lleva años siendo el único disponible en cualquier red XRPL activa.
