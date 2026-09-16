---
title: PermissionedDomains
summary: Define dominios en cadena con un conjunto de credenciales aceptadas, para restringir quién puede operar dentro de ellos.
xrplDocs: https://xrpl.org/resources/known-amendments#permissioneddomains
introducedIn: 2.3.0
---

## Qué cambia

Introduce el objeto `PermissionedDomain` (`ltPERMISSIONED_DOMAIN`): identificado por su dueño (`Owner`) y una `Sequence`, almacena una lista `AcceptedCredentials` de pares emisor/tipo de [Credential](/objects/Credential) (hasta `kMaxPermissionedDomainCredentialsArraySize` entradas). Una cuenta pertenece al dominio si posee, aceptada y no caducada, al menos una de las credenciales de esa lista.

`PermissionedDomainSet` crea el dominio (sin `DomainID`) o lo actualiza (con `DomainID`, comprobando en `preclaim` que quien firma es el `Owner` y que el dominio existe); rechaza en `preflight` un `DomainID` igual a cero y valida el array de credenciales con `credentials::checkArray`. En `preclaim` también verifica que cada emisor de las credenciales aceptadas es una cuenta existente (`tecNO_ISSUER` si no). `PermissionedDomainDelete` borra el objeto, siempre que su propietario lo autorice. El amendment depende de [Credentials](/amendments/Credentials): sin él activo, `PermissionedDomainSet` no se acepta (`checkExtraFeatures` lo comprueba).

## Transacciones y objetos afectados

- Nuevas: [PermissionedDomainSet](/tx/PermissionedDomainSet) y [PermissionedDomainDelete](/tx/PermissionedDomainDelete).
- Objeto: nuevo [PermissionedDomain](/objects/PermissionedDomain).
- Consumido por [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [VaultCreate](/tx/VaultCreate) y [VaultSet](/tx/VaultSet), que pueden restringir su `DomainID` a un dominio permisionado existente.

## Estado y contexto

PermissionedDomains traduce el concepto de "lista blanca de participantes verificados" a un objeto reutilizable en el ledger: en vez de que cada emisor o protocolo mantenga su propia lista de cuentas autorizadas, define un conjunto de credenciales aceptadas una sola vez y cualquier transactor puede referenciarlo por su `DomainID`. Es la pieza base sobre la que se construyen [PermissionedDEX](/amendments/PermissionedDEX) (mercados restringidos a un dominio) y el protocolo de préstamos (vaults y MPTs con emisión restringida a inversores acreditados).
