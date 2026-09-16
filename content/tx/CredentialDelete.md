---
title: CredentialDelete
summary: Borra una credencial: el emisor la revoca, el sujeto renuncia a ella o cualquiera limpia una ya caducada.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/credentialdelete
amendment: Credentials
level: intermedio
---

## Qué hace

`CredentialDelete` elimina un objeto [Credential](/objects/Credential) del ledger y libera la reserva de propietario asociada. A diferencia de crear o aceptar, aquí no importa tanto quién eres respecto a la credencial sino qué papel juegas: puedes borrar una credencial en la que apareces como `Issuer` o como `Subject` sin restricciones, pero solo puedes borrar la credencial de un tercero (ni emisor ni sujeto) si ya ha caducado.

La transacción es flexible con los campos: si omites `Subject` o `Issuer`, el transactor asume que ese campo eres tú. Así, la cuenta que fue sujeto puede borrar "su" credencial pasando solo el `Issuer`, y el emisor puede revocarla pasando solo el `Subject`.

## Cuándo usarlo

- El emisor revoca una credencial porque el cliente dejó de cumplir el criterio (p. ej. perdió la acreditación).
- El sujeto renuncia a una credencial que ya no necesita, liberando su reserva.
- Cualquier cuenta hace limpieza de una credencial caducada que un tercero dejó abandonada en el ledger, para recuperar su propia reserva si aplica o simplemente sanear el estado.
- Antes de borrar una cuenta con [AccountDelete](/tx/AccountDelete): las credenciales asociadas bloquean el borrado si no se limpian antes.

## Cómo funciona por dentro

**`CredentialDelete::preflight`** exige que al menos uno de `Subject` o `Issuer` esté presente (`temMALFORMED` si ninguno lo está); si alguno está presente no puede ser la cuenta cero (`temINVALID_ACCOUNT_ID`). `CredentialType` debe tener entre 1 y 64 bytes.

**`CredentialDelete::preclaim`** resuelve `Subject` e `Issuer`: si faltan, toma el valor de `Account` (quien envía la tx). Comprueba que existe una credencial con esa terna exacta; si no, `tecNO_ENTRY`.

**`CredentialDelete::doApply`** es donde se aplica la regla de permisos: si ni el `Subject` ni el `Issuer` de la credencial coinciden con quien envía la transacción, solo se permite borrarla si ya está caducada (comprobado contra el `parentCloseTime` del ledger anterior); si no ha caducado, `tecNO_PERMISSION`. Si eres el emisor o el sujeto, puedes borrarla en cualquier momento, esté o no aceptada o caducada. Al borrar, se libera el objeto del directorio de propietario y se ajusta el owner count de la cuenta que lo poseía (el emisor, salvo autoaceptación).

## Campos clave

- **Subject** — opcional; si lo omites, se asume tu propia cuenta. Indícalo cuando el emisor borra la credencial de un sujeto concreto.
- **Issuer** — opcional; si lo omites, se asume tu propia cuenta. Indícalo cuando el sujeto borra una credencial que otro le emitió.
- **CredentialType** — debe coincidir exactamente con el usado al crearla.

En la práctica solo omites uno de los dos campos: no tiene sentido omitir ambos (falla en `preflight`) ni tiene sentido indicar los dos si además eres uno de ellos (aunque es válido, es redundante).

## Errores habituales

- **tecNO_ENTRY** — no existe ninguna credencial con esa terna Subject/Issuer/CredentialType.
- **tecNO_PERMISSION** — intentas borrar la credencial de un tercero que todavía no ha caducado.
- **temMALFORMED** — no indicaste ni `Subject` ni `Issuer`, o `CredentialType` tiene una longitud inválida.
- **temINVALID_ACCOUNT_ID** — `Subject` o `Issuer` apuntan a la cuenta cero.

## Ejemplo

```json
{
  "TransactionType": "CredentialDelete",
  "Account": "rXXXX_TU_CUENTA",
  "Subject": "rYYYY_OTRA_CUENTA",
  "CredentialType": "4B5943"
}
```

Como emisor (`rXXXX_TU_CUENTA`), revoca la credencial "KYC" que emitiste sobre `rYYYY_OTRA_CUENTA`.

## Pruébalo en testnet

1. Crea y acepta una credencial entre dos cuentas de prueba (ver [CredentialCreate](/tx/CredentialCreate) y [CredentialAccept](/tx/CredentialAccept)).
2. Como emisor, envía el `CredentialDelete` del ejemplo indicando el `Subject`.
3. Consulta `account_objects` con `type: "credential"` en ambas cuentas: el objeto ya no aparece.
4. Repite el flujo pero, esta vez, intenta borrarla desde una tercera cuenta sin ser emisor ni sujeto: verás `tecNO_PERMISSION` mientras no haya caducado.
5. Crea una credencial con `Expiration` en el pasado próximo y, tras superar ese instante, bórrala desde la tercera cuenta: ahora sí tendrá éxito.

## Relacionado

- [CredentialCreate](/tx/CredentialCreate) — la crea.
- [CredentialAccept](/tx/CredentialAccept) — la activa.
- [AccountDelete](/tx/AccountDelete) — requiere limpiar credenciales antes de borrar la cuenta.
- Objetos: [Credential](/objects/Credential).
- Amendments: [Credentials](/amendments/Credentials).
