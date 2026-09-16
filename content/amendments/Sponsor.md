---
title: Sponsor
summary: Permite que una cuenta patrocine la reserva de owner count y/o la comisión de otra cuenta en una transacción.
xrplDocs: https://xrpl.org/resources/known-amendments#sponsor
---

## Qué cambia

Introduce el concepto de "sponsorship": una cuenta (el sponsor) puede cubrir, total o parcialmente, la reserva de owner count que generaría un objeto de otra cuenta, o la comisión de una transacción ajena. El mecanismo se activa con dos transacciones nuevas. `SponsorshipSet` crea o actualiza un objeto `Sponsorship` entre un patrocinador y un `Sponsee`, con `FeeAmountDelta` y/o `RemainingOwnerCountDelta` como los importes que el sponsor está dispuesto a cubrir, y opcionalmente un `MaxFee` como tope. `SponsorshipTransfer` traspasa un patrocinio existente (identificado por `ObjectID`) a otro `Sponsee`.

Una vez activo, cualquier transacción puede llevar los campos de sponsor (comprobados en `Transactor.cpp`, que exige que `featureSponsor` esté habilitado si aparecen `hasSponsor`, `hasSponsorFlags` o `hasSponsorSig`) para indicar que otra cuenta cubre su coste. El `checkReserve` de `AccountRootHelpers` deja de mirar solo el balance propio de la cuenta y tiene en cuenta el owner count patrocinado disponible. Transactores como `TrustSet`, `PaymentChannelCreate`, `Payment` y `EscrowFinish` comprueban `featureSponsor` explícitamente porque su lógica de reserva (crear una trustline, un canal o liberar un escrow) cambia cuando el objeto resultante puede apoyarse en la reserva de un sponsor en vez de la propia. El `AccountRoot` de una cuenta patrocinada añade contadores como `SponsoringAccountCount` y `SponsoringOwnerCount`.

## Transacciones y objetos afectados

- Nuevas: [SponsorshipSet](/tx/SponsorshipSet) y [SponsorshipTransfer](/tx/SponsorshipTransfer).
- Objeto nuevo: [Sponsorship](/objects/Sponsorship).
- Modificadas: [TrustSet](/tx/TrustSet), [PaymentChannelCreate](/tx/PaymentChannelCreate), [Payment](/tx/Payment) y [EscrowFinish](/tx/EscrowFinish), cuya lógica de reserva contempla ahora un sponsor.
- [AccountRoot](/objects/AccountRoot): nuevos campos `Sponsor`, `SponsoringAccountCount` y `SponsoringOwnerCount`.

## Estado y contexto

Resuelve el problema de la reserva como barrera de entrada: hoy, para que una cuenta reciba una trustline, abra un canal de pago o mantenga cualquier objeto propio en el ledger, necesita tener ella misma el XRP de reserva bloqueado. Con Sponsor, una empresa, wallet o protocolo puede asumir esa reserva en nombre de sus usuarios (por ejemplo, para dar de alta cuentas sin fondos propios o subvencionar comisiones), sin transferirles XRP que quede bloqueado en su balance ni perder el control sobre esos fondos, que siguen siendo del sponsor.
