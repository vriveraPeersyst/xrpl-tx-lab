---
title: Clawback
summary: Permite a un emisor recuperar (claw back) tokens emitidos desde las cuentas que los tienen, si activó la opción antes de emitir.
xls: XLS-0039
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0039-clawback
xrplDocs: https://xrpl.org/resources/known-amendments#clawback
introducedIn: 1.12.0
---

## Qué cambia

Añade la transacción `Clawback` y el flag de cuenta `asfAllowTrustLineClawback` (`lsfAllowTrustLineClawback` en `AccountRoot`). Un emisor solo puede activar ese flag mientras no tenga ninguna trust line, es decir, antes de emitir nada; una vez activado no se puede desactivar. Con él, el emisor puede retirar hasta el saldo completo de un token desde cualquier titular indicando en `Amount` la cantidad y, en el campo `issuer` del importe, la cuenta del titular.

El flag es incompatible con `asfNoFreeze`: si has renunciado a congelar, no puedes reclamar, y viceversa. `Clawback` no usa el motor de pagos: ajusta directamente la trust line y no genera ofertas ni cruces.

## Transacciones y objetos afectados

- Nueva: [Clawback](/tx/Clawback).
- Modificada: [AccountSet](/tx/AccountSet) admite `asfAllowTrustLineClawback`.
- Objetos: [AccountRoot](/objects/AccountRoot) (nuevo flag) y [RippleState](/objects/RippleState) (saldo ajustado).

## Estado y contexto

Los emisores de stablecoins y activos regulados necesitan poder revertir fondos enviados a cuentas sancionadas o robadas para cumplir la normativa. Hasta este amendment el XRPL solo ofrecía *freeze*, que inmoviliza pero no recupera. La XLS-39 lo diseñó como *opt-in* explícito e irreversible del emisor, de modo que quien tiene un token puede saber de antemano si el emisor se reserva ese poder.

Extensiones posteriores: [MPTokensV1](/amendments/MPTokensV1) permite reclamar MPT con la misma transacción, [AMMClawback](/amendments/AMMClawback) cubre los tokens depositados en pools y [SingleAssetVault](/amendments/SingleAssetVault) añade `VaultClawback`. Este amendment está retirado en rippled y forma parte del protocolo base.
