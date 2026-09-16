---
title: NFTokenOffer
summary: Una oferta pendiente para comprar o vender un NFT concreto, a un precio fijado por quien la crea.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/nftokenoffer
createdBy: NFTokenCreateOffer
modifiedBy: NFTokenAcceptOffer, NFTokenCancelOffer
reserve: 1
---

## Qué representa

Un `NFTokenOffer` es una propuesta unilateral sobre un [NFT](/objects/NFTokenPage) concreto: comprar (`Owner` es el dueño actual del NFT que la acepta, `Amount` es lo que paga el oferente) o vender (`Owner` es quien ofrece el NFT, `Amount` es lo que pide). El flag `lsfSellNFToken` distingue una dirección de la otra. No mueve nada por sí sola: solo existe hasta que alguien la acepta, la cancela, o expira.

Se puede restringir a un comprador concreto con `Destination`, lo que la convierte en una oferta privada en vez de pública.

## Ciclo de vida

- **Creación**: [NFTokenCreateOffer](/tx/NFTokenCreateOffer). En una oferta de venta, `Account` debe poseer el NFT; en una de compra, `Amount` debe estar disponible. Se enlaza al directorio de `Owner` (`OwnerNode`) y a la lista de ofertas del propio NFT (`NFTokenOfferNode`, dentro de los directorios `nftBuys`/`nftSells`).
- **Aceptación**: [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), por la contraparte (o por cualquiera si no hay `Destination`). Transfiere el NFT y el `Amount`, aplicando el `TransferFee` de la emisión si el que acepta no es el emisor original. Borra la oferta aceptada y cualquier otra oferta de venta/compra incompatible que quedara sobre ese mismo NFT.
- **Cancelación**: [NFTokenCancelOffer](/tx/NFTokenCancelOffer), por cualquier cuenta (no hace falta ser el creador) listando los IDs a cancelar; útil para limpiar ofertas ya expiradas.
- **Expiración**: si `Expiration` ha pasado, la oferta sigue en el ledger pero ya no se puede aceptar; hay que cancelarla explícitamente.

## Campos clave

- **Owner** — el dueño del NFT (siempre, tanto en ofertas de compra como de venta; no es "quien paga la reserva de la oferta", eso lo paga `Account`, el creador de la oferta).
- **NFTokenID** — el NFT sobre el que aplica la oferta.
- **Amount** — precio, en XRP o en token emitido; puede ser cero solo en ofertas de venta dirigidas a un `Destination` concreto (regalo).
- **Destination** — si está presente, solo esa cuenta puede aceptar la oferta.
- **Expiration** — segundos desde el Ripple Epoch; pasado ese momento la oferta ya no es aceptable.
- **OwnerNode / NFTokenOfferNode** — páginas de directorio donde está enlazada la oferta.

## Flags

- **lsfSellNFToken** — la oferta es de venta (el creador ofrece el NFT). Sin este flag, es una oferta de compra (el creador ofrece `Amount` por el NFT).

## Cómo consultarlo

`account_objects` con `type: "nft_offer"` lo devuelve para `Owner`. También aparece en `nft_buy_offers` / `nft_sell_offers` del NFT correspondiente. Con `ledger_entry`, `nft_offer` solo acepta el ID del objeto directamente:

```json
{ "method": "ledger_entry", "params": [{ "nft_offer": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E", "ledger_index": "validated" }] }
```

El ID es `SHA512Half(0x0071 || AccountID_creador || Sequence)` (`keylet::nftokenOffer`, namespace `'q'`), y se encuentra en los metadatos de la `NFTokenCreateOffer` o consultando `nft_buy_offers`/`nft_sell_offers`. Respuesta típica:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "NFTokenOffer",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "NFTokenID": "000B0000...",
    "Amount": "25000000",
    "Flags": 1,
    "OwnerNode": "0",
    "NFTokenOfferNode": "0"
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) de quien crea la oferta (`Account`), no de `Owner`.

## Relacionado

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer)
- [NFTokenPage](/objects/NFTokenPage), [DynamicNFT](/amendments/DynamicNFT)
