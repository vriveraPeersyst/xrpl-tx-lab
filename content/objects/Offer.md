---
title: Offer
summary: Una orden abierta en el libro de órdenes del DEX nativo: ofrece un activo a cambio de otro a un precio dado.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/offer
createdBy: OfferCreate
modifiedBy: OfferCreate
reserve: 1
---

## Qué representa

Un `Offer` es una orden límite: "doy hasta `TakerGets`, a cambio de `TakerPays`". El DEX de XRPL es de libro de órdenes central, no de pools automáticos (eso es [AMM](/objects/AMM)); cada `Offer` se cuelga de un `DirectoryNode` de libro (`BookDirectory`), que agrupa todas las ofertas del mismo par de activos a la misma calidad (precio). La parte de la orden que no se cruza al instante queda viva en el ledger hasta que alguien la cruza, expira, o el propio dueño la cancela.

Puede ser de tipo `lsfSell` (vender exactamente `TakerGets`, aceptando más de `TakerPays` si el mercado mejora) o normal (llenarse exactamente hasta `TakerPays`).

## Ciclo de vida

- **Creación**: [OfferCreate](/tx/OfferCreate). Primero se intenta cruzar contra el libro existente; lo que sobra (si `tfImmediateOrCancel` no está activo) se guarda como `Offer` nuevo, enlazado a `BookDirectory` (`BookNode`) y al directorio del dueño (`OwnerNode`).
- **Cruce parcial o total**: cada [OfferCreate](/tx/OfferCreate) posterior que cruce contra esta orden reduce `TakerPays`/`TakerGets` proporcionalmente; si llega a cero, se borra.
- **Cancelación**: [OfferCancel](/tx/OfferCancel), solo por el propio dueño, indicando el `OfferSequence` a retirar.
- **Caducidad**: si `Expiration` ha pasado, la orden ya no se cruza aunque siga en el ledger; se limpia la primera vez que otra transacción la encuentra caducada (`tecEXPIRED` implícito al recorrer el libro, no un error directo).
- **Borrado en cascada**: [AccountDelete](/tx/AccountDelete) del dueño borra sus ofertas pendientes.

## Campos clave

- **TakerGets / TakerPays** — lo que ofrece y lo que pide el creador de la orden; el ratio entre ambos define el precio (`quality`).
- **BookDirectory / BookNode** — el directorio de libro en el que está indexada esta orden, cuya clave incorpora el precio en los últimos 64 bits.
- **Expiration** — segundos desde el Ripple Epoch; pasado ese momento la orden deja de ser válida para cruzar.
- **DomainID** — si está presente, la orden solo es visible/cruzable dentro de ese [PermissionedDomain](/objects/PermissionedDomain), para mercados con control de acceso.
- **AdditionalBooks** — libros adicionales (aparte del principal calculado por `TakerPays`/`TakerGets`) en los que también aparece indexada esta orden, usado con dominios permisionados.

## Flags

- **lsfPassive** — la orden no cruza contra otras órdenes al mismo precio exacto al crearse; solo se cuelga en el libro.
- **lsfSell** — vender exactamente `TakerGets`, aceptando recibir más de `TakerPays` si hay mejor precio disponible, en vez de limitarse a esa cantidad exacta.
- **lsfHybrid** — la orden participa tanto en el libro abierto como en un libro de dominio permisionado (requiere `DomainID` y `AdditionalBooks`).

## Cómo consultarlo

`account_objects` con `type: "offer"` lo devuelve para su dueño; `book_offers` recorre el libro de un par de activos. Con `ledger_entry`, `offer` acepta `account` y `seq` (la `Sequence` de la `OfferCreate`):

```json
{ "method": "ledger_entry", "params": [{ "offer": { "account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x006F || AccountID_dueño || Sequence)` (`keylet::offer`, namespace `'o'`). Respuesta típica:

```json
{
  "index": "1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B",
  "node": {
    "LedgerEntryType": "Offer",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "TakerGets": "10000000",
    "TakerPays": { "currency": "USD", "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "value": "5" },
    "BookDirectory": "4627DFFCFF8B5A265EDBD8AE8C14A52325DBFEDAF4F5C32DAD9E0FE5E8A2AF6",
    "Flags": 0,
    "OwnerNode": "0",
    "BookNode": "0"
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del dueño mientras exista.

## Relacionado

- [OfferCreate](/tx/OfferCreate), [OfferCancel](/tx/OfferCancel)
- [AMM](/objects/AMM), [DirectoryNode](/objects/DirectoryNode), [PermissionedDomain](/objects/PermissionedDomain)
