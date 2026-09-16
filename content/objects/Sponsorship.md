---
title: Sponsorship
summary: Permite a una cuenta pagar la reserva y/o las comisiones de otra, sin cederle control sobre sus fondos.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/sponsorship
createdBy: SponsorshipSet
modifiedBy: SponsorshipSet, SponsorshipTransfer
reserve: 1
---

## Qué representa

Un `Sponsorship` vincula a un `Owner` (el patrocinador) con un `Sponsee` (la cuenta patrocinada): el patrocinador puede asumir la owner reserve de los objetos que cree el patrocinado, o cubrir el coste de sus comisiones de transacción, o ambas cosas, según los flags que active. Es útil para aplicaciones que quieren dar de alta usuarios sin que estos necesiten tener XRP propio desde el primer momento, sin por ello tener custodia de sus claves ni de sus fondos: el patrocinado sigue firmando sus propias transacciones.

Cada objeto que el patrocinado cree mientras el sponsorship está activo puede quedar enlazado a él (vía `LowSponsor`/`HighSponsor` en una `RippleState`, por ejemplo), de forma que su reserva la cuenta el patrocinador y no el patrocinado.

## Ciclo de vida

- **Creación**: [SponsorshipSet](/tx/SponsorshipSet), por el patrocinador, indicando `Sponsee` y qué cubre (`lsfSponsorshipRequireSignForFee`, `lsfSponsorshipRequireSignForReserve`, o ninguno para patrocinio abierto). Puede fijar `MaxFee`, el tope de lo que está dispuesto a cubrir en comisiones.
- **Actualización**: el mismo [SponsorshipSet](/tx/SponsorshipSet) ajusta `MaxFee` o los flags de cobertura sobre un sponsorship existente.
- **Transferencia de objetos patrocinados**: [SponsorshipTransfer](/tx/SponsorshipTransfer) mueve la responsabilidad de reserva de objetos ya creados de un patrocinador a otro (o de vuelta al propio patrocinado), sin tener que recrear los objetos.
- **Borrado**: cuando el patrocinador retira el patrocinio y `RemainingOwnerCount` llega a cero (no quedan objetos patrocinados pendientes de reserva).

## Campos clave

- **Owner** — el patrocinador, quien asume el coste.
- **Sponsee** — la cuenta patrocinada.
- **FeeAmount / MaxFee** — lo ya gastado en comisiones cubiertas y el tope que el patrocinador está dispuesto a asumir.
- **RemainingOwnerCount** — cuántas unidades de owner reserve del patrocinado sigue cubriendo este sponsorship en este momento.
- **OwnerNode / SponseeNode** — páginas del directorio del patrocinador y del patrocinado donde está enlazado.

## Flags

- **lsfSponsorshipRequireSignForFee** — el patrocinador exige firmar (autorizar explícitamente) cada vez que se le carga una comisión, en vez de cubrirla automáticamente hasta `MaxFee`.
- **lsfSponsorshipRequireSignForReserve** — igual, pero para la owner reserve de nuevos objetos del patrocinado.

## Cómo consultarlo

`account_objects` con `type: "sponsorship"` lo devuelve tanto para el patrocinador como para el patrocinado. Con `ledger_entry`, `sponsorship` acepta `sponsor` y `sponsee`:

```json
{ "method": "ledger_entry", "params": [{ "sponsorship": { "sponsor": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "sponsee": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy" }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x003E || AccountID_sponsor || AccountID_sponsee)` (`keylet::sponsorship`, namespace `'>'`). Respuesta típica:

```json
{
  "index": "3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D",
  "node": {
    "LedgerEntryType": "Sponsorship",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Sponsee": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "RemainingOwnerCount": 2,
    "OwnerNode": "0",
    "SponseeNode": "0",
    "Flags": 0
  }
}
```

## Reserva

El objeto `Sponsorship` en sí consume 1 unidad de owner reserve del patrocinador; los objetos que patrocina para el `Sponsee` se descuentan aparte del `OwnerCount` de este último mientras el sponsorship los cubra.

## Relacionado

- [SponsorshipSet](/tx/SponsorshipSet), [SponsorshipTransfer](/tx/SponsorshipTransfer)
- [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [SignerList](/objects/SignerList)
