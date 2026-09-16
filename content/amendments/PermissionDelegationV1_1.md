---
title: PermissionDelegationV1_1
summary: Permite a una cuenta autorizar a otra a firmar en su nombre solo ciertos tipos de transacciones, sin compartir claves.
xrplDocs: https://xrpl.org/resources/known-amendments#permissiondelegationv1_1
introducedIn: 3.0.0
---

## Qué cambia

Introduce el objeto `Delegate` (`ltDELEGATE`), que registra que la cuenta `Account` ha delegado en la cuenta `Authorize` un conjunto de permisos (`Permissions`), hasta un máximo de `kPermissionMaxSize` entradas sin duplicados. Cada permiso identifica un tipo de transacción o una operación concreta que la cuenta delegada puede firmar en nombre de la cuenta que delega; la lista de qué transacciones son delegables la resuelve `Permission::getInstance().isDelegable(...)`, que depende también de qué amendments estén activos.

`DelegateSet` crea, actualiza o borra este objeto: rechaza en `preflight` con `temMALFORMED` que una cuenta se delegue permisos a sí misma o que la lista contenga un permiso repetido o no delegable, y en `preclaim` comprueba que la cuenta autorizada existe y no es una pseudo-cuenta (por ejemplo, la cuenta interna de un AMM o un Vault, que no pueden actuar como delegados). Una vez creado el `Delegate`, el motor de transacciones (`Transactor.cpp`) comprueba, para cualquier transacción firmada por una cuenta distinta al `Account` original, si esa relación de delegación existe y cubre el tipo de transacción enviado; solo entonces la deja pasar en nombre de la cuenta delegante.

## Transacciones y objetos afectados

- Nueva: [DelegateSet](/tx/DelegateSet), que crea, modifica o elimina la delegación (una lista vacía de `Permissions` borra el objeto).
- Objeto: nuevo [Delegate](/objects/Delegate).
- Afecta indirectamente a cualquier transacción firmada por la cuenta delegada en nombre de la delegante, verificada contra los `Permissions` almacenados.

## Estado y contexto

Antes de este mecanismo, la única forma de que un tercero operase en nombre de una cuenta era el multifirmado o el control directo de la clave, lo que en ambos casos da acceso total a la cuenta. PermissionDelegationV1_1 permite delegar de forma granular —por ejemplo, autorizar a un bot a enviar `Payment` pero no a cambiar la clave maestra ni a hacer `AccountDelete`— sin exponer ni compartir credenciales, un patrón habitual en custodia institucional y automatización de operaciones.
