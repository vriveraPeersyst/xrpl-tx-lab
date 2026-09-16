---
title: Delegate
summary: Registra qué permisos ha delegado una cuenta en otra para que envíe ciertas transacciones en su nombre.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/delegate
createdBy: DelegateSet
modifiedBy: DelegateSet
reserve: 1
---

## Qué representa

Un `Delegate` es un poder notarial limitado. La cuenta `Account` autoriza a la cuenta `Authorize` a firmar y enviar determinadas transacciones como si fuera ella. La transacción delegada lleva el campo `Delegate` con la dirección del apoderado y se firma con las claves del apoderado; la comisión la paga el apoderado, pero los efectos (y la `Sequence`) son de la cuenta delegante.

Los permisos pueden ser tipos de transacción completos (`Payment`, `TrustSet`, `OfferCreate`…) o permisos granulares como `PaymentMint`, `PaymentBurn`, `TrustlineAuthorize`, `TrustlineFreeze`, `AccountDomainSet` o `MPTokenIssuanceLock`. Los tipos marcados como no delegables en `transactions.macro` (por ejemplo `AccountDelete`, `SetRegularKey`, `SignerListSet`, `DelegateSet`, `Batch`) nunca pueden aparecer aquí.

**Estado en testnet**: [DelegateSet](/tx/DelegateSet) requiere el amendment [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1), que hoy no está activado. No podrás crear este objeto en la testnet pública hasta que se active.

## Ciclo de vida

- **Creación y modificación**: [DelegateSet](/tx/DelegateSet) con la lista completa de `Permissions`. Si el objeto no existe, `DelegateSet::doApply` lo crea, lo enlaza en el directorio del delegante (`OwnerNode`) y en el del apoderado (`DestinationNode`) y cobra 1 de reserva al delegante. Si existe, sustituye la lista entera; no hay "añadir uno".
- **Borrado**: enviar `DelegateSet` con `Permissions` vacío borra el objeto y devuelve la reserva. [AccountDelete](/tx/AccountDelete) de cualquiera de las dos cuentas también lo elimina.

`preflight` rechaza permisos duplicados, más de 10 permisos, delegarse a uno mismo y cualquier permiso no delegable.

## Campos clave

- **Account** — quien delega. Sus fondos y su estado son los que se ven afectados.
- **Authorize** — quien recibe el poder. Es quien firma las transacciones delegadas.
- **Permissions** — array de `Permission` con `PermissionValue`. Un tipo de transacción se codifica como su número de tipo + 1; los permisos granulares tienen valores propios (65537 en adelante). En JSON se muestran por nombre.
- **OwnerNode / DestinationNode** — páginas de los directorios del delegante y del apoderado.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "delegate"` en cualquiera de las dos cuentas. Con `ledger_entry`:

```json
{ "method": "ledger_entry", "params": [{ "delegate": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

La clave es `SHA512Half(0x0083 || Account || Authorize)` (`keylet::delegate`). Respuesta típica:

```json
{
  "node": {
    "LedgerEntryType": "Delegate",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Authorize": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Permissions": [
      { "Permission": { "PermissionValue": "Payment" } },
      { "Permission": { "PermissionValue": "TrustlineAuthorize" } }
    ],
    "Flags": 0,
    "OwnerNode": "0",
    "DestinationNode": "0",
    "PreviousTxnID": "0A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718293A4B5C6D7E8F9",
    "PreviousTxnLgrSeq": 20800140
  }
}
```

## Reserva

1 unidad de reserva de propietario a cargo de la cuenta delegante.

## Relacionado

- [DelegateSet](/tx/DelegateSet), [Payment](/tx/Payment), [TrustSet](/tx/TrustSet)
- [SignerList](/objects/SignerList), [AccountRoot](/objects/AccountRoot)
- [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1)
