---
title: AMMBid
summary: Puja con LP tokens por el auction slot de un AMM para operar 24 horas con la comisión descontada (1/10 de la normal).
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammbid
xls: XLS-0030
amendment: AMM
level: avanzado
---

## Qué hace

Cada [AMM](/objects/AMM) tiene un único **auction slot**: quien lo ostenta opera contra el fondo pagando solo la décima parte de la comisión de trading (`DiscountedFee = TradingFee / 10`) durante 24 horas, y puede designar hasta 4 cuentas más (`AuthAccounts`) que disfrutan del mismo descuento. Es un mecanismo pensado para arbitrajistas: quien más valor obtiene de operar barato paga por ello, y ese pago (en LP tokens) se **quema**, lo que aumenta el valor de los LP tokens de todos los demás proveedores.

`AMMBid` es la puja. Pagas con tus LP tokens; si el slot está libre o caducado pagas el precio mínimo, y si alguien lo ocupa pagas un precio creciente y parte de lo que pagas se reembolsa al titular anterior por el tiempo que le quedaba. Solo modifica el objeto AMM (`AuctionSlot`, `LPTokenBalance`) y las trust lines de LP tokens implicadas.

## Cuándo usarlo

- Arbitrar entre el AMM y el libro de órdenes u otros mercados: con muchas operaciones, el descuento compensa el precio del slot.
- Operar con comisión reducida desde varias cuentas de tu operativa usando `AuthAccounts`.
- Como LP, no hace falta hacer nada: cada puja quema LP tokens y revaloriza los tuyos.

## Cómo funciona por dentro

`AMMBid::preflight`: `Asset` ≠ `Asset2`; `BidMin` y `BidMax` positivos si aparecen; `AuthAccounts` con como máximo 4 entradas (`kAuctionSlotMaxAuthAccounts`), y desde [fixAMMv1_3](/amendments/fixAMMv1_3) sin duplicados ni tu propia cuenta (`temMALFORMED`).

`AMMBid::preclaim`: sin AMM → `terNO_AMM`; fondo vacío → `tecAMM_EMPTY`; cada `AuthAccounts[].Account` debe existir (`terNO_ACCOUNT`); si no tienes LP tokens → `tecAMM_INVALID_TOKENS`. `BidMin`/`BidMax` deben ser el LP token del AMM (`temBAD_AMM_TOKENS`), no superar tu saldo ni el total del fondo, y `BidMin ≤ BidMax` (`tecAMM_INVALID_TOKENS`).

`AMMBid::doApply` (en `applyBid`):
- Precio mínimo: `ammAuctionMinSlotPrice` = `LPTokenBalance × TradingFee / 25` (`kAuctionSlotMinFeeFraction`, con `TradingFee` como fracción). El día se divide en 20 intervalos de 72 minutos (`kAuctionSlotTimeIntervals`, `kAuctionSlotIntervalDuration`) y `ammAuctionTimeSlot` calcula en cuál está el titular actual.
- **Slot libre o caducado** (o el titular está en el intervalo 19, o su cuenta no existe): pagas `minSlotPrice` y se quema todo.
- **Slot ocupado**: en el intervalo 0 el precio es `precioPagado × 1,05 + minSlotPrice`; en los demás, `precioPagado × 1,05 × (1 − fracciónUsada^60) + minSlotPrice`, así que baja rápidamente conforme el slot se consume. Al titular anterior se le devuelve `fracciónRestante × precioPagado` y se quema la diferencia.
- `getPayPrice` aplica tus límites: con `BidMin` pagas `max(precio, BidMin)`; con `BidMax` la puja falla con `tecAMM_FAILED` si el precio lo supera; si el precio final excede tus LP tokens → `tecAMM_INVALID_TOKENS`. Con [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) (aún no activo en testnet) los fondos con `TradingFee` 0 usarán un precio mínimo calculado con fee 1 para evitar pujas gratuitas; hoy en testnet un fondo con comisión 0 tiene precio mínimo 0.
- `updateSlot` escribe `Account`, `Expiration = ahora + 86400` (`kTotalTimeSlotSecs`), `DiscountedFee`, `Price` y `AuthAccounts` en el `AuctionSlot`, quema los LP tokens con `redeemIOU` y reduce `LPTokenBalance`.

## Campos clave

- **BidMin** — Mínimo que estás dispuesto a pagar (en LP tokens). Útil para asegurar que superas a un rival aunque el precio calculado sea inferior.
- **BidMax** — Máximo que aceptas pagar. Si el precio calculado lo supera, la transacción falla en lugar de gastar más.
- **AuthAccounts** — Hasta 4 objetos `{ "AuthAccount": { "Account": "r..." } }` que también operan con el descuento. Sustituye por completo la lista anterior; si lo omites, el slot queda sin cuentas autorizadas.

Los tres importes se expresan en el LP token del AMM: `{currency: "03…", issuer: <pseudocuenta>, value}` tal como aparece en `amm_info` → `lp_token`.

## Errores habituales

- **tecAMM_INVALID_TOKENS** — No eres LP, o el precio a pagar (o `BidMin`/`BidMax`) supera tus LP tokens o el total del fondo.
- **tecAMM_FAILED** — El precio calculado supera `BidMax`.
- **temBAD_AMM_TOKENS** — `BidMin`/`BidMax` no son el LP token de este AMM.
- **temMALFORMED** — Más de 4 `AuthAccounts`, duplicados o tu propia cuenta.
- **terNO_ACCOUNT** — Alguna cuenta de `AuthAccounts` no existe en el ledger.
- **terNO_AMM** / **tecAMM_EMPTY** — El par no tiene AMM o está vacío.

## Ejemplo

```json
{
  "TransactionType": "AMMBid",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" }
}
```

Sin `BidMin`/`BidMax` pagas exactamente el precio calculado.

## Pruébalo en testnet

1. Sé LP del AMM XRP/USD. Consulta `amm_info` y mira `auction_slot`: si lo creaste tú, verás tu cuenta como titular con `price` 0 y `expiration` a 24 h de la creación.
2. Desde **otra** cuenta que también sea LP (haz un [AMMDeposit](/tx/AMMDeposit) con ella) envía el ejemplo. Como el slot está ocupado en el intervalo 0, pagará `0 × 1,05 + minSlotPrice`; comprueba en los metadatos que su línea de LP tokens baja, que `LPTokenBalance` del AMM baja en lo quemado y que `auction_slot.account` cambia.
3. Repite desde la primera cuenta con `BidMax` muy bajo (por ejemplo `"value": "0.000001"`) para provocar `tecAMM_FAILED`.
4. Añade `AuthAccounts` con `rYYYY_OTRA_CUENTA` y comprueba que aparece en `auction_slot.auth_accounts`.
5. Para ver el descuento en acción, haz un [Payment](/tx/Payment) con conversión XRP→USD desde la cuenta titular y compara el precio obtenido con el de una cuenta sin slot.

## Relacionado

- [AMMVote](/tx/AMMVote) (fija `TradingFee` y por tanto `DiscountedFee`), [AMMDeposit](/tx/AMMDeposit), [AMMCreate](/tx/AMMCreate)
- [AMM](/objects/AMM)
- [AMM](/amendments/AMM), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
