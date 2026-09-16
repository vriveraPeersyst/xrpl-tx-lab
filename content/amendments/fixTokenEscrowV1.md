---
title: fixTokenEscrowV1
summary: Corrige la contabilidad del importe bloqueado del emisor al liberar un escrow de un token con TransferRate.
xrplDocs: https://xrpl.org/resources/known-amendments#fixtokenescrowv1
---

## Qué cambia

El amendment TokenEscrow permite bloquear tokens emitidos (IOU o MPT), no solo XRP, en un [EscrowCreate](/tx/EscrowCreate). Si el emisor del token tiene configurado un `TransferRate`, el importe que recibe el destinatario al finalizar el escrow (`netAmount`, tras descontar la comisión de transferencia) es menor que el importe bruto que se bloqueó originalmente (`grossAmount`).

Antes de este fix, al desbloquear el escrow con `unlockEscrowMPT` se reducía el `LockedAmount` registrado en el objeto de emisión del token usando el mismo importe en ambos casos, asumiendo implícitamente `netAmount == grossAmount`. Eso descuadraba la contabilidad del emisor cuando había `TransferRate` de por medio: el importe realmente bloqueado (bruto) no coincidía con el que se restaba al liberarlo (neto). Con fixTokenEscrowV1 activo, la función deja de exigir esa igualdad y ajusta correctamente el `LockedAmount` del emisor usando el importe neto correspondiente.

## Transacciones y objetos afectados

- [EscrowFinish](/tx/EscrowFinish): al liberar un escrow de un token con `TransferRate`, corrige cuánto se resta del importe bloqueado del emisor.
- Objeto de emisión del token (MPTokenIssuance): su campo `LockedAmount` queda correctamente cuadrado tras liberar el escrow.

## Estado y contexto

Es un fix específico sobre la contabilidad interna de TokenEscrow para tokens con comisión de transferencia; no introduce comportamiento nuevo de cara al usuario, sino que evita que el importe bloqueado del emisor quede descuadrado cuando el importe bruto bloqueado y el neto entregado difieren.
