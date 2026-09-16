---
title: PermissionedDEX
summary: Permite restringir una oferta del DEX a un dominio permisionado concreto, de modo que solo cruce con cuentas de ese dominio.
xrplDocs: https://xrpl.org/resources/known-amendments#permissioneddex
introducedIn: 3.0.0
---

## Qué cambia

Extiende `OfferCreate` con el campo opcional `DomainID`, que referencia un [PermissionedDomain](/amendments/PermissionedDomains) existente. Cuando se indica, la oferta solo puede cruzarse (o consultarse en el libro de órdenes) contra otras cuentas que satisfagan las credenciales aceptadas de ese dominio; el motor de emparejamiento del DEX usa un libro de órdenes distinto para las ofertas asociadas a un dominio frente al libro abierto general. También añade el flag `tfHybrid`, que crea una oferta "híbrida": visible y cruzable tanto en el libro abierto como en el del dominio, útil para proveedores de liquidez que quieren participar en ambos mercados con la misma oferta. Sin el amendment activo, `tfHybrid` queda prohibido (se añade a la máscara de flags rechazados) y usar `DomainID` hace fallar la transacción en `preflight`.

`Payment` también gana soporte para `DomainID` en sus rutas de cross-currency, de modo que un pago puede exigir que el camino de conversión use únicamente ofertas de un dominio permisionado concreto, en vez de barrer todo el libro de órdenes abierto.

## Transacciones y objetos afectados

- [OfferCreate](/tx/OfferCreate): nuevo campo `DomainID` y flag `tfHybrid`.
- [Payment](/tx/Payment): admite `DomainID` para restringir el enrutamiento de pagos cross-currency a un dominio.
- Objetos: [Offer](/objects/Offer) puede quedar asociada a un dominio; depende de [PermissionedDomain](/objects/PermissionedDomain) como referencia.

## Estado y contexto

El DEX nativo de XRPL es, por defecto, completamente abierto: cualquier cuenta puede cruzar con cualquier oferta. Para casos de uso regulados —por ejemplo, un emisor de un activo tokenizado que solo puede operar entre cuentas verificadas por KYC/AML— eso es un problema de cumplimiento normativo. PermissionedDEX permite mantener mercados restringidos a un conjunto de cuentas acreditadas mediante [PermissionedDomains](/amendments/PermissionedDomains), sin necesitar un libro de órdenes ni una infraestructura separada, y es una pieza clave para llevar activos regulados al AMM y al DEX de XRPL.
