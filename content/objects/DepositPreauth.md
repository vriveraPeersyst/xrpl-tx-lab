---
title: DepositPreauth
summary: Autorización previa para que una cuenta concreta, o quien presente ciertas credenciales, pueda enviarte fondos aunque tengas DepositAuth activo.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/depositpreauth
createdBy: DepositPreauth
modifiedBy: DepositPreauth
reserve: 1
---

## Qué representa

Cuando una cuenta activa `lsfDepositAuth` en su [AccountRoot](/objects/AccountRoot), nadie puede ingresarle fondos salvo ella misma. Un `DepositPreauth` es la excepción: una lista blanca. Hay dos variantes, según el campo que tenga:

- **Por cuenta**: `Authorize` indica una dirección que sí puede pagarte.
- **Por credenciales**: `AuthorizeCredentials` indica un conjunto de pares (`Issuer`, `CredentialType`). Cualquier cuenta que tenga todas esas credenciales aceptadas y no caducadas ([Credential](/objects/Credential)) puede pagarte, aportando sus `CredentialIDs` en la transacción.

Lo consultan `Payment`, `EscrowFinish`, `PaymentChannelClaim`, `CheckCash` y `AccountDelete` cuando el destino tiene `lsfDepositAuth`.

## Ciclo de vida

- **Creación**: [DepositPreauth](/tx/DepositPreauth) con `Authorize` o con `AuthorizeCredentials` (de 1 a 8 entradas, sin duplicados). `preclaim` comprueba que la cuenta autorizada exista y que no exista ya la misma preautorización; con credenciales, que cada emisor exista. `doApply` crea el objeto y suma 1 al `OwnerCount`.
- **Modificación**: no existe. Para cambiarla la borras y la vuelves a crear.
- **Borrado**: la misma transacción con `Unauthorize` o `UnauthorizeCredentials`. [AccountDelete](/tx/AccountDelete) la borra en cascada.

No hace falta tener `lsfDepositAuth` activo para crear preautorizaciones; puedes prepararlas antes de activar el flag.

## Campos clave

- **Account** — quien concede la autorización (el receptor de los futuros pagos).
- **Authorize** — la cuenta autorizada. Presente solo en la variante por cuenta.
- **AuthorizeCredentials** — array de `Credential` con `Issuer` y `CredentialType`. Presente solo en la variante por credenciales. El orden no importa: la clave se calcula sobre los hashes ordenados.

Las dos variantes tienen claves distintas (`keylet::depositPreauth` con dos parámetros o con el vector de credenciales), así que pueden coexistir.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "deposit_preauth"`. Con `ledger_entry` pasa `owner` más `authorized` o `authorized_credentials` (exactamente uno de los dos):

```json
{ "method": "ledger_entry", "params": [{ "deposit_preauth": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorized": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

```json
{ "method": "ledger_entry", "params": [{ "deposit_preauth": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorized_credentials": [ { "issuer": "rIssuerKYCxxxxxxxxxxxxxxxxxxxxxxxxx", "credential_type": "4B5943" } ] }, "ledger_index": "validated" }] }
```

La clave por cuenta es `SHA512Half(0x0070 || Account || Authorize)`; la clave por credenciales es `SHA512Half(0x0071 || Account || hashes_ordenados)`. Respuesta típica de la variante por cuenta:

```json
{
  "node": {
    "LedgerEntryType": "DepositPreauth",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Flags": 0,
    "OwnerNode": "0",
    "PreviousTxnID": "F1E2D3C4B5A69788796A5B4C3D2E1F00112233445566778899AABBCCDDEEFF00",
    "PreviousTxnLgrSeq": 20800150
  }
}
```

## Reserva

1 unidad de reserva de propietario por cada preautorización.

## Relacionado

- [DepositPreauth](/tx/DepositPreauth), [AccountSet](/tx/AccountSet), [Payment](/tx/Payment)
- [Credential](/objects/Credential), [AccountRoot](/objects/AccountRoot), [PermissionedDomain](/objects/PermissionedDomain)
- [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth), [Credentials](/amendments/Credentials)
