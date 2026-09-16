---
title: MPToken
summary: El saldo que una cuenta tiene de un Multi-Purpose Token concreto; el equivalente de RippleState pero para MPT.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/mptoken
createdBy: MPTokenAuthorize
modifiedBy: MPTokenAuthorize, Payment, Clawback
reserve: 1
---

## Qué representa

Un `MPToken` es el registro de que una cuenta tiene (o puede llegar a tener) unidades de un [MPTokenIssuance](/objects/MPTokenIssuance) concreto. A diferencia de una línea de confianza, no hace falta negociación bidireccional de límites: el titular simplemente "opta a entrar" (opt-in) creando este objeto, y desde ahí puede recibir el MPT si el emisor lo permite. Un objeto por cuenta y por emisión; nunca se comparte entre cuentas.

Si la emisión tiene `lsfMPTRequireAuth`, el `MPToken` empieza sin `lsfMPTAuthorized` y no puede recibir fondos hasta que el emisor lo autorice explícitamente.

## Ciclo de vida

- **Creación**: [MPTokenAuthorize](/tx/MPTokenAuthorize) sin flag `tfMPTUnauthorize`, enviado por el futuro titular sobre su propia cuenta (nunca con `Holder`). Crea el objeto con `MPTAmount` a cero y suma 1 al `OwnerCount` del titular.
- **Autorización**: si la emisión exige `lsfMPTRequireAuth`, el emisor envía [MPTokenAuthorize](/tx/MPTokenAuthorize) con `Holder` apuntando al titular, para marcar `lsfMPTAuthorized` en su `MPToken` sin crear uno nuevo.
- **Movimiento de saldo**: [Payment](/tx/Payment) con `Amount` en MPT, o `Clawback` del emisor, ajustan `MPTAmount`. Si la emisión tiene `lsfMPTCanLock`, también puede quedar congelado (`lsfMPTLocked`) o parcialmente bloqueado vía `LockedAmount`.
- **Borrado**: [MPTokenAuthorize](/tx/MPTokenAuthorize) con `tfMPTUnauthorize`, solo si `MPTAmount` y `LockedAmount` están a cero. Reduce el `OwnerCount` del titular en 1.

## Campos clave

- **Account** — el titular del saldo.
- **MPTokenIssuanceID** — identificador de 192 bits de la emisión a la que pertenece (`keylet::mptokenIssuance`).
- **MPTAmount** — saldo actual, en las unidades mínimas definidas por `AssetScale` de la emisión.
- **LockedAmount** — parte del saldo bloqueada (p. ej. por un `Escrow` de MPT o por el emisor), no disponible para gastar.
- **ConfidentialBalanceInbox / ConfidentialBalanceSpending / ConfidentialBalanceVersion** — solo si la emisión soporta balances confidenciales: saldo cifrado pendiente de fusionar y saldo cifrado disponible para gastar.

## Flags

- **lsfMPTLocked** — el saldo está congelado por completo; no se puede enviar ni recibir.
- **lsfMPTAuthorized** — el emisor ha autorizado a este titular a operar (solo relevante si la emisión exige `lsfMPTRequireAuth`).
- **lsfMPTAMM** — el titular de este `MPToken` es un pool de AMM.

## Cómo consultarlo

`account_objects` con `type: "mptoken"` lo devuelve para el titular. Con `ledger_entry`, `mptoken` acepta `mpt_issuance_id` y `account`:

```json
{ "method": "ledger_entry", "params": [{ "mptoken": { "mpt_issuance_id": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F", "account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0074 || MPTokenIssuanceID || AccountID_titular)` (`keylet::mptoken`, namespace `'t'`). Respuesta típica:

```json
{
  "index": "7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C",
  "node": {
    "LedgerEntryType": "MPToken",
    "Account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "MPTokenIssuanceID": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F",
    "MPTAmount": "5000",
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del titular.

## Relacionado

- [MPTokenAuthorize](/tx/MPTokenAuthorize), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [RippleState](/objects/RippleState)
