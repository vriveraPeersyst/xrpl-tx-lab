---
title: CredentialCreate
summary: Un emisor crea una credencial verificable sobre otra cuenta (por ejemplo, un KYC superado).
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialcreate
amendment: Credentials
level: intermedio
---

## Qué hace

`CredentialCreate` es la primera pieza del sistema de identidad on-chain del XRPL: permite que una cuenta (el emisor) afirme algo sobre otra cuenta (el sujeto), por ejemplo "esta cuenta ha superado mi proceso KYC". El resultado es un objeto [Credential](/objects/Credential) en el ledger, identificado por la terna `Issuer` + `Subject` + `CredentialType`.

La credencial no es válida de inmediato: se crea en estado pendiente y el sujeto tiene que aceptarla explícitamente con [CredentialAccept](/tx/CredentialAccept). Esto evita que alguien te "etiquete" con una credencial que no reconoces. Puedes acompañarla de una `URI` que apunte a la evidencia fuera de cadena (un certificado, un documento firmado) y de un `Expiration` a partir del cual deja de ser válida.

## Cuándo usarlo

- Un proveedor KYC certifica que una cuenta ha pasado su verificación.
- Un exchange o custodio emite una credencial de "cliente acreditado" para acceder a un [PermissionedDomain](/objects/PermissionedDomain).
- Preparar una preautorización de depósito por credencial en lugar de por cuenta individual (ver [DepositPreauth](/tx/DepositPreauth)).
- Emitir credenciales caducables (por ejemplo, validez de 30 días) para procesos de verificación que se renuevan periódicamente.

## Cómo funciona por dentro

**`CredentialCreate::preflight`** solo valida forma: `Subject` debe estar presente (`temMALFORMED` si falta), `CredentialType` debe tener entre 1 y 64 bytes, y si incluyes `URI` no puede estar vacía ni superar el máximo permitido. Con [fixInvalidTxFlags](/amendments/fixInvalidTxFlags) activo, cualquier flag no universal se rechaza.

**`CredentialCreate::preclaim`** mira el ledger: el `Subject` debe existir (`tecNO_TARGET` si no), no puede existir ya una credencial con la misma terna Issuer/Subject/CredentialType (`tecDUPLICATE`), y —con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)— el sujeto no puede ser una pseudo-cuenta como un AMM o un Vault (`tecPSEUDO_ACCOUNT`).

**`CredentialCreate::doApply`** crea el objeto `Credential` con `Issuer` = quien envía la transacción y `Subject` = la cuenta indicada, lo añade al directorio del emisor y, si el emisor y el sujeto son la misma cuenta, la marca como aceptada automáticamente (`lsfAccepted`) sin necesidad de un `CredentialAccept` posterior. Consume reserva de propietario y puede fallar con `tecDIR_FULL` si el directorio del emisor está lleno, o con `tecEXPIRED` si el `Expiration` indicado ya pasó respecto al ledger que la crea.

## Campos clave

- **Subject** — la cuenta sobre la que se afirma algo. La credencial vive en el espacio de esa cuenta.
- **CredentialType** — hex de 1 a 64 bytes que identifica el tipo de credencial (p.ej. `4B5943` = "KYC"). Junto a `Issuer` y `Subject`, forma la clave única de la credencial.
- **Expiration** — timestamp en segundos Ripple Epoch (2000-01-01). Pasado ese punto, la credencial se considera caducada aunque siga en el ledger hasta que alguien la borre.
- **URI** — hex opcional (máx. 256 bytes) con un enlace o hash a la evidencia fuera de cadena. El ledger no la interpreta.

## Errores habituales

- **tecNO_TARGET** — el `Subject` indicado no existe como cuenta activada.
- **tecDUPLICATE** — ya existe una credencial con ese mismo Issuer, Subject y CredentialType.
- **tecPSEUDO_ACCOUNT** — el `Subject` es una cuenta pseudo (AMM, Vault, LoanBroker), que no puede recibir credenciales.
- **temMALFORMED** — falta `Subject`, o `CredentialType`/`URI` tienen una longitud inválida.
- **tecDIR_FULL** — el directorio de propietario del emisor está al límite.
- **tecINSUFFICIENT_RESERVE** — no te queda XRP por encima de la reserva para crear el objeto.

## Ejemplo

```json
{
  "TransactionType": "CredentialCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Subject": "rYYYY_OTRA_CUENTA",
  "CredentialType": "4B5943",
  "Expiration": "{{time+2592000}}",
  "URI": "68747470733A2F2F6578616D706C652E636F6D"
}
```

Emite una credencial de tipo "KYC" sobre la otra cuenta, válida 30 días.

## Pruébalo en testnet

1. Firma la transacción anterior desde la cuenta que hace de emisor; el `Subject` es la otra cuenta de tu par de pruebas.
2. Comprueba con `account_objects` (tipo `credential`) en la cuenta emisora: verás el objeto `Credential` sin el flag `lsfAccepted`.
3. Desde la cuenta `Subject`, envía [CredentialAccept](/tx/CredentialAccept) con el mismo `Issuer` y `CredentialType`.
4. Repite `account_objects`: ahora el objeto tiene `lsfAccepted` activo.
5. Prueba a repetir el mismo `CredentialCreate`: recibirás `tecDUPLICATE`.

## Relacionado

- [CredentialAccept](/tx/CredentialAccept) — el sujeto confirma la credencial.
- [CredentialDelete](/tx/CredentialDelete) — la revoca o el sujeto renuncia a ella.
- [DepositPreauth](/tx/DepositPreauth) — usa credenciales para preautorizar depósitos.
- [PermissionedDomainSet](/tx/PermissionedDomainSet) — exige credenciales concretas para entrar en un dominio.
- Objetos: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
