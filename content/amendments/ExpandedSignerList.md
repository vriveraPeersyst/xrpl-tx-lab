---
title: ExpandedSignerList
summary: Amplía el número máximo de firmantes de una SignerList de 8 a 32 entradas.
xrplDocs: https://xrpl.org/resources/known-amendments#expandedsignerlist
---

## Qué cambia

[SignerListSet](/tx/SignerListSet) crea o reemplaza la lista de firmantes de una cuenta, usada para el multifirmado. Antes de este amendment, una `SignerEntries` no podía tener más de 8 entradas. ExpandedSignerList eleva ese límite a 32, permitiendo esquemas de gobernanza con muchos más firmantes o pesos (`SignerWeight`) más granulares repartidos entre más partes.

El coste de reserva de propietario escala con el tamaño de la lista: rippled cobra unidades de `OwnerCount` proporcionales al número de entradas (una `SignerList` de 8 entradas ya costaba varias veces la reserva de un objeto normal), así que una lista de 32 firmantes implica una reserva bloqueada notablemente mayor en la cuenta que la crea.

## Transacciones y objetos afectados

- [SignerListSet](/tx/SignerListSet): valida el número máximo de `SignerEntries` permitido.
- [SignerList](/objects/SignerList): puede almacenar hasta 32 entradas en lugar de 8.
- Indirectamente, cualquier transacción firmada mediante `Signers` (multifirmado) que dependa de una `SignerList` grande para alcanzar su `SignerQuorum`.

## Estado y contexto

El límite original de 8 firmantes resultaba insuficiente para organizaciones con estructuras de custodia o gobernanza más complejas (por ejemplo, consejos con más de 8 miembros o esquemas de firma distribuidos entre varios proveedores de custodia). Este amendment relaja ese límite sin cambiar el mecanismo de multifirmado en sí. Está retirado (`XRPL_RETIRE_FEATURE` en `features.macro`): el límite de 32 firmantes es hoy el único comportamiento posible en la red.
