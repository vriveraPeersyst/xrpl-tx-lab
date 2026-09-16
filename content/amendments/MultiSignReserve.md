---
title: MultiSignReserve
summary: Reduce el coste en owner reserve de crear una SignerList, cobrando 1 unidad fija en lugar de 2 más una por cada firmante.
xrplDocs: https://xrpl.org/resources/known-amendments#multisignreserve
introducedIn: 1.3.0
---

## Qué cambia

Antes de este amendment, `SignerListSet` calculaba el `OwnerCount` añadido en función del número de firmantes: crear la lista costaba 2 unidades base más 1 unidad por cada entrada de `SignerEntries`, con un mínimo de 3 unidades para una lista de 1 firmante y hasta 10 para el máximo de 8 firmantes. Cada unidad de `OwnerCount` bloquea una owner reserve completa, así que configurar multifirma con varios firmantes podía inmovilizar varias veces la reserva base solo por la lista de firmas.

Con MultiSignReserve activo, crear una `SignerList` cuesta siempre 1 unidad de `OwnerCount`, independientemente de cuántos firmantes contenga. El objeto se marca con el flag `lsfOneOwnerCount`; al eliminar la lista, el transactor comprueba ese flag para decidir cómo liberar la reserva: si está presente, resta 1 unidad; si no (listas creadas antes del amendment), aplica el cálculo antiguo basado en el número de firmantes que quedaban. La función que hace ese cálculo histórico, `signerCountBasedOwnerCountDelta`, se conserva en el código solo para dar soporte a esas listas heredadas.

## Transacciones y objetos afectados

- [SignerListSet](/tx/SignerListSet): calcula y aplica el nuevo coste de 1 `OwnerCount` al crear la lista.
- [SignerList](/objects/SignerList): incorpora el flag `lsfOneOwnerCount` que marca las listas creadas bajo la nueva regla.
- [AccountRoot](/objects/AccountRoot): su `OwnerCount` y, por tanto, la owner reserve exigida a la cuenta, se ven reducidos.

## Estado y contexto

Antes de este cambio, una cuenta que quisiera proteger sus fondos con multifirma pagaba una penalización de reserva proporcional al número de firmantes, lo que desincentivaba configuraciones de seguridad más robustas (por ejemplo 5-de-9 firmantes) frente a listas pequeñas. El amendment desacopla el coste de reserva del tamaño de la lista de firmantes, dejando solo el coste fijo de tener el objeto en el ledger, y hace más asequible usar multifirma con umbrales de seguridad altos.
