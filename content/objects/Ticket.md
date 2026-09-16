---
title: Ticket
summary: Reserva un número de secuencia para usarlo más tarde, fuera de orden, en vez de gastar la Sequence normal de la cuenta.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ticket
createdBy: TicketCreate
modifiedBy: (ninguna; se consume al usarse en cualquier transacción)
reserve: 1
---

## Qué representa

Normalmente cada transacción de una cuenta debe llevar la `Sequence` exacta, siguiente a la última usada, en orden estricto. Un `Ticket` rompe esa exigencia: reserva un número por adelantado que luego se puede gastar en cualquier momento, en cualquier orden respecto a las demás transacciones de la cuenta, simplemente poniendo `Sequence: 0` y `TicketSequence: <número del ticket>` en la transacción que lo usa.

Es útil para flujos donde varias transacciones se preparan de antemano y se firman offline pero se envían en un orden que no se puede garantizar (multifirma con varios firmantes trabajando en paralelo, transacciones condicionadas a eventos externos), o simplemente para reservar un hueco de secuencia que se rellenará más adelante.

## Ciclo de vida

- **Creación**: [TicketCreate](/tx/TicketCreate) puede crear varios de golpe (`TicketCount`), consumiendo `Sequence` normales consecutivas de la cuenta para numerarlos. Cada uno se convierte en un `Ticket` independiente.
- **Consumo**: cualquier transacción posterior de la cuenta que use `TicketSequence` en vez de `Sequence` consume (borra) ese `Ticket` al aplicarse, sea cual sea el tipo de transacción — no hay una transacción "TicketUse" separada.
- **Cancelación explícita**: no existe; para deshacerse de un ticket sin usarlo hay que gastarlo en una transacción trivial (p. ej. un `AccountSet` sin cambios) o dejarlo sin usar indefinidamente (sigue consumiendo reserva).

## Campos clave

- **Account** — dueño del ticket, quien paga su reserva.
- **TicketSequence** — el número reservado; es lo que se referencia desde otra transacción en su campo `TicketSequence`, en lugar de `Sequence`.
- **OwnerNode** — página del directorio de la cuenta donde está enlazado.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "ticket"` lo devuelve para la cuenta. Con `ledger_entry`, `ticket` acepta `account` y `ticket_seq`:

```json
{ "method": "ledger_entry", "params": [{ "ticket": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ticket_seq": 20790114 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0054 || AccountID || TicketSequence)` (`keylet::ticket`, namespace `'T'`). Respuesta típica:

```json
{
  "index": "4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E",
  "node": {
    "LedgerEntryType": "Ticket",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "TicketSequence": 20790114,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) por cada ticket vivo, hasta que se use o hasta que se borre la cuenta.

## Relacionado

- [TicketCreate](/tx/TicketCreate)
- [AccountRoot](/objects/AccountRoot), [SignerList](/objects/SignerList)
