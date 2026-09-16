---
title: PermissionedDomain
summary: Define quién puede participar en un mercado o vault restringido, según qué credenciales acepta.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/permissioneddomain
createdBy: PermissionedDomainSet
modifiedBy: PermissionedDomainSet
reserve: 1
---

## Qué representa

Un `PermissionedDomain` es una lista blanca declarativa: en vez de listar cuentas concretas, lista qué [Credential](/objects/Credential) (emitidas por qué emisor) dan acceso. Cualquier cuenta que posea una credencial válida de las aceptadas puede operar dentro del dominio: colocar `Offer` con `DomainID`, participar en un [Vault](/objects/Vault) restringido, etc. El dueño del dominio no gestiona altas y bajas de cuentas una a una; solo decide qué credenciales confía, y delega la verificación de identidad en los emisores de esas credenciales.

Es la pieza base para mercados regulados sobre XRPL: por ejemplo, un RWA que solo puede operar entre cuentas KYC-verificadas por un emisor autorizado.

## Ciclo de vida

- **Creación**: [PermissionedDomainSet](/tx/PermissionedDomainSet) sin `DomainID` previo, por el `Owner`. Fija `AcceptedCredentials`, hasta 10 pares `Issuer`+`CredentialType`.
- **Actualización**: el mismo [PermissionedDomainSet](/tx/PermissionedDomainSet), pasando `DomainID`, reemplaza la lista completa de `AcceptedCredentials`.
- **Borrado**: [PermissionedDomainDelete](/tx/PermissionedDomainDelete), solo por el `Owner`. Falla si aún hay `Offer` u otros objetos activos que dependan de este dominio.

## Campos clave

- **Owner** — quien controla qué credenciales se aceptan y paga la reserva.
- **AcceptedCredentials** — lista de `{Issuer, CredentialType}`; una cuenta cumple si tiene al menos una `Credential` aceptada y no caducada emitida por uno de esos emisores con ese tipo exacto.
- **Sequence** — secuencia de la cuenta en el momento de la creación; junto con `Owner` forma el `DomainID`.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "permissioned_domain"` lo devuelve para el `Owner`. Con `ledger_entry`, `permissioned_domain` acepta `account` y `seq`, o directamente el `DomainID` como cadena hex:

```json
{ "method": "ledger_entry", "params": [{ "permissioned_domain": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x006D || AccountID_owner || Sequence)` (`keylet::permissionedDomain`, namespace `'m'`). Respuesta típica:

```json
{
  "index": "1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B",
  "node": {
    "LedgerEntryType": "PermissionedDomain",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "AcceptedCredentials": [
      { "Credential": { "Issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "CredentialType": "4B5943" } }
    ],
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del dueño.

## Relacionado

- [PermissionedDomainSet](/tx/PermissionedDomainSet), [PermissionedDomainDelete](/tx/PermissionedDomainDelete)
- [Credential](/objects/Credential), [Offer](/objects/Offer), [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [Credentials](/amendments/Credentials)
