---
title: AMMDeposit
summary: Aporta liquidez a un AMM existente, con uno o los dos activos, y recibe LP tokens a cambio.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammdeposit
xls: XLS-0030
amendment: AMM
level: intermedio
---

## Qué hace

`AMMDeposit` añade fondos a un [AMM](/objects/AMM) ya creado y te entrega LP tokens proporcionales a lo que aportas. Puedes depositar los dos activos en la proporción actual del fondo (sin mover el precio) o solo uno de ellos (el fondo lo trata como una operación parcial y te da menos LP tokens, porque cambia la proporción).

Modifica el objeto AMM (`LPTokenBalance`), las trust lines de la pseudocuenta y tu trust line de LP tokens (que se crea si no existe). Si el AMM está vacío (todos los LP retiraron), el depósito con `tfTwoAssetIfEmpty` lo reinicia como si fuera un `AMMCreate`: fija el nuevo `TradingFee` y te da el auction slot y el primer voto.

## Cuándo usarlo

- Unirte como proveedor de liquidez a un par que ya existe.
- Rebalancear un fondo aportando solo el activo que escasea.
- Reactivar un AMM vacío (tras retiradas totales) sin pagar el owner reserve de un nuevo `AMMCreate`.

## Cómo funciona por dentro

`AMMDeposit::preflight` valida la **combinación de flags y campos**. Debe haber exactamente un flag de subtipo (`tfDepositSubTx`); si no, `temMALFORMED`. Cada subtipo exige unos campos y prohíbe otros:

| Flag | Obligatorio | Opcional | Prohibido |
|---|---|---|---|
| `tfLPToken` | `LPTokenOut` | `Amount` **y** `Amount2` (mínimos, juntos o ninguno) | `EPrice`, `TradingFee` |
| `tfSingleAsset` | `Amount` | `LPTokenOut` (mínimo) | `Amount2`, `EPrice`, `TradingFee` |
| `tfTwoAsset` | `Amount`, `Amount2` | `LPTokenOut` (mínimo) | `EPrice`, `TradingFee` |
| `tfOneAssetLPToken` | `Amount`, `LPTokenOut` | — | `Amount2`, `EPrice`, `TradingFee` |
| `tfLimitLPToken` | `Amount`, `EPrice` | — | `LPTokenOut`, `Amount2`, `TradingFee` |
| `tfTwoAssetIfEmpty` | `Amount`, `Amount2` | `TradingFee` | `EPrice`, `LPTokenOut` |

Además: `Asset` ≠ `Asset2` y los importes deben pertenecer al par (`temBAD_AMM_TOKENS`), ser positivos (`temBAD_AMOUNT`; con `tfLimitLPToken` `Amount` puede ser 0) y `TradingFee` ≤ 1000 (`temBAD_FEE`).

`AMMDeposit::preclaim`:
- Busca el AMM por `Asset`/`Asset2`; si no existe → `terNO_AMM`.
- Con `tfTwoAssetIfEmpty` el fondo debe estar vacío (`LPTokenBalance == 0`); si no, `tecAMM_NOT_EMPTY`. Con cualquier otro flag ocurre lo contrario: `tecAMM_EMPTY`.
- Desde [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) (activo) comprueba para **ambos** activos del par que estás autorizado (`requireAuth`, modo débil) y que no hay congelación (`checkDepositFreeze`), aunque solo deposites uno.
- Comprueba saldo: para XRP usa `xrpLiquid` descontando una reserva extra si aún no tienes trust line de LP tokens (`tecINSUF_RESERVE_LINE` si el problema es la reserva, `tecUNFUNDED_AMM` si es el saldo); para IOU, `accountFunds` ≥ importe.
- `LPTokenOut` debe ser el LP token de este AMM (`temBAD_AMM_TOKENS`).
- Si aún no eres LP, necesitas XRP libre para una trust line más (`tecINSUF_RESERVE_LINE`).

`AMMDeposit::applyGuts` despacha por subtipo a `equalDepositLimit`, `singleDepositTokens`, `singleDepositEPrice`, `singleDeposit`, `equalDepositTokens` o `equalDepositInEmptyState`. Todas acaban en `AMMDeposit::deposit`, que:
1. Ajusta importes y LP tokens con `adjustAmountsByLPTokens` (con [fixAMMv1_3](/amendments/fixAMMv1_3) redondea LP tokens hacia abajo y activos hacia arriba, a favor del fondo).
2. Si los LP tokens resultantes son 0 → `tecAMM_INVALID_TOKENS`; si no alcanzan los mínimos que pusiste → `tecAMM_FAILED`.
3. Vuelve a comprobar saldo (`tecUNFUNDED_AMM`), mueve los activos a la pseudocuenta con `WaiveTransferFee::Yes` y te envía los LP tokens.
4. Actualiza `LPTokenBalance`; si el fondo estaba vacío, `initializeFeeAuctionVote` te da el voto y el auction slot.

La comisión efectiva (`tfee`) para depósitos de un solo activo es la del AMM, salvo que ostentes el auction slot (`getTradingFee` devuelve la descontada).

## Campos clave

- **Asset** / **Asset2** — Identifican el AMM (`{currency, issuer}` o `{currency: "XRP"}`), sin importe.
- **Amount** / **Amount2** — Lo que depositas. Con `tfLPToken` son **mínimos** que aceptas depositar, no importes exactos.
- **LPTokenOut** — LP tokens que quieres recibir (`tfLPToken`, `tfOneAssetLPToken`) o mínimo aceptable (en `tfSingleAsset`/`tfTwoAsset`). Debe ser el token del AMM: `currency` hex `03…` e `issuer` la pseudocuenta.
- **EPrice** — Precio efectivo máximo por LP token que aceptas pagar en un depósito de un activo (`tfLimitLPToken`).
- **TradingFee** — Solo con `tfTwoAssetIfEmpty`: nueva comisión al reiniciar el fondo.

## Flags

- **tfLPToken** (65536) — Depósito equilibrado pidiendo una cantidad exacta de LP tokens.
- **tfSingleAsset** (524288) — Depósito de un solo activo por importe fijo.
- **tfTwoAsset** (1048576) — Depósito de los dos activos con límites máximos; el fondo toma lo que mantenga la proporción.
- **tfOneAssetLPToken** (2097152) — Un activo, pidiendo LP tokens exactos; `Amount` es el máximo a gastar.
- **tfLimitLPToken** (4194304) — Un activo con precio efectivo límite `EPrice`.
- **tfTwoAssetIfEmpty** (8388608) — Solo para reiniciar un AMM vacío.

## Errores habituales

- **temMALFORMED** — Flags y campos no encajan (por ejemplo `tfSingleAsset` con `Amount2`, o ningún flag).
- **terNO_AMM** — No hay AMM para ese par; créalo con [AMMCreate](/tx/AMMCreate).
- **tecAMM_EMPTY** — El fondo está vacío; usa `tfTwoAssetIfEmpty`.
- **tecUNFUNDED_AMM** — Saldo insuficiente del activo depositado.
- **tecINSUF_RESERVE_LINE** — Falta XRP para la reserva de la trust line de LP tokens.
- **tecAMM_FAILED** — No se cumplen tus mínimos (`LPTokenOut`, `Amount`/`Amount2` con `tfLPToken`, o `EPrice`).
- **tecFROZEN** / **tecNO_AUTH** — Alguno de los dos activos está congelado o no estás autorizado.

## Ejemplo

```json
{
  "TransactionType": "AMMDeposit",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" },
  "Amount": "1000000",
  "Flags": 524288
}
```

Deposita 1 XRP como activo único en el fondo XRP/USD.

## Pruébalo en testnet

1. Asegúrate de que existe el AMM XRP/USD (`amm_info`); si no, créalo con [AMMCreate](/tx/AMMCreate).
2. Ten una trust line a `rZZZZ_EMISOR` (aunque deposites XRP, `preclaim` comprueba autorización y congelación de los dos activos) y XRP libre para una trust line más.
3. Envía el ejemplo con `Flags: 524288`. Anota el `lp_token.value` de `amm_info` antes y después: tu saldo de LP tokens sube y `amount` del fondo aumenta en 1 XRP.
4. Prueba variantes: `Flags: 1048576` con `Amount` y `Amount2` para depositar equilibrado, o `Flags: 65536` con `LPTokenOut` y observa cuánto de cada activo se descuenta.
5. Envía `tfSingleAsset` con `Amount2` incluido para ver `temMALFORMED`, o un `LPTokenOut` enorme con `tfSingleAsset` para provocar `tecAMM_FAILED`.

## Relacionado

- [AMMCreate](/tx/AMMCreate), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [AMMClawback](/amendments/AMMClawback)
