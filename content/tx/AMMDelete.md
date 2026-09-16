---
title: AMMDelete
summary: Borra un AMM vacío (sin LP tokens) que no pudo eliminarse automáticamente en la última retirada.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammdelete
xls: XLS-0030
amendment: AMM
level: básico
---

## Qué hace

Cuando el último proveedor de liquidez retira su posición con [AMMWithdraw](/tx/AMMWithdraw) (o el emisor recupera todo con [AMMClawback](/tx/AMMClawback)), el propio transactor intenta borrar el [AMM](/objects/AMM): el objeto, la pseudocuenta [AccountRoot](/objects/AccountRoot) y todas las [trust lines](/objects/RippleState) que la pseudocuenta mantiene (una por cada cuenta que alguna vez tuvo LP tokens, más las de los activos). Ese borrado tiene un límite de 512 trust lines por transacción (`kMaxDeletableAmmTrustLines`), así que en fondos muy populares la retirada final termina con `tecINCOMPLETE` y el AMM queda en el ledger con `LPTokenBalance` a cero.

`AMMDelete` sirve para rematar ese trabajo. Cualquier cuenta puede enviarla: no hay dueño del AMM. Cada envío borra hasta 512 trust lines más; cuando no queda ninguna, elimina el objeto AMM y la pseudocuenta.

## Cuándo usarlo

- Después de un `AMMWithdraw` o `AMMClawback` que devolvió `tecINCOMPLETE`.
- Limpiar un AMM vacío cuyas trust lines de LP tokens siguen ocupando reserva en las cuentas de los antiguos LP (al borrar la línea desde el lado de la pseudocuenta, la cuenta del LP recupera esa reserva).
- Antes de volver a crear el par con [AMMCreate](/tx/AMMCreate): mientras el objeto exista, `AMMCreate` devuelve `tecDUPLICATE`, aunque se puede reactivar con [AMMDeposit](/tx/AMMDeposit) y `tfTwoAssetIfEmpty`.

## Cómo funciona por dentro

`AMMDelete::checkExtraFeatures` exige [AMM](/amendments/AMM), y [MPTokensV2](/amendments/MPTokensV2) si algún activo es MPT.

`AMMDelete::preflight` no comprueba nada específico: devuelve `tesSUCCESS` (las validaciones comunes de `Transactor::preflight` siguen aplicando: firma, `Fee`, `Sequence`, flags universales).

`AMMDelete::preclaim`:
- Busca el AMM por `Asset`/`Asset2`; si no existe → `terNO_AMM`.
- Si `LPTokenBalance != 0` → `tecAMM_NOT_EMPTY`. No se puede borrar un fondo con liquidez: hay que retirarla antes.

`AMMDelete::doApply` llama a `deleteAMMAccount` (`AMMHelpers.cpp`):
1. `deleteAMMTrustLines` recorre el directorio de la pseudocuenta y borra hasta 512 trust lines. Si quedan más, devuelve `tecINCOMPLETE`; la transacción **se aplica igualmente** (es un código `tec`, así que consume `Fee` y `Sequence`) y el progreso queda guardado.
2. Si todas las trust lines han desaparecido, `deleteAMMMPTokens` borra los MPToken de la pseudocuenta (solo relevante con MPT en el fondo).
3. Desvincula el objeto AMM del directorio de la pseudocuenta, borra el directorio y elimina el objeto AMM y el `AccountRoot` de la pseudocuenta.

Fíjate en que `doApply` aplica el sandbox tanto con `tesSUCCESS` como con `tecINCOMPLETE`: en ambos casos el ledger cambia.

## Campos clave

- **Asset** / **Asset2** — El par que identifica el AMM, en el mismo formato que en `amm_info`: `{currency: "XRP"}` o `{currency, issuer}`. El orden no importa: `keylet::amm` lo canonicaliza.

No tiene flags propios.

## Errores habituales

- **tecAMM_NOT_EMPTY** — El fondo aún tiene LP tokens en circulación. Todos los LP deben retirar (o el emisor hacer clawback) antes.
- **terNO_AMM** — No existe AMM para ese par: revisa `issuer` y `currency`, o es que ya se borró.
- **tecINCOMPLETE** — Se borraron 512 trust lines pero quedan más. No es un error real: vuelve a enviar `AMMDelete` hasta obtener `tesSUCCESS`.
- **temDISABLED** — Solo si el amendment AMM no estuviera activo; en testnet lo está.

## Ejemplo

```json
{
  "TransactionType": "AMMDelete",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" }
}
```

## Pruébalo en testnet

En condiciones normales es difícil ver `AMMDelete` en acción, porque un AMM de prueba con pocos LP se borra solo en la última retirada. Puedes probar los dos caminos:

1. Con un AMM XRP/USD que aún tenga liquidez, envía el ejemplo y observa `tecAMM_NOT_EMPTY` en el resultado (la transacción se incluye en el ledger y cobra la `Fee`).
2. Retira toda la liquidez con [AMMWithdraw](/tx/AMMWithdraw) y `tfWithdrawAll`. Consulta `amm_info`: si devuelve `actNotFound`, el AMM ya se borró en esa misma transacción y un `AMMDelete` posterior dará `terNO_AMM`.
3. Si `amm_info` sigue mostrando el AMM con `lp_token.value` = 0 (ocurre cuando la pseudocuenta tenía más de 512 trust lines), envía `AMMDelete` tantas veces como haga falta. En los metadatos verás `DeletedNode` de tipo `RippleState` por cada trust line eliminada y, en el último envío, los `DeletedNode` de `AMM` y `AccountRoot`.
4. Comprueba con `account_lines` en una cuenta de antiguo LP que su línea de LP tokens ha desaparecido y que su `OwnerCount` ha bajado.

## Relacionado

- [AMMWithdraw](/tx/AMMWithdraw), [AMMClawback](/tx/AMMClawback), [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit)
- [AMM](/objects/AMM), [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM)
