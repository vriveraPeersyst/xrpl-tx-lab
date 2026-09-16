---
title: NFTokenPage
summary: Una página que agrupa hasta 32 NFTs de una misma cuenta; el conjunto de páginas encadenadas es el "inventario" de NFTs del dueño.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/nftokenpage
createdBy: NFTokenMint
modifiedBy: NFTokenMint, NFTokenBurn, NFTokenAcceptOffer, NFTokenModify
reserve: 0
---

## Qué representa

Los NFTs no son objetos individuales del ledger: viven agrupados en `NFTokenPage`, ordenados por `NFTokenID` dentro de cada página, con hasta 32 por página. Todas las páginas de una misma cuenta forman una lista doblemente enlazada (`PreviousPageMin`/`NextPageMin`) cuyo índice está construido de forma que el propio ID de la página incorpora el `AccountID` del dueño en los primeros bytes; así rippled puede ubicar el rango de páginas de una cuenta sin necesidad de un directorio de propietario aparte.

A diferencia de casi todo lo demás en el ledger, tener NFTs **no consume owner reserve**: puedes acumular cientos de NFTs sin que te cueste XRP adicional por reserva (aunque sí sigue existiendo el coste de cada transacción de mint).

## Ciclo de vida

- **Creación**: [NFTokenMint](/tx/NFTokenMint) inserta el nuevo `NFTokenID` en la página adecuada (ordenado por ID), creando una página nueva si la existente ya tiene 32 tokens o no hay ninguna todavía.
- **Modificación**: [NFTokenBurn](/tx/NFTokenBurn) elimina un token de su página, fusionando o eliminando páginas si quedan vacías o poco llenas. [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer) mueve el token de la página del vendedor a una página del comprador. [NFTokenModify](/tx/NFTokenModify) cambia la `URI` del token sin moverlo de página, solo si el NFT se emitió con `tfMutable`.
- **Borrado**: automático cuando una página se queda sin tokens; no hay una transacción dedicada a borrar la página en sí.

## Campos clave

- **NFTokens** — array ordenado por `NFTokenID`, cada entrada con `NFTokenID`, `URI` (opcional) y los flags/emisor/taxon/número de serie codificados dentro del propio ID.
- **PreviousPageMin / NextPageMin** — enlazan con la página anterior/siguiente de la misma cuenta; ausentes en los extremos de la lista.

## Flags

No tiene flags `lsf*` propios (los flags de cada NFT individual, como `tfBurnable` o `tfMutable`, van codificados dentro del `NFTokenID`, no como `lsf*` del objeto página).

## Cómo consultarlo

`account_objects` con `type: "nft_page"` devuelve todas las páginas de la cuenta; para listar NFTs de forma más directa conviene el método dedicado `account_nfts`. Con `ledger_entry`, `nft_page` solo acepta el ID del objeto directamente:

```json
{ "method": "ledger_entry", "params": [{ "nft_page": "0000000000000000000000000000000000000000000000000000FFFFFFFF", "ledger_index": "validated" }] }
```

Los IDs límite se calculan con `keylet::nftokenPageMin(owner)` (los bytes de `AccountID` en la parte alta, resto a cero) y `keylet::nftokenPageMax(owner)` (los mismos bytes con el resto a `nft::kPageMask`); las páginas intermedias tienen IDs entre ambos. Respuesta típica:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "NFTokenPage",
    "NFTokens": [
      { "NFToken": { "NFTokenID": "000B0000...", "URI": "697066733A2F2F..." } }
    ],
    "PreviousTxnID": "8A6C2E1B4D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E3B5D7F9A1C",
    "PreviousTxnLgrSeq": 20800110
  }
}
```

## Relacionado

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn), [NFTokenModify](/tx/NFTokenModify)
- [NFTokenOffer](/objects/NFTokenOffer)
- [DynamicNFT](/amendments/DynamicNFT)
