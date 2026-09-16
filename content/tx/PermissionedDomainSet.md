---
title: PermissionedDomainSet
summary: Crea o modifica un dominio permisionado: un conjunto de credenciales que da acceso a operar en él.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomainset
amendment: PermissionedDomains
level: avanzado
---

## Qué hace

`PermissionedDomainSet` crea (o modifica) un objeto [PermissionedDomain](/objects/PermissionedDomain): una lista de hasta diez pares emisor/tipo de credencial que definen quién puede entrar en ese dominio. Cualquier cuenta que tenga al menos una de esas credenciales [aceptadas](/tx/CredentialAccept) cumple el requisito de acceso.

Los dominios permisionados son la pieza que conecta el sistema de identidad ([Credentials](/amendments/Credentials)) con mercados restringidos: un [PermissionedDEX](/objects/Offer) puede exigir pertenecer a un dominio concreto para operar en él (`DomainID` en `OfferCreate` o `Payment`), igual que ciertos [Vault](/objects/Vault) privados. El dueño del dominio (`Owner`) es siempre quien lo crea; solo él puede modificarlo después.

## Cuándo usarlo

- Un exchange regulado crea un dominio "clientes verificados" aceptando credenciales de uno o varios proveedores KYC.
- Restringir el acceso a un libro de órdenes o a un vault a cuentas con una credencial concreta (residencia, acreditación de inversor, etc.).
- Actualizar la lista de credenciales aceptadas en un dominio ya existente, por ejemplo para añadir un nuevo proveedor KYC de confianza.

## Cómo funciona por dentro

**`PermissionedDomainSet::checkExtraFeatures`** exige que [Credentials](/amendments/Credentials) esté activo, ya que el dominio se define en términos de credenciales.

**`PermissionedDomainSet::preflight`** valida que `AcceptedCredentials` no esté vacío ni supere el máximo de entradas (10) ni tenga pares emisor/tipo duplicados. Si incluyes `DomainID`, no puede ser el hash cero (`temMALFORMED`).

**`PermissionedDomainSet::preclaim`** comprueba que cada `Issuer` de las credenciales aceptadas existe como cuenta (`tecNO_ISSUER`). Si estás modificando un dominio existente (`DomainID` presente), este debe existir (`tecNO_ENTRY`) y tú debes ser su propietario (`tecNO_PERMISSION` si no).

**`PermissionedDomainSet::doApply`** crea el objeto la primera vez (consumiendo reserva de propietario, `tecINSUFFICIENT_RESERVE` si no te alcanza, `tecDIR_FULL` si tu directorio está lleno) o sustituye por completo la lista `AcceptedCredentials` del dominio existente por la que envías — no es un añadido incremental, reemplaza toda la lista.

## Campos clave

- **DomainID** — omítelo para crear un dominio nuevo; inclúyelo (el hash del dominio existente) para modificar uno tuyo. El builder de esta página lo calcula al crear.
- **AcceptedCredentials** — lista de hasta 10 objetos `Credential` con `Issuer` y `CredentialType`. Basta con que el usuario tenga aceptada una de ellas para entrar en el dominio; no hace falta que las tenga todas.

## Errores habituales

- **tecNO_ISSUER** — alguno de los `Issuer` en `AcceptedCredentials` no existe como cuenta.
- **tecNO_ENTRY** — intentas modificar un `DomainID` que no existe.
- **tecNO_PERMISSION** — intentas modificar un dominio que no te pertenece.
- **tecINSUFFICIENT_RESERVE** — no te queda XRP por encima de la reserva para crear el dominio.
- **temMALFORMED** — `AcceptedCredentials` vacío, con duplicados o supera el máximo permitido.

## Ejemplo

```json
{
  "TransactionType": "PermissionedDomainSet",
  "Account": "rXXXX_TU_CUENTA",
  "AcceptedCredentials": [
    { "Credential": { "Issuer": "rYYYY_OTRA_CUENTA", "CredentialType": "4B5943" } }
  ]
}
```

Crea un dominio que acepta a cualquier cuenta con una credencial "KYC" emitida por `rYYYY_OTRA_CUENTA`.

## Pruébalo en testnet

1. Asegúrate de tener al menos un emisor de credenciales de prueba (ver [CredentialCreate](/tx/CredentialCreate)).
2. Firma y envía el ejemplo desde la cuenta que será propietaria del dominio.
3. Consulta `account_objects` con `type: "permissioned_domain"`: verás el objeto con su `DomainID` (el hash del índice del ledger).
4. Envía un segundo `PermissionedDomainSet` con ese `DomainID` y una lista `AcceptedCredentials` distinta: comprueba que la lista se sustituye por completo.
5. Borra el dominio con [PermissionedDomainDelete](/tx/PermissionedDomainDelete) cuando termines.

## Relacionado

- [PermissionedDomainDelete](/tx/PermissionedDomainDelete) — elimina el dominio.
- [CredentialCreate](/tx/CredentialCreate) y [CredentialAccept](/tx/CredentialAccept) — las credenciales que da acceso al dominio.
- [VaultCreate](/tx/VaultCreate) — un vault privado puede restringirse a un dominio.
- Objetos: [PermissionedDomain](/objects/PermissionedDomain), [Credential](/objects/Credential).
- Amendments: [PermissionedDomains](/amendments/PermissionedDomains), [Credentials](/amendments/Credentials).
