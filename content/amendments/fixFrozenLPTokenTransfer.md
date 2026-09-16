---
title: fixFrozenLPTokenTransfer
summary: Impide mover LP tokens de un AMM cuando alguno de los activos subyacentes está congelado por su emisor.
xrplDocs: https://xrpl.org/resources/known-amendments#fixfrozenlptokentransfer
---

## Qué cambia

Los LP tokens de un [AMM](/objects/AMM) se representan como una trustline especial entre la cuenta del AMM y cada proveedor de liquidez. Antes de este fix, comprobar si esa trustline estaba congelada solo miraba las flags de freeze de la propia línea de LP token, pero no si alguno de los dos activos que componen el pool (`Asset`/`Asset2`) estaba congelado por su emisor. Eso permitía transferir o retirar LP tokens de un pool cuyos activos subyacentes estaban congelados, saltándose el propósito del freeze. Con `fixFrozenLPTokenTransfer` activo, `accountHolds` y los pasos de pago (`StepChecks`) comprueban también el estado de congelación de los activos subyacentes del AMM antes de permitir mover el LP token, y el reparto de fondos hacia una cuenta que resulta ser un AMM (`sfAMMID` presente) valida igualmente el estado del pool asociado.

## Transacciones y objetos afectados

- [AMM](/objects/AMM): sus LP tokens quedan sujetos al freeze de los activos que representan.
- [TrustSet](/tx/TrustSet) (freeze), [Payment](/tx/Payment) y cualquier transacción que mueva LP tokens como parte de un pago o un `Clawback`.

## Estado y contexto

Un emisor congela una línea para bloquear el movimiento de sus tokens, por ejemplo por cumplimiento normativo. Si esa congelación no se propagaba al LP token de un AMM que contiene ese activo, el freeze se podía eludir simplemente depositando en el pool y moviendo el LP token en su lugar. El fix cierra esa vía de evasión asegurando que congelar un activo también inmoviliza los LP tokens de cualquier AMM que lo contenga.
