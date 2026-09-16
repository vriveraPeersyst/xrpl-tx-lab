---
title: DeletableAccounts
summary: Permite borrar cuentas con AccountDelete y cambia el Sequence inicial de las cuentas nuevas para evitar repeticiones.
xls: XLS-0007
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0007-deletable-accounts
xrplDocs: https://xrpl.org/resources/known-amendments#deletableaccounts
introducedIn: 1.4.0
---

## Qué cambia

Añade `AccountDelete`, que elimina el `AccountRoot` y envía el XRP restante a otra cuenta. La transacción cuesta al menos el owner reserve incremental (no la comisión base) y exige que la cuenta no tenga objetos que no se puedan borrar automáticamente: escrows, canales de pago, cheques o páginas de NFT la bloquean con `tecHAS_OBLIGATIONS`, y una cuenta con más de 1000 objetos devuelve `tefTOO_BIG`. Además, hay que esperar: no se puede borrar si `Sequence + 256 > ledger actual` (`tecTOO_SOON`).

El segundo cambio es más sutil: las cuentas nuevas ya no empiezan con `Sequence = 1`, sino con el índice del ledger en que se crean. Así, si una cuenta se borra y se vuelve a crear, ninguna transacción antigua firmada con secuencias bajas puede volver a aplicarse.

## Transacciones y objetos afectados

- Nueva: [AccountDelete](/tx/AccountDelete).
- Modificada: [Payment](/tx/Payment) al crear cuentas asigna el nuevo `Sequence` inicial.
- Objetos: [AccountRoot](/objects/AccountRoot), [DirectoryNode](/objects/DirectoryNode) del propietario y objetos borrables como [RippleState](/objects/RippleState), [Offer](/objects/Offer), [SignerList](/objects/SignerList), [Ticket](/objects/Ticket) y [DepositPreauth](/objects/DepositPreauth).

## Estado y contexto

Hasta 2020 una cuenta del XRPL era permanente: el reserve base quedaba bloqueado para siempre y el estado del ledger solo podía crecer. La XLS-7 permitió recuperar la mayor parte del reserve (se quema una unidad de owner reserve como coste) y fijó la regla de secuencia para que el borrado no abriera ataques de repetición. Amendments posteriores han ampliado la lista de objetos que se borran o que impiden el borrado (por ejemplo `fixNFTokenReserve`, [DID](/amendments/DID) o [Credentials](/amendments/Credentials)). Retirado en rippled: forma parte del protocolo base.
