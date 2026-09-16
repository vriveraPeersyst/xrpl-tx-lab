---
title: NFTokenAcceptOffer
summary: Ejecuta una oferta de NFT: acepta una venta, acepta una compra, o casa una compra con una venta como intermediario cobrando comisión.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenacceptoffer
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: intermedio
---

## Qué hace

`NFTokenAcceptOffer` consume uno o dos objetos [NFTokenOffer](/objects/NFTokenOffer), mueve el pago y transfiere el token de la [NFTokenPage](/objects/NFTokenPage) del vendedor a la del comprador. Tiene tres modos:

- **Aceptar una venta** (`NFTokenSellOffer`): tú eres el comprador; pagas el `Amount` de la oferta y recibes el NFT.
- **Aceptar una compra** (`NFTokenBuyOffer`): tú posees el NFT; recibes el `Amount` del ofertante y le entregas el token.
- **Modo intermediario** (ambos campos): tú no eres ni comprador ni vendedor. Casas una compra con una venta del mismo token, y puedes quedarte la diferencia (o parte) con `NFTokenBrokerFee`.

Si el NFT tiene `TransferFee`, el emisor cobra automáticamente su porcentaje del importe, salvo que él mismo sea el comprador o el vendedor.

## Cuándo usarlo

- Comprar un NFT que está a la venta.
- Aceptar la puja de otra cuenta por tu NFT.
- Operar un marketplace: los usuarios publican ofertas y tu cuenta las casa cobrando comisión.

## Cómo funciona por dentro

**`NFTokenAcceptOffer::preflight`**:
- Sin `NFTokenBuyOffer` ni `NFTokenSellOffer` → `temMALFORMED`.
- `NFTokenBrokerFee` exige que estén los dos campos y que sea mayor que 0; si no → `temMALFORMED`.

**`NFTokenAcceptOffer::preclaim`** carga cada oferta (`tecOBJECT_NOT_FOUND` si el ID es cero o no existe; `temBAD_OFFER` si su `Amount` es negativo). Con [fixCleanup3_1_3](/amendments/fixCleanup3_1_3) activo (sí en testnet), una oferta caducada no se rechaza aquí: se borra en `doApply` y la tx termina en `tecEXPIRED`. Luego:

En modo intermediario:
- Ambas ofertas deben referirse al mismo `NFTokenID` y a la misma moneda → `tecNFTOKEN_BUY_SELL_MISMATCH`.
- Comprador y vendedor no pueden ser la misma cuenta → `tecCANT_ACCEPT_OWN_NFTOKEN_OFFER`.
- El precio de venta no puede superar la puja → `tecINSUFFICIENT_PAYMENT`.
- Si cualquiera de las ofertas tiene `Destination`, debe ser tu cuenta → `tecNO_PERMISSION`.
- `NFTokenBrokerFee` debe estar en la misma moneda, ser menor que la puja, y la puja menos la comisión debe cubrir el precio de venta → `tecINSUFFICIENT_PAYMENT`.

Para la oferta de compra: debe tener `lsfSellNFToken` apagado (`tecNFTOKEN_OFFER_TYPE_MISMATCH`), no ser tuya, y si no hay venta, el token debe estar en tus páginas y el `Destination` (si lo hay) ser tú (`tecNO_PERMISSION`). El ofertante debe tener fondos por el `Amount` completo → `tecINSUFFICIENT_FUNDS`.

Para la oferta de venta: debe tener `lsfSellNFToken` (`tecNFTOKEN_OFFER_TYPE_MISMATCH`), no ser tuya, y el vendedor debe seguir teniendo el token (`tecNO_PERMISSION`). Si no hay compra, tú debes tener fondos por el `Amount` → `tecINSUFFICIENT_FUNDS`.

Con [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2) (activo en testnet), si el pago es en token emitido: comprador, vendedor y, si hay `TransferFee`, el emisor del NFT necesitan trust lines autorizadas cuando el emisor de la moneda exige `RequireAuth` (`tecNO_LINE`, `tecNO_AUTH`), y ninguna puede estar en deep freeze (`tecFROZEN`).

**`NFTokenAcceptOffer::doApply`**:
1. Borra las ofertas caducadas (→ `tecEXPIRED`) y después las ofertas aceptadas, liberando la reserva de sus dueños.
2. En modo intermediario paga primero `NFTokenBrokerFee` del comprador a tu cuenta, luego el `TransferFee` del comprador al emisor sobre el resto, y por último el remanente al vendedor.
3. En los otros modos (`acceptOffer`) paga el `TransferFee` al emisor y el resto al vendedor. Con `Amount` 0 no hay pago.
4. `transferNFToken` quita el token de las páginas del vendedor y lo inserta en las del comprador. Si el comprador necesita una página nueva y no cubre la reserva → `tecINSUFFICIENT_RESERVE`.

Cada pago (`pay`) usa `accountSend` y comprueba que ni origen ni destino queden con saldo negativo (`tecINSUFFICIENT_FUNDS`).

## Campos clave

- **NFTokenSellOffer** — `LedgerIndex` de la oferta de venta (de `nft_sell_offers`).
- **NFTokenBuyOffer** — `LedgerIndex` de la oferta de compra (de `nft_buy_offers`).
- **NFTokenBrokerFee** — solo en modo intermediario. Se descuenta de la puja antes de calcular el `TransferFee` del emisor. Importe en la misma moneda que las ofertas.

## Errores habituales

- **tecOBJECT_NOT_FOUND** — el ID de la oferta no existe o ya fue consumido o cancelado.
- **tecNFTOKEN_OFFER_TYPE_MISMATCH** — has puesto una oferta de venta en `NFTokenBuyOffer` o viceversa.
- **tecCANT_ACCEPT_OWN_NFTOKEN_OFFER** — intentas aceptar tu propia oferta.
- **tecINSUFFICIENT_FUNDS** — quien paga no tiene saldo suficiente (en compras, el ofertante; en ventas, tú).
- **tecINSUFFICIENT_PAYMENT** — en modo intermediario, la puja no cubre el precio más la comisión.
- **tecNO_PERMISSION** — la oferta tiene un `Destination` que no eres tú, o el vendedor ya no tiene el token.
- **tecEXPIRED** — la oferta caducó; la tx la borra y cobra fee.
- **tecNFTOKEN_BUY_SELL_MISMATCH** — las dos ofertas no hablan del mismo token o de la misma moneda.

## Ejemplo

```json
{
  "TransactionType": "NFTokenAcceptOffer",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenSellOffer": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Modo intermediario:

```json
{
  "TransactionType": "NFTokenAcceptOffer",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenSellOffer": "…",
  "NFTokenBuyOffer": "…",
  "NFTokenBrokerFee": "100000"
}
```

## Pruébalo en testnet

1. Desde la otra cuenta de demostración, acuña un NFT (`Flags: 8`) y crea una oferta de venta por `"1000000"` con [NFTokenCreateOffer](/tx/NFTokenCreateOffer).
2. Consulta `nft_sell_offers` con el `NFTokenID` y copia el `nft_offer_index`.
3. Con tu cuenta, carga el ejemplo, pega el índice en `NFTokenSellOffer` y envía.
4. `account_nfts` de tu cuenta muestra ahora el token; `account_info` de la otra cuenta ha ganado 1 XRP menos su fee y ha recuperado la reserva de la oferta.
5. Acuña otro NFT con `TransferFee: 5000` (5 %), véndelo entre dos cuentas que no sean el emisor y comprueba en los `AffectedNodes` cómo el emisor recibe el 5 %.
6. Para ver `tecEXPIRED`, crea una oferta con `Expiration` a un minuto vista, espera y acéptala: la tx cobra fee, borra la oferta y no transfiere nada.

## Relacionado

- [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), [NFTokenMint](/tx/NFTokenMint)
- [NFTokenOffer](/objects/NFTokenOffer), [NFTokenPage](/objects/NFTokenPage)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixEnforceNFTokenTrustlineV2](/amendments/fixEnforceNFTokenTrustlineV2)
