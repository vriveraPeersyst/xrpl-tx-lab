---
title: AMMCreate
summary: Crea un creador de mercado automático (AMM) para un par de activos, deposita la liquidez inicial y te entrega los LP tokens.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammcreate
xls: XLS-0030
amendment: AMM
level: intermedio
---

## Qué hace

Un AMM (*Automated Market Maker*) es un fondo de liquidez con dos activos que cotiza automáticamente según la fórmula de producto constante: cualquiera puede cambiar un activo por el otro contra el fondo, y el precio se mueve según la proporción de reservas. Los proveedores de liquidez (LP) depositan ambos activos y reciben a cambio **LP tokens**, que representan su parte del fondo y les dan derecho a las comisiones de trading.

`AMMCreate` es la transacción que arranca uno de estos fondos. Crea tres cosas en el ledger: un objeto [AMM](/objects/AMM) que guarda el estado (activos, `LPTokenBalance`, `TradingFee`, `VoteSlots` y `AuctionSlot`), una **pseudocuenta** [AccountRoot](/objects/AccountRoot) con el campo `AMMID` que custodia los fondos, y las [trust lines](/objects/RippleState) (o MPToken) entre esa pseudocuenta y los emisores de los activos, marcadas con `lsfAMMNode`. Tu cuenta recibe los LP tokens iniciales, que son un IOU emitido por la pseudocuenta con un código de moneda derivado del par.

Solo puede existir un AMM por par de activos. El creador se convierte en el primer votante de comisión y ocupa el primer *auction slot* sin pagar nada.

## Cuándo usarlo

- Abrir un mercado para un token nuevo contra XRP (o contra otro token) sin necesidad de mantener órdenes en el libro.
- Ganar comisiones de trading aportando liquidez pasiva a un par.
- Dar profundidad a un par ilíquido para que los pagos con conversión encuentren liquidez (el motor de pagos usa el AMM junto con el libro de órdenes).

## Cómo funciona por dentro

`AMMCreate::checkExtraFeatures` exige el amendment [AMM](/amendments/AMM), y si alguno de los dos importes es un MPT, además [MPTokensV2](/amendments/MPTokensV2) (no activo en testnet: hoy solo XRP e IOU).

`AMMCreate::preflight` (validación estática):
- `Amount` y `Amount2` no pueden ser del mismo activo (`temBAD_AMM_TOKENS`).
- Ambos importes deben ser estrictamente positivos (`temBAD_AMOUNT`).
- `TradingFee` no puede superar `kTradingFeeThreshold` = 1000, es decir, el 1 % (`temBAD_FEE`).

`AMMCreate::calculateBaseFee` es especial: la comisión de la transacción **no es la base fee normal**, sino un *owner reserve* incremental (0,2 XRP en testnet). Es el precio de crear la pseudocuenta y se quema.

`AMMCreate::preclaim` (contra el ledger):
- Si ya existe un objeto AMM para ese par → `tecDUPLICATE`.
- Si algún emisor tiene `lsfRequireAuth` y tu trust line no está autorizada → `tecNO_AUTH` (vía `requireAuth`).
- Si algún activo está congelado (global o individualmente) para tu cuenta → `tecFROZEN`.
- Si el emisor de un IOU **no tiene `lsfDefaultRipple`** → `terNO_RIPPLE`. Es la causa más común de fallo con tokens de prueba: el emisor debe haber enviado `AccountSet` con `asfDefaultRipple`.
- Debes tener XRP libre por encima de la reserva contando una trust line más (la de los LP tokens); si no, `tecINSUF_RESERVE_LINE`.
- Si no tienes saldo suficiente de cualquiera de los dos activos → `tecUNFUNDED_AMM`.
- No puedes usar LP tokens de otro AMM como activo (`tecAMM_INVALID_TOKENS`): se detecta porque el emisor tiene `AMMID`.
- Con [SingleAssetVault](/amendments/SingleAssetVault) activo (no en testnet) tampoco se aceptan *shares* de vault (`tecWRONG_ASSET`).
- Como [AMMClawback](/amendments/AMMClawback) está activo, se permite crear AMM con tokens cuyo emisor tenga `lsfAllowTrustLineClawback`; antes de ese amendment devolvía `tecNO_PERMISSION`.

`AMMCreate::doApply` (efectos, en `applyCreate`):
1. Crea la pseudocuenta con `createPseudoAccount`, ligada al AMM por `AMMID`.
2. Calcula los LP tokens iniciales como `sqrt(Amount × Amount2)` (`ammLPTokens`, con redondeo hacia abajo desde [fixAMMv1_3](/amendments/fixAMMv1_3)).
3. Crea el objeto AMM con `Asset`/`Asset2` ordenados canónicamente, y llama a `initializeFeeAuctionVote`: tu cuenta queda en `VoteSlots` con `TradingFee` y ocupa el `AuctionSlot`.
4. Te envía los LP tokens y mueve `Amount` y `Amount2` de tu cuenta a la pseudocuenta con `WaiveTransferFee::Yes` (la comisión de transferencia del emisor no se aplica). Las trust lines de la pseudocuenta se crean con límite 0 y flag `lsfAMMNode`.
5. Registra los dos libros de órdenes del par en `OrderBookDB` si no existían.

## Campos clave

- **Amount** / **Amount2** — Depósito inicial de cada activo. La proporción entre ambos fija el precio de arranque del fondo: si depositas 10 XRP y 10 USD, el AMM cotiza 1 XRP = 1 USD hasta que alguien opere.
- **TradingFee** — Comisión que cobra el fondo en cada operación, en unidades de 1/100.000. `500` = 0,5 %. Máximo `1000` (1 %). Es un campo obligatorio; puedes poner `0`.
- **Fee** — Recuerda que debe cubrir el owner reserve incremental (200.000 drops en testnet), no los 10 drops habituales. El builder lo calcula por ti.

## Errores habituales

- **terNO_RIPPLE** — El emisor del token no tiene `DefaultRipple` activado. Pídele que envíe `AccountSet` con `SetFlag: 8`.
- **tecDUPLICATE** — Ya hay un AMM para ese par. Usa [AMMDeposit](/tx/AMMDeposit) en su lugar.
- **tecUNFUNDED_AMM** — No tienes saldo suficiente de uno de los dos activos (para XRP se descuenta la reserva).
- **tecINSUF_RESERVE_LINE** — Te falta XRP para la reserva de la trust line de LP tokens.
- **temBAD_FEE** — `TradingFee` mayor que 1000.
- **temBAD_AMM_TOKENS** — Los dos activos son el mismo.
- **tecFROZEN** / **tecNO_AUTH** — Token congelado, o el emisor exige autorización y no la tienes.
- **telINSUF_FEE_P** — `Fee` por debajo del owner reserve incremental.

## Ejemplo

```json
{
  "TransactionType": "AMMCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Amount": "10000000",
  "Amount2": {
    "currency": "USD",
    "issuer": "rZZZZ_EMISOR",
    "value": "10"
  },
  "TradingFee": 500
}
```

Crea un fondo XRP/USD con 10 XRP y 10 USD y una comisión del 0,5 %.

## Pruébalo en testnet

1. Necesitas una trust line a `rZZZZ_EMISOR` para USD con saldo (el emisor debe tener `DefaultRipple`). Si aún no la tienes, envía primero un [TrustSet](/tx/TrustSet) y pide fondos al emisor de prueba.
2. Comprueba que tienes al menos 10 XRP libres por encima de la reserva más 0,2 XRP para la comisión especial.
3. Rellena el builder con el ejemplo y envíalo. Fíjate en que `Fee` se fija a 200000 drops.
4. En los metadatos verás tres `CreatedNode`: `AMM`, `AccountRoot` (la pseudocuenta) y `RippleState` (trust lines de USD y de LP tokens).
5. Llama a `amm_info` con `asset: {currency: "XRP"}` y `asset2: {currency: "USD", issuer: ...}`: verás `amount`, `amount2`, `lp_token` con tu saldo, `trading_fee: 500`, y tu cuenta en `vote_slots` y `auction_slot`.
6. Con `account_lines` sobre tu cuenta aparece la línea de LP tokens (moneda hexadecimal que empieza por `03`).

## Relacionado

- [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [AMM](/objects/AMM), [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [AMMClawback](/amendments/AMMClawback), [fixAMMv1_3](/amendments/fixAMMv1_3), [MPTokensV2](/amendments/MPTokensV2)
- [TrustSet](/tx/TrustSet), [AccountSet](/tx/AccountSet)
