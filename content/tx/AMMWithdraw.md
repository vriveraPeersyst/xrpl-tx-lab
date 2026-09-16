---
title: AMMWithdraw
summary: Retira liquidez de un AMM quemando LP tokens, en los dos activos o en uno solo; si el fondo queda vacío, borra el AMM.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammwithdraw
xls: XLS-0030
amendment: AMM
level: intermedio
---

## Qué hace

`AMMWithdraw` es la operación inversa de [AMMDeposit](/tx/AMMDeposit): entregas LP tokens al fondo y recibes a cambio parte de sus reservas. Puedes retirar los dos activos en la proporción actual (retirada equilibrada) o un solo activo (retirada de un lado, que el fondo cobra con la comisión de trading porque altera el precio).

Modifica el objeto [AMM](/objects/AMM) (`LPTokenBalance` baja), las trust lines de la pseudocuenta y la tuya de LP tokens. Si con tu retirada `LPTokenBalance` llega a cero, el transactor intenta borrar el AMM entero (objeto, pseudocuenta y trust lines) en la misma transacción. Si la pseudocuenta tiene demasiadas trust lines para borrarlas de una vez, la transacción termina con `tecINCOMPLETE` y hay que rematar con [AMMDelete](/tx/AMMDelete).

## Cuándo usarlo

- Recuperar tu liquidez y las comisiones acumuladas (el valor de tus LP tokens crece con las comisiones del fondo).
- Salir por completo de un par con `tfWithdrawAll` sin calcular cuántos LP tokens tienes.
- Retirar solo el activo que te interesa (`tfSingleAsset`) aceptando la comisión de trading.
- Como emisor de un token, retirar tu propio activo del fondo aunque lo tengas congelado: `AMMWithdraw::issuerFreezeHandling` ignora la congelación cuando el retirador es el emisor (desde [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)).

## Cómo funciona por dentro

`AMMWithdraw::preflight` exige exactamente un flag de subtipo (`tfWithdrawSubTx`), si no `temMALFORMED`, y valida la combinación de campos:

| Flag | Obligatorio | Prohibido |
|---|---|---|
| `tfLPToken` | `LPTokenIn` | `Amount`, `Amount2`, `EPrice` |
| `tfWithdrawAll` | — | todos |
| `tfSingleAsset` | `Amount` | `LPTokenIn`, `Amount2`, `EPrice` |
| `tfOneAssetWithdrawAll` | `Amount` (puede ser 0: es un mínimo) | `LPTokenIn`, `Amount2`, `EPrice` |
| `tfTwoAsset` | `Amount`, `Amount2` | `LPTokenIn`, `EPrice` |
| `tfOneAssetLPToken` | `Amount` (mínimo, puede ser 0), `LPTokenIn` | `Amount2`, `EPrice` |
| `tfLimitLPToken` | `Amount`, `EPrice` | `LPTokenIn`, `Amount2` |

Los importes deben pertenecer al par (`temBAD_AMM_TOKENS`) y `LPTokenIn` ser positivo.

`AMMWithdraw::preclaim`:
- Sin AMM para el par → `terNO_AMM`; con `LPTokenBalance == 0` → `tecAMM_EMPTY`.
- Cada `Amount`/`Amount2` no puede superar la reserva del fondo (`tecAMM_BALANCE`), debes estar autorizado para recibirlo (`requireAuth`, modo débil, así que se te puede crear la trust line) y `checkWithdrawFreeze` comprueba que ni la pseudocuenta ni tú estéis congelados para ese activo.
- Si no tienes LP tokens → `tecAMM_BALANCE`. Si pides más `LPTokenIn` de los que tienes → `tecAMM_INVALID_TOKENS`. Si `LPTokenIn` o `EPrice` no son el LP token de este AMM → `temBAD_AMM_TOKENS`.
- Con `tfLPToken` o `tfWithdrawAll` se comprueban además los dos activos completos del fondo.

`AMMWithdraw::applyGuts`:
1. Con [fixAMMv1_1](/amendments/fixAMMv1_1), `verifyAndAdjustLPTokenBalance` corrige desajustes de redondeo cuando eres el último LP, para que puedas retirar todo.
2. Despacha por subtipo a `equalWithdrawLimit`, `singleWithdrawTokens`, `singleWithdrawEPrice`, `singleWithdraw` o `equalWithdrawTokens`. La comisión usada es `getTradingFee` (descontada si tienes el auction slot).
3. Todos llegan a `AMMWithdraw::withdraw`, que ajusta importes (`adjustAmountsByLPTokens`, con [fixAMMv1_3](/amendments/fixAMMv1_3) redondeando a favor del fondo), rechaza retirar exactamente un lado entero del fondo o más que sus reservas (`tecAMM_BALANCE`), y desde [fixAMMv1_2](/amendments/fixAMMv1_2) verifica que tienes reserva para la trust line del activo si aún no la tienes (`tecINSUFFICIENT_RESERVE`). Después envía los activos desde la pseudocuenta (sin comisión de transferencia) y quema tus LP tokens con `redeemIOU`.
4. `deleteAMMAccountIfEmpty`: si el nuevo `LPTokenBalance` es cero llama a `deleteAMMAccount`, que borra hasta `kMaxDeletableAmmTrustLines` = 512 trust lines; si quedan más, devuelve `tecINCOMPLETE` y el AMM sigue existiendo con balance cero.

## Campos clave

- **LPTokenIn** — LP tokens que quemas. Objeto `{currency, issuer, value}` con la moneda hex `03…` y el `issuer` de la pseudocuenta (los ves en `amm_info` → `lp_token`).
- **Amount** / **Amount2** — Activos a retirar. Con `tfTwoAsset` son máximos y el fondo mantiene la proporción; con `tfOneAssetLPToken` y `tfOneAssetWithdrawAll` `Amount` es un mínimo que aceptas.
- **EPrice** — Precio efectivo máximo por LP token en retirada de un activo (`tfLimitLPToken`), expresado en LP tokens.

## Flags

- **tfLPToken** (65536) — Retirada equilibrada quemando `LPTokenIn` exactos.
- **tfWithdrawAll** (131072) — Retirada equilibrada de todos tus LP tokens. La más simple para salir.
- **tfOneAssetWithdrawAll** (262144) — Quema todos tus LP tokens recibiendo un solo activo, al menos `Amount`.
- **tfSingleAsset** (524288) — Retira exactamente `Amount` de un activo; el fondo calcula los LP tokens.
- **tfTwoAsset** (1048576) — Retira ambos activos con `Amount`/`Amount2` como máximos.
- **tfOneAssetLPToken** (2097152) — Quema `LPTokenIn` recibiendo un activo, al menos `Amount`.
- **tfLimitLPToken** (4194304) — Un activo con precio efectivo límite `EPrice`.

## Errores habituales

- **temMALFORMED** — Combinación de flags y campos inválida (por ejemplo `tfWithdrawAll` con `Amount`).
- **tecAMM_BALANCE** — No tienes LP tokens, pides más de lo que hay en el fondo, o la retirada dejaría vacío un solo lado.
- **tecAMM_INVALID_TOKENS** — `LPTokenIn` supera tu saldo, o el cálculo redondea a cero LP tokens.
- **tecAMM_FAILED** — Con `tfLimitLPToken`, el precio efectivo supera `EPrice`; con `tfOneAssetLPToken`, no se alcanza el mínimo `Amount`.
- **tecINSUFFICIENT_RESERVE** — Te falta reserva para la trust line del activo que recibes.
- **tecFROZEN** — El activo está congelado para ti o para la pseudocuenta (salvo que seas su emisor).
- **tecINCOMPLETE** — Retiraste todo pero el AMM tiene más de 512 trust lines; repite con [AMMDelete](/tx/AMMDelete).

## Ejemplo

```json
{
  "TransactionType": "AMMWithdraw",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" },
  "Flags": 131072
}
```

Retira toda tu posición del fondo XRP/USD en los dos activos.

## Pruébalo en testnet

1. Sé LP del AMM XRP/USD (creado con [AMMCreate](/tx/AMMCreate) o tras un [AMMDeposit](/tx/AMMDeposit)). Consulta `amm_info` y apunta `lp_token` y `amount`/`amount2`.
2. Para una retirada parcial, envía `Flags: 65536` con `LPTokenIn` igual a la mitad de tu `lp_token.value` (mismo `currency` e `issuer`). Verás bajar tu línea de LP tokens y subir tus saldos de XRP y USD proporcionalmente.
3. Para salir del todo envía el ejemplo (`tfWithdrawAll`). Si eras el único LP, en los metadatos aparecen `DeletedNode` para `AMM`, `AccountRoot` y `RippleState`, y `amm_info` devuelve `actNotFound`.
4. Prueba `Flags: 524288` con `Amount: "500000"` para retirar solo 0,5 XRP y compara cuántos LP tokens se queman frente a la retirada equilibrada: la diferencia es la comisión de trading.

## Relacionado

- [AMMDeposit](/tx/AMMDeposit), [AMMCreate](/tx/AMMCreate), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM), [fixAMMv1_1](/amendments/fixAMMv1_1), [fixAMMv1_2](/amendments/fixAMMv1_2), [fixAMMv1_3](/amendments/fixAMMv1_3), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)
