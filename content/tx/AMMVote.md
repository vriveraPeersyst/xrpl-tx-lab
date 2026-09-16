---
title: AMMVote
summary: Vota la comisión de trading de un AMM; el peso del voto es tu proporción de LP tokens.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammvote
xls: XLS-0030
amendment: AMM
level: básico
---

## Qué hace

La comisión de trading de un [AMM](/objects/AMM) no la fija nadie de forma permanente: la deciden los proveedores de liquidez por votación ponderada. Con `AMMVote` propones un `TradingFee` y el AMM recalcula la comisión como la media de los votos vigentes, ponderada por los LP tokens de cada votante.

El objeto AMM guarda hasta 8 votos en `VoteSlots` (`kVoteMaxSlots`). Si los 8 están ocupados, solo puedes entrar si tienes más LP tokens que el votante con menos (o los mismos y propones una comisión más alta), y expulsas a ese votante. Cada `AMMVote` refresca además los pesos de todos los votos según los saldos actuales de LP tokens, y descarta a los que ya no son LP.

## Cuándo usarlo

- Como LP relevante, subir la comisión para ganar más por operación o bajarla para atraer volumen.
- Refrescar los pesos de `VoteSlots` después de grandes depósitos o retiradas (cualquier voto los recalcula).
- Devolver la comisión a 0 en un fondo que quieras usar como "puente" barato entre dos activos.

## Cómo funciona por dentro

`AMMVote::preflight`: `Asset` ≠ `Asset2` y ambos válidos (`temBAD_AMM_TOKENS`); `TradingFee` ≤ `kTradingFeeThreshold` = 1000 (`temBAD_FEE`).

`AMMVote::preclaim`: sin AMM → `terNO_AMM`; `LPTokenBalance == 0` → `tecAMM_EMPTY`; si tu cuenta no tiene LP tokens de este AMM (`ammLPHolds == 0`) → `tecAMM_INVALID_TOKENS`.

`AMMVote::doApply` (en `applyVote`):
1. Recorre `VoteSlots`. Para cada entrada consulta el saldo actual de LP tokens del votante; si es 0 la descarta. Si la entrada es la tuya, sustituye su `TradingFee` por el nuevo. Acumula `num += fee × tokens` y `den += tokens`, y recalcula `VoteWeight = tokens × 100000 / LPTokenBalance`.
2. Localiza el voto "mínimo" (menos tokens; en empate, menor comisión; en empate, menor AccountID).
3. Si no tenías voto: con menos de 8 entradas se añade el tuyo; con 8, se reemplaza el mínimo solo si `tus tokens > minTokens` o (`iguales` y `tu fee > minFee`). En caso contrario tu voto **no entra pero la transacción tiene éxito** (`tesSUCCESS`) y sirve únicamente para refrescar los pesos.
4. La nueva comisión es `num / den` truncada a entero. Si resulta 0, se elimina el campo `TradingFee` del AMM y el `DiscountedFee` del auction slot. Si no, se fija `TradingFee` y `DiscountedFee = TradingFee / 10` (`kAuctionSlotDiscountedFeeFraction`).

Los cambios afectan de inmediato a todas las operaciones que crucen el AMM, incluida la comisión descontada del titular del [auction slot](/tx/AMMBid).

## Campos clave

- **Asset** / **Asset2** — Par que identifica el AMM (sin importes).
- **TradingFee** — Tu propuesta, en unidades de 1/100.000: `300` = 0,3 %. Rango 0–1000. Es lo que quieres que cobre el fondo, no lo que acabará cobrando: el valor final es la media ponderada de todos los `VoteSlots`.

## Errores habituales

- **tecAMM_INVALID_TOKENS** — No tienes LP tokens de este AMM. Deposita primero con [AMMDeposit](/tx/AMMDeposit).
- **terNO_AMM** — El par no tiene AMM (revisa `Asset`/`Asset2` e `issuer`).
- **tecAMM_EMPTY** — El fondo está vacío; no hay nada que votar.
- **temBAD_FEE** — `TradingFee` mayor que 1000.
- **temBAD_AMM_TOKENS** — `Asset` y `Asset2` son iguales.

## Ejemplo

```json
{
  "TransactionType": "AMMVote",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" },
  "TradingFee": 300
}
```

## Pruébalo en testnet

1. Sé LP del AMM XRP/USD (si lo creaste tú con `TradingFee: 500`, ya tienes un voto en `VoteSlots`).
2. Consulta `amm_info` y anota `trading_fee` y `vote_slots` (cada entrada muestra `account`, `trading_fee` y `vote_weight`).
3. Envía el ejemplo con `TradingFee: 300`. Si eres el único LP, `trading_fee` pasa a 300 y `auction_slot.discounted_fee` a 30.
4. Haz que otra cuenta deposite (por ejemplo la mitad de tu liquidez) y vote `TradingFee: 900`: la comisión resultante será la media ponderada (con pesos 2/3 y 1/3, quedaría en 500).
5. Retira todo con una de las cuentas y vota de nuevo con la otra: la entrada del LP que salió desaparece de `vote_slots`.

## Relacionado

- [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMBid](/tx/AMMBid), [AMMWithdraw](/tx/AMMWithdraw)
- [AMM](/objects/AMM)
- [AMM](/amendments/AMM)
