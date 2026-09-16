---
title: Check
summary: Un cheque diferido: el emisor autoriza un pago hasta un máximo y el destinatario decide cuándo y cuánto cobrar.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/check
createdBy: CheckCreate
modifiedBy: CheckCash, CheckCancel
reserve: 1
---

## Qué representa

Un `Check` funciona como un cheque bancario. Quien lo emite no mueve fondos: solo deja en el ledger una promesa de pagar hasta `SendMax` a `Destination`. El destinatario lo cobra cuando quiere con [CheckCash](/tx/CheckCash), y en ese momento se comprueba que el emisor tenga saldo. Si no lo tiene, el cheque rebota (`tecUNFUNDED`) pero sigue existiendo.

Es la forma de "empujar" un pago a alguien que tiene `lsfDepositAuth` o `lsfRequireDestTag`, o de dejar que el receptor elija el momento fiscal o de liquidez para cobrar.

## Ciclo de vida

- **Creación**: [CheckCreate](/tx/CheckCreate). `preclaim` exige que el destino exista, que no tenga `lsfDisallowIncomingCheck`, y que el cheque no haya nacido ya caducado. `doApply` crea el objeto, lo enlaza en el directorio del emisor (`OwnerNode`) y en el del destino (`DestinationNode`), y suma 1 al `OwnerCount` del emisor.
- **Cobro**: [CheckCash](/tx/CheckCash) por parte del destinatario, con `Amount` exacto o `DeliverMin`. Si el cheque es de un token y el destinatario no tiene línea de confianza, con [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) se crea sola. Al cobrar, el objeto se borra siempre, incluso si se cobra menos de `SendMax`.
- **Cancelación**: [CheckCancel](/tx/CheckCancel). La puede enviar el emisor o el destinatario en cualquier momento; cualquier cuenta puede cancelarlo si ya ha pasado `Expiration`.
- **Borrado en cascada**: [AccountDelete](/tx/AccountDelete) del emisor o del destino borra los cheques asociados.

## Campos clave

- **Account** — emisor, quien pagará. La reserva se le cobra a él.
- **Destination** — único que puede cobrarlo.
- **SendMax** — tope que se transfiere, en drops o en token emitido. Si es un token, el `issuer` es el emisor del token, y al cobrar se aplica su `TransferRate`.
- **Sequence** — la secuencia (o el ticket) de la `CheckCreate`; junto con `Account` forma la clave del objeto.
- **Expiration** — segundos desde el Ripple Epoch (2000-01-01). Pasado ese momento `CheckCash` falla con `tecEXPIRED` y cualquiera puede cancelarlo.
- **InvoiceID** — hash de 256 bits libre para que el emisor referencie una factura.
- **OwnerNode / DestinationNode** — páginas del directorio del emisor y del destino donde está enlazado.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "check"` lo devuelve tanto para el emisor como para el destinatario. Con `ledger_entry`, `check` acepta solo el ID del objeto:

```json
{ "method": "ledger_entry", "params": [{ "check": "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B", "ledger_index": "validated" }] }
```

El ID es `SHA512Half(0x0043 || AccountID_emisor || Sequence)` (`keylet::check`), y lo encuentras en los metadatos de la `CheckCreate` (`CreatedNode.LedgerIndex`). Respuesta típica:

```json
{
  "index": "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B",
  "node": {
    "LedgerEntryType": "Check",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "SendMax": "50000000",
    "Sequence": 20790113,
    "Expiration": 812000000,
    "DestinationTag": 42,
    "InvoiceID": "6F1DFD1D0FE8A32E40E1F2C05CF1C15545BAB56B617F9C6C2D63A6B704BEF59B",
    "OwnerNode": "0",
    "DestinationNode": "0",
    "Flags": 0,
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del emisor mientras exista.

## Relacionado

- [CheckCreate](/tx/CheckCreate), [CheckCash](/tx/CheckCash), [CheckCancel](/tx/CheckCancel)
- [Escrow](/objects/Escrow), [PayChannel](/objects/PayChannel), [AccountRoot](/objects/AccountRoot)
- [Checks](/amendments/Checks), [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine), [DisallowIncoming](/amendments/DisallowIncoming)
