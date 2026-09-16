---
title: CredentialAccept
summary: El sujeto de una credencial la acepta, dejándola operativa para preautorizaciones y dominios permisionados.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialaccept
amendment: Credentials
level: intermedio
---

## Qué hace

Cuando un emisor crea una credencial con [CredentialCreate](/tx/CredentialCreate), esta queda pendiente: existe en el ledger pero no cuenta como válida para nada (no sirve para pasar un [PermissionedDomain](/objects/PermissionedDomain) ni para una preautorización de depósito por credencial). `CredentialAccept` es el paso en el que el sujeto de la credencial la reconoce y la activa, marcando el objeto [Credential](/objects/Credential) con el flag `lsfAccepted`.

Este diseño en dos pasos evita que cualquiera pueda "etiquetarte" con afirmaciones que no quieres llevar asociadas a tu cuenta: nadie puede forzarte a aceptar una credencial, y hasta que lo hagas, esta no tiene efecto alguno en el resto del protocolo.

## Cuándo usarlo

- Confirmar una credencial de KYC/AML que un proveedor te ha emitido, antes de operar en un DEX permisionado.
- Activar una credencial de "cliente acreditado" para poder depositar en cuentas con `DepositPreauth` basado en credenciales.
- Cualquier flujo de onboarding en el que primero un tercero certifica algo sobre ti y luego tú lo confirmas.

## Cómo funciona por dentro

**`CredentialAccept::preflight`** valida forma: `Issuer` no puede estar vacío (`temINVALID_ACCOUNT_ID`) y `CredentialType` debe tener entre 1 y 64 bytes (`temMALFORMED`). Con [fixInvalidTxFlags](/amendments/fixInvalidTxFlags), cualquier flag fuera de los universales se rechaza.

**`CredentialAccept::preclaim`** comprueba contra el ledger: el `Issuer` debe existir como cuenta (`tecNO_ISSUER`), debe existir una credencial con esa terna Subject (el que envía la tx) / Issuer / CredentialType (`tecNO_ENTRY` si no), y esa credencial no puede estar ya aceptada (`tecDUPLICATE`).

**`CredentialAccept::doApply`** localiza el objeto `Credential`, comprueba la reserva de propietario disponible en la cuenta que acepta (puede crecer el owner count) y activa el flag `lsfAccepted`. Si la credencial ya caducó según `Expiration` respecto al momento de cierre del ledger anterior, la transacción falla con `tecEXPIRED` en lugar de aceptar una credencial muerta.

## Campos clave

- **Issuer** — la cuenta que creó la credencial. Junto con tu propia cuenta (como `Subject` implícito) y `CredentialType`, identifica el objeto a aceptar.
- **CredentialType** — debe coincidir exactamente (mismo hex) con el usado en el `CredentialCreate` original.

No hay más campos: `CredentialAccept` no lleva `URI` ni `Expiration` — esos solo se fijan al crear la credencial.

## Errores habituales

- **tecNO_ENTRY** — no existe ninguna credencial pendiente con ese `Issuer` y `CredentialType` para tu cuenta. Revisa que el `CredentialCreate` se envió correctamente.
- **tecNO_ISSUER** — la cuenta indicada en `Issuer` no existe (o nunca se activó).
- **tecDUPLICATE** — la credencial ya estaba aceptada; no hace falta repetir la operación.
- **tecEXPIRED** — el `Expiration` de la credencial ya pasó; pide al emisor que cree una nueva.
- **temMALFORMED** — `CredentialType` vacío o demasiado largo.

## Ejemplo

```json
{
  "TransactionType": "CredentialAccept",
  "Account": "rXXXX_TU_CUENTA",
  "Issuer": "rYYYY_OTRA_CUENTA",
  "CredentialType": "4B5943"
}
```

Acepta, desde tu cuenta, la credencial de tipo "KYC" que `rYYYY_OTRA_CUENTA` te emitió.

## Pruébalo en testnet

1. Desde otra cuenta, emite primero [CredentialCreate](/tx/CredentialCreate) hacia tu cuenta como `Subject` (mismo `CredentialType`).
2. Firma y envía el `CredentialAccept` de arriba desde tu cuenta.
3. Consulta `account_objects` con `type: "credential"` en tu cuenta o en la del emisor: el objeto muestra `Flags: 65536` (`lsfAccepted`).
4. Intenta enviar el mismo `CredentialAccept` otra vez: obtendrás `tecDUPLICATE`.
5. Usa esa credencial aceptada como `AcceptedCredentials` al crear un [PermissionedDomainSet](/tx/PermissionedDomainSet) desde la cuenta del emisor.

## Relacionado

- [CredentialCreate](/tx/CredentialCreate) — la crea, en estado pendiente.
- [CredentialDelete](/tx/CredentialDelete) — la revoca o elimina tras caducar.
- [PermissionedDomainSet](/tx/PermissionedDomainSet) — consume credenciales aceptadas.
- [DepositPreauth](/tx/DepositPreauth) — preautoriza depósitos por credencial.
- Objetos: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
