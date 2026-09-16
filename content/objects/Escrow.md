---
title: Escrow
summary: Retiene XRP hasta que se cumple una condición criptográfica, pasa un tiempo mínimo, o ambas cosas.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/escrow
createdBy: EscrowCreate
modifiedBy: EscrowFinish, EscrowCancel
reserve: 1
---

## Qué representa

Un `Escrow` bloquea XRP fuera del balance disponible del emisor hasta que se cumple una condición: que pase `FinishAfter`, que alguien presente el cumplimiento de una `Condition` criptográfica (crypto-condition PREIMAGE-SHA-256), o ambas. Mientras existe, el XRP no cuenta como balance gastable de `Account` pero sí como parte de su `Balance` total (afecta a cálculos de reserva del emisor de forma indirecta, no directa: el escrow en sí consume 1 unidad de owner reserve).

Solo soporta XRP, nunca tokens emitidos ni MPT: `Amount` es siempre un STAmount en drops.

## Ciclo de vida

- **Creación**: [EscrowCreate](/tx/EscrowCreate). `preflight` exige al menos uno de `CancelAfter`, `FinishAfter` o `Condition`, y valida el formato de la condición si se da. `doApply` crea el objeto, lo enlaza al directorio del emisor (`OwnerNode`) y, si aplica, al del destino (`DestinationNode`), y suma 1 al `OwnerCount` del emisor.
- **Liberación**: [EscrowFinish](/tx/EscrowFinish), por cualquier cuenta (no hace falta ser el emisor ni el destino). Si hay `Condition`, hay que aportar `Fulfillment` que la satisfaga; si hay `FinishAfter`, el `close_time` del ledger tiene que haberlo superado. El objeto se borra y el XRP pasa a `Destination`.
- **Cancelación**: [EscrowCancel](/tx/EscrowCancel), solo posible tras `CancelAfter`. Devuelve el XRP a `Account` y borra el objeto. Sin `CancelAfter` el escrow no se puede cancelar nunca: solo se libera con `EscrowFinish`.
- **Borrado en cascada**: [AccountDelete](/tx/AccountDelete) del emisor o del destino falla si aún quedan escrows pendientes; hay que resolverlos antes.

## Campos clave

- **Account** — el emisor, quien paga y a quien se le cobra la reserva.
- **Destination** — quien recibe el XRP al liberarse.
- **Amount** — XRP en drops, fijado en la creación; no cambia.
- **Condition** — crypto-condition en formato binario (DER). Si está presente, `EscrowFinish` exige un `Fulfillment` válido.
- **CancelAfter / FinishAfter** — segundos desde el Ripple Epoch (2000-01-01). `FinishAfter` es el momento a partir del cual se puede finalizar; `CancelAfter`, a partir del cual se puede cancelar.
- **OwnerNode / DestinationNode** — páginas del directorio del emisor y del destino donde está enlazado el objeto.
- **TransferRate / IssuerNode** — reservados para escrows con `Condition` de tipo especial; en la práctica no se usan en escrows XRP normales.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "escrow"` lo devuelve para el emisor y, si está enlazado, para el destino. Con `ledger_entry`, `escrow` acepta `owner` (la cuenta emisora) y `seq` (la `Sequence` de la `EscrowCreate`):

```json
{ "method": "ledger_entry", "params": [{ "escrow": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0075 || AccountID_emisor || Sequence)` (`keylet::escrow`). Respuesta típica:

```json
{
  "index": "6516969F8B7997F87A54F92FA5A2D3BC5BE4A7A7E6B8B0E9F4B5A7C9E1B3D5F",
  "node": {
    "LedgerEntryType": "Escrow",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Amount": "10000000",
    "CancelAfter": 545440232,
    "FinishAfter": 545354800,
    "Condition": "A0258020E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855810100",
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

- [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish), [EscrowCancel](/tx/EscrowCancel)
- [Check](/objects/Check), [PayChannel](/objects/PayChannel), [AccountRoot](/objects/AccountRoot)
- [Escrow](/amendments/Escrow), [CryptoConditions](/amendments/CryptoConditions)
