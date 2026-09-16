---
title: DepositAuth
summary: Flag de cuenta que rechaza cualquier ingreso no iniciado por la propia cuenta, para cumplir normativa de origen de fondos.
xrplDocs: https://xrpl.org/resources/known-amendments#depositauth
introducedIn: 0.90.0
---

## Qué cambia

Añade el flag `asfDepositAuth` (`lsfDepositAuth` en `AccountRoot`). Con él activado, los `Payment` que tengan a la cuenta como destino fallan con `tecNO_PERMISSION`, sean de XRP, tokens o MPT. `EscrowFinish` y `PaymentChannelClaim` también fallan si los envía otra cuenta; solo el propio destinatario puede ejecutarlos. La cuenta sí puede recibir fondos cobrando cheques (`CheckCash`), porque es ella quien inicia la transacción.

Hay una excepción para no dejar cuentas inservibles: si el saldo está por debajo del reserve base, acepta pagos en XRP de hasta el reserve base. El amendment corrige de paso un error por el que `EscrowCreate` y `PaymentChannelCreate` aplicaban `lsfDisallowXRP`, que es un flag meramente informativo.

## Transacciones y objetos afectados

- Modificadas: [AccountSet](/tx/AccountSet), [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim), [EscrowCreate](/tx/EscrowCreate) y [PaymentChannelCreate](/tx/PaymentChannelCreate).
- Objetos: [AccountRoot](/objects/AccountRoot).

## Estado y contexto

Algunas entidades financieras no pueden aceptar fondos de origen desconocido: deben verificar al remitente antes de que el dinero entre. En un ledger donde cualquiera puede enviar a cualquiera eso era imposible. DepositAuth convierte la cuenta en "solo salida" y deja al titular controlar cada entrada mediante cheques o preautorizaciones. Fue el primer paso de una línea que continúa con [DepositPreauth](/amendments/DepositPreauth) (listas blancas de cuentas) y [Credentials](/amendments/Credentials) (autorización por credenciales). Está retirado en rippled y forma parte del protocolo base.
