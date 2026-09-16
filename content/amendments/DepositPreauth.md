---
title: DepositPreauth
summary: Lista blanca de remitentes para cuentas con DepositAuth, más el método deposit_authorized y tecEXPIRED para ofertas caducadas.
xrplDocs: https://xrpl.org/resources/known-amendments#depositpreauth
introducedIn: 1.1.0
---

## Qué cambia

Añade la transacción `DepositPreauth` y el objeto del mismo nombre. Una cuenta con `lsfDepositAuth` puede preautorizar a otra (`Authorize`) para que le envíe pagos directamente, y revocarlo después (`Unauthorize`). Cada preautorización es un objeto propio que consume una unidad de owner reserve. El motor comprueba la existencia del objeto en `preclaim` de `Payment`, `EscrowFinish` y `PaymentChannelClaim` antes de aplicar la regla de DepositAuth. Se añade el método RPC `deposit_authorized` para consultarlo.

Dos ajustes adicionales: un pago cross-currency de una cuenta a sí misma ya no falla por DepositAuth, y `OfferCreate` con `Expiration` en el pasado devuelve `tecEXPIRED` en vez de `tesSUCCESS` sin efecto.

## Transacciones y objetos afectados

- Nueva: [DepositPreauth](/tx/DepositPreauth).
- Modificadas: [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim) y [OfferCreate](/tx/OfferCreate).
- Nuevo objeto [DepositPreauth](/objects/DepositPreauth); afecta a [AccountRoot](/objects/AccountRoot) (owner count).

## Estado y contexto

[DepositAuth](/amendments/DepositAuth) resolvía el cumplimiento, pero obligaba al destinatario a cobrar cheques uno a uno. Las preautorizaciones permiten mantener el bloqueo por defecto y abrir excepciones a contrapartes verificadas (custodios, exchanges, clientes con KYC). Con [Credentials](/amendments/Credentials) el mismo objeto puede autorizar por credencial en lugar de por cuenta, lo que escala mejor. Retirado en rippled: forma parte del protocolo base.
