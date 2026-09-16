---
title: NegativeUNL
summary: Permite marcar temporalmente en el ledger a validadores de la UNL que no están validando, para mantener el quórum efectivo.
xrplDocs: https://xrpl.org/resources/known-amendments#negativeunl
introducedIn: 1.7.0
---

## Qué cambia

Introduce el objeto singleton `NegativeUNL` (`ltNEGATIVE_UNL`, solo puede existir uno en el ledger), con los campos `DisabledValidators` (la lista actual de validadores marcados como inactivos), `ValidatorToDisable` y `ValidatorToReEnable` (los cambios propuestos para el ledger flag ledger, aún no aplicados). No es una transacción que un usuario pueda enviar: los propios validadores, al cerrar cada ledger flag ledger (uno de cada 256), votan sobre qué validadores de la UNL llevan un número de ledgers consecutivos sin validar y proponen añadirlos o quitarlos de la lista negativa. Si suficientes validadores coinciden, el cambio se aplica de forma automática al ledger mediante una pseudo-transacción interna del protocolo.

El efecto práctico es que el quórum de consenso (normalmente el 80 % de la UNL) se calcula excluyendo a los validadores de la lista negativa, en vez de sobre el tamaño nominal de la UNL. Así, si varios validadores dejan de funcionar temporalmente, la red no necesita que sobrevivan más validadores "sanos" de los estrictamente necesarios para seguir alcanzando el 80 % real.

## Transacciones y objetos afectados

- Nuevo objeto: [NegativeUNL](/objects/NegativeUNL), singleton del ledger.
- No añade transacciones de usuario; el cambio de estado se produce mediante el mecanismo de votación de validadores en los ledgers flag, gestionado internamente por el protocolo de consenso.

## Estado y contexto

Antes de este amendment, si un número suficiente de validadores de la UNL dejaba de validar (por caídas, mantenimiento, problemas de red), la red podía perder la capacidad de alcanzar el quórum del 80 % necesario para cerrar ledgers, aunque los validadores restantes estuvieran perfectamente sincronizados entre sí. NegativeUNL resuelve esto haciendo que el quórum se calcule sobre los validadores activos reales, no sobre el conjunto nominal de la UNL, mejorando la disponibilidad de la red frente a caídas parciales sin comprometer la seguridad del consenso.
