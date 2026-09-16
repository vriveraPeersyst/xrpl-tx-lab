---
title: NFTokenCancelOffer
summary: Elimina una o varias ofertas de NFT (hasta 500) que sean tuyas, te tengan como destino o hayan caducado.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokencanceloffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: básico
---

## Qué hace

`NFTokenCancelOffer` borra objetos [NFTokenOffer](/objects/NFTokenOffer) del ledger y devuelve a su creador la reserva que ocupaban. Es una transacción de limpieza: acepta una lista de identificadores en `NFTokenOffers` y elimina todos los que existan, siempre que tengas derecho sobre cada uno.

Tienes derecho a cancelar una oferta si se cumple cualquiera de estas condiciones: eres su `Owner` (la creaste), eres su `Destination`, o su `Expiration` ya ha pasado. Este último caso permite a cualquiera retirar ofertas caducadas que ocupan reserva ajena.

## Cuándo usarlo

- Retirar una oferta de venta o compra que ya no te interesa.
- Como destinatario de una oferta privada, rechazarla de forma explícita.
- Limpiar ofertas caducadas de terceros (por ejemplo, tras una quema con más de 500 ofertas, que deja huérfanas las restantes).

## Cómo funciona por dentro

**`NFTokenCancelOffer::preflight`**:
- `NFTokenOffers` vacío o con más de 500 entradas (`kMaxTokenOfferCancelCount`) → `temMALFORMED`.
- Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) activo (sí en testnet), cualquier identificador a cero → `temMALFORMED`.
- Identificadores repetidos en la lista → `temMALFORMED` (se ordena y se buscan adyacentes iguales).

**`NFTokenCancelOffer::preclaim`** recorre la lista y devuelve `tecNO_PERMISSION` en cuanto encuentra una entrada que no puedas cancelar. Para cada ID:
- Si no existe ningún objeto con ese ID, se ignora (no es error).
- Si existe pero no es de tipo `NFTokenOffer` → `tecNO_PERMISSION`.
- Si su `Expiration` ya ha pasado → permitido.
- Si `Owner` es tu cuenta → permitido.
- Si `Destination` es tu cuenta → permitido.
- En cualquier otro caso → `tecNO_PERMISSION`.

**`NFTokenCancelOffer::doApply`**: para cada ID, si la oferta existe la borra con `nft::deleteTokenOffer`, que la quita del directorio de su propietario y del directorio de compras/ventas del token y decrementa el `OwnerCount` del propietario. Un fallo al borrar devuelve `tefBAD_LEDGER`.

No consume ni exige reserva. Como los IDs inexistentes se ignoran, la transacción tiene éxito aunque parte de la lista ya haya sido cancelada o consumida por una aceptación.

## Campos clave

- **NFTokenOffers** — array de hashes de 64 hex. Son los `LedgerIndex` de los objetos `NFTokenOffer`, no los `NFTokenID`. Los obtienes de `nft_sell_offers`, `nft_buy_offers` o del `CreatedNode` de la transacción que creó la oferta. Máximo 500, sin duplicados ni ceros.

## Errores habituales

- **temMALFORMED** — lista vacía, más de 500 entradas, duplicados o un hash a cero (el ejemplo por defecto lleva ceros; sustitúyelo).
- **tecNO_PERMISSION** — alguna entrada apunta a una oferta que no es tuya, no te tiene como destino y no ha caducado, o a un objeto que no es una oferta de NFT.

## Ejemplo

```json
{
  "TransactionType": "NFTokenCancelOffer",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenOffers": [
    "0000000000000000000000000000000000000000000000000000000000000000"
  ]
}
```

Sustituye el hash por el `nft_offer_index` real. Puedes listar varios.

## Pruébalo en testnet

1. Crea una oferta de venta con [NFTokenCreateOffer](/tx/NFTokenCreateOffer) sobre un NFT tuyo.
2. Consulta `nft_sell_offers` con el `NFTokenID` y copia el `nft_offer_index`.
3. Carga el ejemplo, pega ese índice en `NFTokenOffers` y envía.
4. Vuelve a `nft_sell_offers`: responde `objectNotFound`. En `account_info`, `OwnerCount` ha bajado en 1.
5. Reenvía la misma transacción: sigue devolviendo `tesSUCCESS` porque los IDs inexistentes se ignoran.
6. Para ver `tecNO_PERMISSION`, pide a otra cuenta que cree una oferta sin `Destination` e intenta cancelarla tú.

## Relacionado

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenBurn](/tx/NFTokenBurn)
- [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
