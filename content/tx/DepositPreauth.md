---
title: DepositPreauth
summary: Autoriza (o revoca) a una cuenta concreta, o a quien tenga ciertas credenciales, a enviarte fondos cuando tienes Deposit Authorization activado.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/depositpreauth
xls: XLS-0070
amendment: DepositPreauth
level: intermedio
---

## Qué hace

Cuando una cuenta activa `asfDepositAuth` con [AccountSet](/tx/AccountSet), deja de aceptar pagos entrantes de cualquiera. `DepositPreauth` es la lista blanca: crea un objeto [DepositPreauth](/objects/DepositPreauth) que dice "esta cuenta puede depositarme" o, desde [Credentials](/amendments/Credentials), "cualquiera que tenga este conjunto de credenciales puede depositarme".

Es como una cuenta bancaria que rechaza transferencias entrantes salvo de remitentes previamente verificados. La preautorización la consultan [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim), [CheckCash](/tx/CheckCash) y otras transacciones que entregan fondos.

Cada objeto creado cuenta 1 unidad de owner reserve de la cuenta que autoriza.

## Cuándo usarlo

- Exchanges o custodios que solo aceptan depósitos de cuentas conocidas (cumplimiento).
- Cuentas con `DepositAuth` que necesitan recibir de un socio concreto.
- Aceptar fondos de cualquier cuenta con credencial KYC de un emisor de confianza, sin listar cuentas una a una.
- Revocar el acceso cuando la relación termina.

## Cómo funciona por dentro

**`DepositPreauth::preflight`** exige **exactamente uno** de estos cuatro campos: `Authorize`, `Unauthorize`, `AuthorizeCredentials` o `UnauthorizeCredentials`; cualquier otra combinación es `temMALFORMED`. Si es por cuenta, la dirección no puede ser cero (`temINVALID_ACCOUNT_ID`) ni la tuya (`temCANNOT_PREAUTH_SELF`). Si es por credenciales, `credentials::checkArray` valida el array (no vacío, sin duplicados, tamaño máximo de 8 entradas, `CredentialType` con longitud válida). `checkExtraFeatures` bloquea los campos de credenciales si el amendment Credentials no está activo (sí lo está en testnet).

**`DepositPreauth::preclaim`**:

- `Authorize`: la cuenta debe existir (`tecNO_TARGET`), no ser un pseudo-account como un AMM (`tecPSEUDO_ACCOUNT`, con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)) y no estar ya autorizada (`tecDUPLICATE`).
- `Unauthorize`: la entrada debe existir (`tecNO_ENTRY`).
- `AuthorizeCredentials`: todos los emisores de credenciales deben existir (`tecNO_ISSUER`); el conjunto ordenado no puede estar ya registrado (`tecDUPLICATE`).
- `UnauthorizeCredentials`: la entrada para ese conjunto debe existir (`tecNO_ENTRY`).

**`DepositPreauth::doApply`**: al autorizar, comprueba que cubres la reserva con un objeto más (`checkReserve`, que devuelve `tecINSUFFICIENT_RESERVE`), crea el objeto `DepositPreauth` con `Account` y `Authorize` (o con el array `AuthorizeCredentials` ordenado por emisor y tipo), lo inserta en tu directorio de propietario y sube tu `OwnerCount`. Al revocar, `DepositPreauth::removeFromLedger` saca el objeto del directorio, baja el `OwnerCount` y lo borra.

Importante: la transacción **no** exige que tengas `asfDepositAuth` activado. Puedes preparar la lista blanca antes de activar el flag; simplemente no tiene efecto hasta entonces. Tampoco necesita que la cuenta autorizada haga nada.

## Campos clave

- **Authorize** — cuenta que podrá depositarte. Una por transacción.
- **Unauthorize** — cuenta cuya preautorización eliminas.
- **AuthorizeCredentials** — array de `{Credential: {Issuer, CredentialType}}` (1 a 8). Un remitente pasa si presenta en `CredentialIDs` credenciales aceptadas y no caducadas que cubran **todo** el conjunto.
- **UnauthorizeCredentials** — mismo array, para borrar esa entrada. Debe coincidir exactamente con el conjunto registrado (el orden no importa; el código lo ordena).

## Errores habituales

- **tecDUPLICATE** — esa cuenta o ese conjunto de credenciales ya están autorizados.
- **tecNO_ENTRY** — intentas revocar algo que no existe.
- **tecNO_TARGET** — la cuenta a autorizar no está en el ledger.
- **tecINSUFFICIENT_RESERVE** — no tienes XRP para un objeto más (0,2 XRP en testnet).
- **temCANNOT_PREAUTH_SELF** — te autorizas a ti mismo; no hace falta, un pago a uno mismo siempre pasa.
- **temMALFORMED** — pusiste dos campos a la vez, o ninguno, o el array de credenciales es inválido.

## Ejemplo

```json
{
  "TransactionType": "DepositPreauth",
  "Account": "rXXXX_TU_CUENTA",
  "Authorize": "rYYYY_OTRA_CUENTA"
}
```

## Pruébalo en testnet

1. Activa Deposit Authorization en tu cuenta: [AccountSet](/tx/AccountSet) con `SetFlag: 9`.
2. Desde la otra cuenta, envía un [Payment](/tx/Payment) de 2 XRP a la tuya: fallará con `tecNO_PERMISSION` (si tu saldo supera la reserva base).
3. Envía el ejemplo de `DepositPreauth`. Consulta `account_objects` con `type: "deposit_preauth"`: verás un objeto con `Authorize: rYYYY_OTRA_CUENTA`. En `account_info` tu `OwnerCount` sube en 1.
4. Repite el pago de 2 XRP desde la otra cuenta: ahora `tesSUCCESS`.
5. Revoca con `{"TransactionType": "DepositPreauth", "Account": "...", "Unauthorize": "rYYYY_OTRA_CUENTA"}` y comprueba que el objeto desaparece.
6. Variante con credenciales: si un emisor te ha dado una credencial (ver [CredentialCreate](/tx/CredentialCreate)), autoriza con `AuthorizeCredentials` y el remitente deberá incluir `CredentialIDs` en su pago.

## Relacionado

- [AccountSet](/tx/AccountSet) — `asfDepositAuth` (valor 9).
- [Payment](/tx/Payment), [CheckCash](/tx/CheckCash), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim) — transacciones que consultan la preautorización.
- [CredentialCreate](/tx/CredentialCreate) / [CredentialAccept](/tx/CredentialAccept) — credenciales usadas en `AuthorizeCredentials`.
- Objetos: [DepositPreauth](/objects/DepositPreauth), [Credential](/objects/Credential).
- Amendments: [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth), [Credentials](/amendments/Credentials).
