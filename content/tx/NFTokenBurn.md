---
title: NFTokenBurn
summary: Destruye un NFToken de forma permanente y elimina hasta 500 ofertas asociadas a él.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenburn
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: básico
---

## Qué hace

`NFTokenBurn` borra un token de la [NFTokenPage](/objects/NFTokenPage) que lo contiene. Si la página queda vacía se elimina y el `OwnerCount` del propietario baja. Además incrementa `BurnedNFTokens` en el `AccountRoot` del emisor y limpia las ofertas de compra y venta que apuntaban a ese token.

Normalmente lo envía el propietario del token. Pero si el NFT se acuñó con `tfBurnable`, también puede quemarlo el emisor (o la cuenta que el emisor tenga como `NFTokenMinter`) aunque el token esté en manos de otra cuenta: en ese caso se indica el propietario actual en `Owner`.

## Cuándo usarlo

- Retirar un coleccionable o entrada que ya se ha canjeado.
- Como emisor con `tfBurnable`, revocar un certificado o licencia que ya no es válida.
- Liberar reserva: si era el último token de una página, recuperas 0,2 XRP de reserva de propietario.

## Cómo funciona por dentro

**`NFTokenBurn::preflight`** no hace comprobaciones propias; solo aplican las genéricas (fee, firma, flags universales).

**`NFTokenBurn::preclaim`**:
1. Determina el propietario: `Owner` si está presente, si no `Account`.
2. Busca el token en las páginas de ese propietario (`nft::findToken`). Si no está → `tecNO_ENTRY`.
3. Si `Owner` es distinto de `Account`:
   - el token debe llevar el flag `kFlagBurnable` en su ID; si no → `tecNO_PERMISSION`;
   - `Account` debe ser el emisor codificado en el ID, o bien la cuenta que ese emisor tenga en `NFTokenMinter`; si no → `tecNO_PERMISSION`.

**`NFTokenBurn::doApply`**:
1. `nft::removeToken` quita el token de la página del propietario (fusionando o borrando páginas según haga falta).
2. Suma 1 a `BurnedNFTokens` en la cuenta del emisor si esa cuenta existe.
3. Borra ofertas de venta del token (`keylet::nftSells`) hasta un máximo de 500 entradas (`kMaxDeletableTokenOfferEntries`); si sobran, sigue con las de compra (`keylet::nftBuys`) hasta completar ese máximo. Las ofertas que no quepan en el límite quedan huérfanas y se pueden cancelar después con [NFTokenCancelOffer](/tx/NFTokenCancelOffer).

No hay comprobación de reserva: quemar solo libera espacio.

## Campos clave

- **NFTokenID** — identificador de 64 caracteres hex del token. Recuerda que lleva codificados el emisor y los flags; el nodo los lee directamente del ID sin consultar nada más.
- **Owner** — solo cuando quemas un token que no es tuyo. Debe ser la cuenta que lo tiene ahora mismo.

## Errores habituales

- **tecNO_ENTRY** — el token no está en las páginas del propietario indicado. Suele ser un `NFTokenID` mal copiado o un `Owner` desactualizado (el token cambió de manos).
- **tecNO_PERMISSION** — intentas quemar un token ajeno sin `tfBurnable`, o lo tiene `tfBurnable` pero tú no eres su emisor ni el `NFTokenMinter` del emisor.
- **temDISABLED** — no ocurre en testnet: el amendment `NonFungibleTokensV1_1` está activo.

## Ejemplo

```json
{
  "TransactionType": "NFTokenBurn",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Sustituye `NFTokenID` por uno real de `account_nfts`. Para quemar un token ajeno con `tfBurnable` añade `"Owner": "rYYYY_OTRA_CUENTA"`.

## Pruébalo en testnet

1. Acuña un token con [NFTokenMint](/tx/NFTokenMint) usando `Flags: 9` (`tfBurnable` + `tfTransferable`).
2. Consulta `account_nfts` y copia el `NFTokenID`.
3. Opcional: crea una oferta de venta con [NFTokenCreateOffer](/tx/NFTokenCreateOffer) para ver cómo la quema la elimina.
4. Carga el ejemplo con ese `NFTokenID`, firma y envía.
5. Vuelve a `account_nfts`: el token ya no está. En `account_info` verás `BurnedNFTokens` incrementado en el emisor, y si tenías una sola página, `OwnerCount` ha bajado en 1.
6. Si creaste la oferta, `nft_sell_offers` con ese ID ahora responde con error `objectNotFound`.

## Relacionado

- [NFTokenMint](/tx/NFTokenMint), [NFTokenCancelOffer](/tx/NFTokenCancelOffer)
- [NFTokenPage](/objects/NFTokenPage), [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1)
