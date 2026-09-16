---
title: Credential
summary: Una credencial verificable on-chain: un emisor afirma algo sobre un sujeto, y el sujeto la acepta para poder usarla.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/credential
createdBy: CredentialCreate
modifiedBy: CredentialAccept, CredentialDelete
reserve: 1
---

## Qué representa

Un `Credential` es una afirmación firmada en el ledger: la cuenta `Issuer` declara que la cuenta `Subject` cumple algo identificado por `CredentialType` (por ejemplo, "KYC verificado" o "residente en la UE"). El contenido real de la verificación no se guarda en cadena; el objeto solo apunta a él mediante `URI` y deja constancia de quién lo afirma, sobre quién, y hasta cuándo.

Su utilidad práctica está en otros objetos: un [DepositPreauth](/objects/DepositPreauth) puede autorizar a "quien tenga estas credenciales" en vez de a una cuenta concreta, y un [PermissionedDomain](/objects/PermissionedDomain) se define por la lista de credenciales que acepta. Un [Payment](/tx/Payment) a una cuenta con `lsfDepositAuth` puede llevar `CredentialIDs` para demostrar que cumple.

## Ciclo de vida

- **Creación**: [CredentialCreate](/tx/CredentialCreate) por el emisor. `preclaim` exige que el sujeto exista y que no haya ya una credencial con la misma tripleta (`Subject`, `Issuer`, `CredentialType`). `doApply` crea el objeto sin el flag `lsfAccepted`, lo enlaza en el directorio del emisor (`IssuerNode`) y en el del sujeto (`SubjectNode`), y cobra la reserva al emisor. Si el emisor se emite a sí mismo, nace aceptada.
- **Aceptación**: [CredentialAccept](/tx/CredentialAccept) por el sujeto. Marca `lsfAccepted` y traslada la reserva: `CredentialAccept::doApply` resta 1 al `OwnerCount` del emisor y suma 1 al del sujeto. Si la credencial ya ha expirado, aceptar la borra en lugar de activarla (`tecEXPIRED`).
- **Borrado**: [CredentialDelete](/tx/CredentialDelete). La pueden borrar el emisor o el sujeto en cualquier momento; cualquiera puede borrarla si ha pasado `Expiration`. [AccountDelete](/tx/AccountDelete) de cualquiera de los dos también la elimina.

Una credencial no aceptada no sirve para nada: `checkCredentials` en `CredentialHelpers.cpp` ignora las que no tienen `lsfAccepted` o han caducado.

## Campos clave

- **Subject** — cuenta sobre la que se afirma algo.
- **Issuer** — cuenta que la emite. Quien la consume (un `DepositPreauth`, un dominio) confía en este emisor, no en el sujeto.
- **CredentialType** — blob hex de 1 a 64 bytes elegido por el emisor. Forma parte de la clave, así que el mismo emisor puede dar varias credenciales distintas a la misma persona.
- **Expiration** — segundos desde el Ripple Epoch. Una vez pasado, la credencial no cuenta aunque siga en el ledger.
- **URI** — hasta 256 bytes hex, normalmente apunta al documento que respalda la afirmación.
- **IssuerNode / SubjectNode** — páginas de los directorios donde está enlazada.

## Flags

- **lsfAccepted** — el sujeto la ha aceptado con `CredentialAccept`. Sin este flag la credencial no se considera válida en ninguna comprobación.

## Cómo consultarlo

`account_objects` con `type: "credential"` la lista tanto para el emisor como para el sujeto. Con `ledger_entry`:

```json
{ "method": "ledger_entry", "params": [{ "credential": { "subject": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy", "issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "credential_type": "4B5943" }, "ledger_index": "validated" }] }
```

La clave es `SHA512Half(0x0044 || Subject || Issuer || CredentialType)` (`keylet::credential`). Respuesta típica:

```json
{
  "node": {
    "LedgerEntryType": "Credential",
    "Subject": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "CredentialType": "4B5943",
    "Expiration": 843000000,
    "URI": "68747470733A2F2F6578616D706C652E636F6D2F6B7963",
    "Flags": 65536,
    "IssuerNode": "0",
    "SubjectNode": "0",
    "PreviousTxnID": "1F2E3D4C5B6A79887766554433221100FFEEDDCCBBAA99887766554433221100",
    "PreviousTxnLgrSeq": 20800120
  }
}
```

## Reserva

1 unidad de reserva de propietario. La paga el emisor hasta que el sujeto acepta; a partir de ahí la paga el sujeto.

## Relacionado

- [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete)
- [DepositPreauth](/objects/DepositPreauth), [PermissionedDomain](/objects/PermissionedDomain), [DID](/objects/DID)
- [Credentials](/amendments/Credentials), [PermissionedDomains](/amendments/PermissionedDomains)
