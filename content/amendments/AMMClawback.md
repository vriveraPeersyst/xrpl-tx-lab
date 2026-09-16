---
title: AMMClawback
summary: Permite usar tokens con clawback en AMMs y añade AMMClawback para que el emisor recupere tokens depositados en un pool.
xls: XLS-0073
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0073-amm-clawback
xrplDocs: https://xrpl.org/resources/known-amendments#ammclawback
introducedIn: 2.3.0
---

## Qué cambia

Antes de este amendment, `AMMCreate` rechazaba cualquier token cuyo emisor tuviera activado `lsfAllowTrustLineClawback`: como el pool es una pseudocuenta sin claves, el emisor no tenía forma de recuperar los tokens una vez dentro. AMMClawback elimina esa restricción y añade una transacción específica para que el emisor pueda retirar del pool los tokens que pertenecen a un proveedor de liquidez concreto.

La operación no actúa sobre el pool en bruto: el emisor indica el titular (`Holder`) y el activo, y el ledger quema los LP tokens de ese titular en la proporción necesaria y devuelve al emisor la parte correspondiente de su token. Con el flag `tfClawTwoAssets` el emisor que ha emitido ambos activos del pool puede recuperar los dos a la vez.

También modifica `AMMDeposit` para impedir depositar tokens congelados (trust line con freeze) en un pool.

## Transacciones y objetos afectados

- Nueva: [AMMClawback](/tx/AMMClawback).
- Modificadas: [AMMCreate](/tx/AMMCreate) acepta tokens con clawback habilitado; [AMMDeposit](/tx/AMMDeposit) rechaza activos congelados.
- Objetos: [AMM](/objects/AMM) y las líneas [RippleState](/objects/RippleState) entre el emisor y la pseudocuenta del pool.

## Estado y contexto

[Clawback](/amendments/Clawback) se diseñó para emisores regulados (stablecoins, activos tokenizados) que necesitan recuperar fondos por orden judicial o sanciones. Sin embargo, dejaba un hueco: bastaba con depositar el token en un AMM para ponerlo fuera del alcance del emisor. La XLS-73 cierra ese hueco y, de paso, permite que esos mismos emisores ofrezcan liquidez en AMMs sin renunciar a sus obligaciones de cumplimiento.

Un error de redondeo en el cálculo de la cantidad recuperada se corrigió más tarde con `fixAMMClawbackRounding`.
