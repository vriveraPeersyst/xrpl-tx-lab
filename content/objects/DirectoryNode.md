---
title: DirectoryNode
summary: Página de un índice interno del ledger: lista los IDs de los objetos de una cuenta o las ofertas de un libro a un mismo precio.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/directorynode
createdBy: Payment, OfferCreate, TrustSet, EscrowCreate, NFTokenCreateOffer
modifiedBy: OfferCancel, EscrowFinish, AccountDelete
reserve: 0
---

## Qué representa

El ledger es un árbol de objetos indexados por hash; no tiene una forma nativa de responder "¿qué objetos tiene esta cuenta?" o "¿qué ofertas hay a este precio?". Los `DirectoryNode` son el índice que resuelve eso: cada uno es una página con hasta 32 IDs de objetos (`Indexes`) y punteros a la página anterior y siguiente. Tres usos:

- **Directorio de propietario** (`Owner` presente): lista todo lo que posee una cuenta. Es lo que recorre `account_objects`.
- **Directorio de libro** (`TakerPays*`/`TakerGets*` presentes): todas las [Offer](/objects/Offer) de un par de activos a una misma calidad (precio). El precio va incrustado en los últimos 64 bits de la clave.
- **Directorios de ofertas NFT** (`NFTokenID` presente): las ofertas de compra o de venta de un NFT concreto ([NFTokenOffer](/objects/NFTokenOffer)).

Es un objeto de infraestructura: nunca lo creas ni lo borras directamente.

## Ciclo de vida

- **Creación**: la primera vez que una cuenta obtiene un objeto (una línea de confianza con [TrustSet](/tx/TrustSet), una oferta con [OfferCreate](/tx/OfferCreate), un escrow…), `dirInsert` en `View.cpp` crea la página raíz de su directorio. Cuando la raíz se llena, crea la siguiente página y la enlaza con `IndexNext`/`IndexPrevious`. Un libro se crea con la primera oferta a ese precio.
- **Modificación**: cada alta o baja de objeto añade o quita un ID de `Indexes`.
- **Borrado**: `dirRemove` borra una página cuando se queda vacía. Un directorio de propietario desaparece del todo con [AccountDelete](/tx/AccountDelete). El límite de páginas es 262 144 ([fixDirectoryLimit](/amendments/fixDirectoryLimit)); al llegar, las altas fallan con `tecDIR_FULL`.

## Campos clave

- **RootIndex** — clave de la página raíz del directorio. En la raíz coincide con `index`.
- **Indexes** — hasta 32 IDs de objetos. En las páginas que no son la raíz el orden es de inserción; en los libros, el orden dentro de una misma calidad es cronológico.
- **IndexNext / IndexPrevious** — número de página (no hash) de las páginas vecinas; la clave de una página N es `SHA512Half(0x0064 || RootIndex || N)` (`keylet::page`). Faltan si solo hay una página.
- **Owner** — la cuenta dueña, solo en directorios de propietario.
- **TakerPaysCurrency / TakerPaysIssuer / TakerGetsCurrency / TakerGetsIssuer** — el par del libro. Con MPT se usan `TakerPaysMPT` / `TakerGetsMPT`.
- **ExchangeRate** — la calidad del libro codificada en 64 bits, la misma que va en los últimos 8 bytes de la clave.
- **DomainID** — presente en los libros de un dominio permisionado ([PermissionedDEX](/amendments/PermissionedDEX)).
- **NFTokenID** — el NFT cuyas ofertas lista, en directorios `nftBuys` / `nftSells`.
- **PreviousTxnID / PreviousTxnLgrSeq** — solo en directorios de propietario y desde [fixPreviousTxnID](/amendments/fixPreviousTxnID).

## Flags

- **lsfNFTokenBuyOffers** — directorio de ofertas de compra de un NFT.
- **lsfNFTokenSellOffers** — directorio de ofertas de venta de un NFT.

En el resto de directorios `Flags` es 0.

## Cómo consultarlo

No aparece en `account_objects` (no cuenta como objeto propio). Con `ledger_entry` usa `directory` con `owner` o con `dir_root`, y opcionalmente `sub_index` para páginas posteriores:

```json
{ "method": "ledger_entry", "params": [{ "directory": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "sub_index": 0 }, "ledger_index": "validated" }] }
```

La raíz de un propietario es `SHA512Half(0x004F || AccountID)` (`keylet::ownerDir`). Para libros, `book_offers` es más práctico. Respuesta típica:

```json
{
  "index": "A6C6EB0E3D2F1B8C9A7D5E4F3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B",
  "node": {
    "LedgerEntryType": "DirectoryNode",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "RootIndex": "A6C6EB0E3D2F1B8C9A7D5E4F3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B",
    "Indexes": [
      "C4A46CCD8F096E994C4B0DEAB6CE98E722FC17D7944C28B95F0A5F5B0E5D2A6B",
      "E6E7F1C4E2B9F0AB0C5A2B7E3D9C1F5A8B4D6E2C0F9A7B3D5E1C8F4A6B2D0E9C"
    ],
    "Flags": 0,
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Reserva

Ninguna. Las páginas de directorio no suman a `OwnerCount`; pagas por los objetos que contienen, no por el índice.

## Relacionado

- [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet), [AccountDelete](/tx/AccountDelete)
- [AccountRoot](/objects/AccountRoot), [Offer](/objects/Offer), [NFTokenOffer](/objects/NFTokenOffer)
- [fixDirectoryLimit](/amendments/fixDirectoryLimit), [fixPreviousTxnID](/amendments/fixPreviousTxnID), [SortedDirectories](/amendments/SortedDirectories)
