---
title: NFTokenCreateOffer
summary: Publica una oferta de venta (si tienes el NFT) o de compra (si lo tiene otro) por XRP o por un token emitido.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokencreateoffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: intermedio
---

## Qué hace

`NFTokenCreateOffer` crea un objeto [NFTokenOffer](/objects/NFTokenOffer) en el ledger. Hay dos modos, decididos por el flag `tfSellNFToken`:

- **Oferta de venta** (`Flags: 1`): tú posees el token y fijas el precio en `Amount`. Puede ser 0 para regalarlo.
- **Oferta de compra** (sin flag): el token lo tiene otra cuenta, que indicas en `Owner`, y `Amount` es lo que ofreces pagar (debe ser mayor que 0).

La oferta no mueve nada por sí sola. Se ejecuta cuando la contraparte (o un intermediario) la acepta con [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer). Cada oferta consume una unidad de reserva de propietario (0,2 XRP en testnet).

## Cuándo usarlo

- Vender o regalar un NFT a una cuenta concreta (`Destination`) o a quien quiera aceptarla.
- Pujar por un NFT ajeno.
- Preparar una operación con intermediario: vendedor y comprador crean sus ofertas y un tercero las casa cobrando `NFTokenBrokerFee`.

## Cómo funciona por dentro

**`NFTokenCreateOffer::preflight`** delega en `nft::tokenOfferCreatePreflight`, que lee los flags del propio `NFTokenID`:
- `Amount` negativo → `temBAD_AMOUNT`.
- Si el NFT tiene `tfOnlyXRP` y `Amount` no es XRP → `temBAD_AMOUNT`. Un importe en token emitido igual a 0 también es `temBAD_AMOUNT`.
- Oferta de compra con `Amount` 0 → `temBAD_AMOUNT`.
- `Expiration` igual a 0 → `temBAD_EXPIRATION`.
- `Owner` es obligatorio en ofertas de compra y prohibido en las de venta; en ambos casos contrarios → `temMALFORMED`. `Owner` o `Destination` iguales a `Account` → `temMALFORMED`.

**`NFTokenCreateOffer::preclaim`**:
- `Expiration` ya pasada → `tecEXPIRED`.
- El token debe estar en las páginas de la cuenta correcta: la tuya si vendes, la de `Owner` si compras. Si no → `tecNO_ENTRY`.
- `nft::tokenOfferCreatePreclaim`:
  - Si el precio es un token emitido y el NFT tiene `TransferFee` > 0, el emisor del NFT debe tener trust line con esa moneda (`tecNO_LINE`) y no estar congelado (`tecFROZEN`). Esto garantiza que pueda cobrar su comisión.
  - Si no eres el emisor del NFT y este no lleva `tfTransferable`, solo el `NFTokenMinter` del emisor puede crear la oferta; si no → `tefNFTOKEN_IS_NOT_TRANSFERABLE`.
  - En ofertas de compra, debes tener fondos disponibles en esa moneda (`tecUNFUNDED_OFFER`).
  - `Destination` debe existir (`tecNO_DST`) y no tener `lsfDisallowIncomingNFTokenOffer` (`tecNO_PERMISSION`). Lo mismo con `Owner` (`tecNO_TARGET` si no existe).
  - Con [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) activo (sí en testnet), si el precio es un token de un emisor con `lsfRequireAuth`, tu trust line debe estar autorizada (`tecNO_LINE` / `tecNO_AUTH`).

**`NFTokenCreateOffer::doApply`** (`nft::tokenOfferCreateApply`): comprueba la reserva para un objeto más (`tecINSUFFICIENT_RESERVE`), inserta la oferta en tu directorio y en el directorio de ventas o compras del token, y sube tu `OwnerCount` en 1. El objeto guarda `Owner`, `NFTokenID`, `Amount`, `Flags` (`lsfSellNFToken` si es venta), `Destination` y `Expiration`.

## Campos clave

- **NFTokenID** — el token. El nodo extrae de él el emisor, los flags y el `TransferFee` sin buscar nada más.
- **Amount** — precio en drops (string) o un objeto `{currency, issuer, value}`. En ventas puede ser `"0"`.
- **Owner** — dueño actual del NFT; solo en ofertas de compra.
- **Destination** — única cuenta que podrá aceptar la oferta. Útil para transferencias privadas.
- **Expiration** — segundos desde el Ripple Epoch (2000-01-01). Pasado ese instante nadie podrá aceptarla, aunque el objeto siga en el ledger hasta que alguien la cancele.

## Flags

- **tfSellNFToken** (1) — la oferta es de venta. Sin él es de compra y necesitas `Owner`.

## Errores habituales

- **temMALFORMED** — has puesto `Owner` en una venta, lo has omitido en una compra, o `Destination`/`Owner` son tu propia cuenta.
- **temBAD_AMOUNT** — compra con importe 0, o token emitido en un NFT con `tfOnlyXRP`.
- **tecNO_ENTRY** — el NFT no está donde dices (no es tuyo si vendes, o `Owner` ya no lo tiene).
- **tefNFTOKEN_IS_NOT_TRANSFERABLE** — el NFT no tiene `tfTransferable` y tú no eres el emisor ni su minter.
- **tecUNFUNDED_OFFER** — oferta de compra sin saldo suficiente.
- **tecNO_PERMISSION** — el `Destination` (o el `Owner`) bloquea ofertas entrantes con `asfDisallowIncomingNFTokenOffer`.
- **tecINSUFFICIENT_RESERVE** — no cubres la reserva del nuevo objeto.

## Ejemplo

```json
{
  "TransactionType": "NFTokenCreateOffer",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000",
  "Flags": 1
}
```

Oferta de venta por 1 XRP. Para una oferta de compra quita `Flags` y añade `"Owner": "rYYYY_OTRA_CUENTA"`.

## Pruébalo en testnet

1. Acuña un NFT con [NFTokenMint](/tx/NFTokenMint) (`Flags: 8`) y copia su `NFTokenID` de `account_nfts`.
2. Carga el ejemplo con ese ID y envía. Observa en el resultado el nodo `CreatedNode` de tipo `NFTokenOffer`; su `LedgerIndex` es el identificador de la oferta.
3. Consulta `nft_sell_offers` con `nft_id`: verás la oferta con `amount`, `flags: 1` y `owner`.
4. `account_info`: tu `OwnerCount` ha subido en 1.
5. Prueba a añadir `"Destination": "rYYYY_OTRA_CUENTA"` y vuelve a enviar: ahora solo esa cuenta podrá aceptarla.
6. Cancela lo que no vayas a usar con [NFTokenCancelOffer](/tx/NFTokenCancelOffer) para recuperar la reserva.

## Relacionado

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), [NFTokenMint](/tx/NFTokenMint)
- [NFTokenOffer](/objects/NFTokenOffer), [NFTokenPage](/objects/NFTokenPage)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2), [DisallowIncoming](/amendments/DisallowIncoming)
