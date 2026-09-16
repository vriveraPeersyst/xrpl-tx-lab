---
title: VaultWithdraw
summary: Devuelve shares a la bóveda y recibe a cambio el activo subyacente, en tu cuenta o en un destino.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultwithdraw
xls: XLS-0065
amendment: SingleAssetVault
level: avanzado
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** Cualquier `VaultWithdraw` que envíes hoy falla con `temDISABLED`. Esta página describe el código que se activará cuando el amendment se vote.

`VaultWithdraw` es la operación inversa a [VaultDeposit](/tx/VaultDeposit): quemas shares y la pseudo-cuenta del [Vault](/objects/Vault) te paga el activo equivalente. Puedes expresar `Amount` de dos maneras: en **activo** (quiero 1 XRP; el transactor calcula cuántas shares quemar) o en **shares** (quiero canjear 500 shares; el transactor calcula cuánto activo recibes). El tipo de cambio es siempre el actual de la bóveda: `AssetsTotal` (menos `LossUnrealized`) dividido entre las shares en circulación.

El pago puede ir a tu propia cuenta o a un `Destination`. Retirar a ti mismo nunca se bloquea por perder el acceso a una bóveda privada: si tienes shares es porque fuiste autorizado, y eso te da derecho a recuperar tus fondos.

## Cuándo usarlo

- Salir total o parcialmente de un fondo de préstamos y cobrar el rendimiento acumulado.
- Pagar directamente a un tercero con activos que tienes en una bóveda, sin pasar por tu cuenta.
- Devolver un activo congelado al emisor (el emisor siempre es destino válido).

## Cómo funciona por dentro

`VaultWithdraw::checkExtraFeatures`: usar `CredentialIDs` exige [Credentials](/amendments/Credentials) y [fixCleanup3_4_0](/amendments/fixCleanup3_4_0).

`VaultWithdraw::preflight` (validación estática): `temMALFORMED` si `VaultID` o `Destination` son cero; `temBAD_AMOUNT` si `Amount` ≤ 0; más las comprobaciones de formato de `credentials::checkFields`.

`VaultWithdraw::preclaim` (contra el ledger):
- Busca el Vault (`tecNO_ENTRY`). Con [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), una bóveda cerrada en fase de inversión devuelve `tecTOO_SOON`.
- `Amount` debe ser el activo de la bóveda o su share (`tecWRONG_ASSET`).
- `canTransfer` verifica que el activo puede ir de la pseudo-cuenta al destino. Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) se ignora `lsfMPTCanTransfer`: retirar es una vía de recuperación y un emisor no puede atrapar fondos ajenos.
- Valida las credenciales aportadas y, con fixCleanup3_4_0, rechaza destinos que sean pseudo-cuentas (`tecPSEUDO_ACCOUNT`).
- `canWithdraw` (`View.cpp`) aplica al destino las mismas reglas que un pago: `DestinationTag` obligatorio si lo exige (`tecDST_TAG_NEEDED`), y `lsfDepositAuth` satisfecho por preautorización o credenciales (`tecNO_PERMISSION`). Con [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), si `Amount` son shares se convierte antes a activos para hacer esta comprobación.
- `requireAuth` sobre el destino: si retiras a otra cuenta, esta ya debe tener trust line o MPToken del activo (`StrongAuth`); si retiras a ti mismo se te crea en `doApply`.
- Bóveda privada y destino ≠ tú y ≠ emisor: con fixCleanup3_4_0 tanto tú como el destino debéis cumplir el `DomainID`.
- Con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), `checkWithdrawFreeze` revisa congelaciones sobre la pseudo-cuenta, tú y el destino.

`VaultWithdraw::doApply`: si `Amount` es activo, `assetsToSharesWithdraw` calcula las shares (truncadas con fixCleanup3_4_0, así nunca cobras más de lo pedido); si son 0, `tecPRECISION_LOSS`. Si `Amount` son shares, `sharesToAssetsWithdraw` = `AssetsTotal` × shares / `OutstandingAmount`. Si eres el único accionista (`isSoleShareholder`) no se descuenta `LossUnrealized`: te llevas también el valor futuro. Comprueba que tienes las shares (`tecINSUFFICIENT_FUNDS`) y que `AssetsAvailable` cubre el pago (`tecINSUFFICIENT_FUNDS`: el capital prestado por un LoanBroker no está disponible). Si quemas **todas** las shares en circulación, el pago se fija en todo `AssetsAvailable` y los totales pasan a cero para no dejar polvo. Mueve las shares de ti a la pseudo-cuenta, borra tu `MPToken` de shares si queda vacío (salvo que seas el owner) y `doWithdraw` paga al destino, creando tu trust line/MPToken si hace falta.

## Campos clave

- **VaultID** — `index` del Vault.
- **Amount** — en el activo de la bóveda (cantidad fija de activos, shares variables) o en shares como `{mpt_issuance_id: <ShareMPTID>, value}` (shares fijas, activos variables).
- **Destination** — cuenta que recibe el activo. Si la omites, tú. Debe poder recibirlo (trust line/MPToken, DepositAuth, tag).
- **DestinationTag** — obligatorio si el destino tiene `lsfRequireDestTag`.
- **CredentialIDs** — credenciales para superar `lsfDepositAuth` del destino.

## Errores habituales

- **temDISABLED** — el amendment no está activo en testnet; hoy es el único resultado posible.
- **tecNO_ENTRY** — el `VaultID` no existe.
- **tecWRONG_ASSET** — `Amount` no es ni el activo ni la share de esa bóveda.
- **tecINSUFFICIENT_FUNDS** — no tienes tantas shares, o la bóveda no tiene liquidez disponible (`AssetsAvailable` < pago) porque el capital está prestado.
- **tecPRECISION_LOSS** — la cantidad es tan pequeña que equivale a 0 shares o a 0 activos.
- **tecNO_AUTH** — el destino no tiene trust line/MPToken del activo, o no cumple el dominio de una bóveda privada.
- **tecNO_PERMISSION** — el destino exige DepositAuth y no estás preautorizado.
- **tecPSEUDO_ACCOUNT** — el destino es una pseudo-cuenta (AMM, otro vault).

## Ejemplo

```json
{
  "TransactionType": "VaultWithdraw",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Sustituye el `VaultID` de ceros por el `index` real de tu bóveda. `Amount` en drops (1 XRP) porque es una bóveda de XRP; el transactor quemará las shares equivalentes.

## Pruébalo en testnet

1. Hoy: envía el ejemplo desde el builder y obtendrás `temDISABLED`, porque `SingleAssetVault` no está habilitado en la red.
2. Cuando el amendment se active: crea una bóveda de XRP con [VaultCreate](/tx/VaultCreate) y deposita 5 XRP con [VaultDeposit](/tx/VaultDeposit).
3. Retira 1 XRP con el ejemplo. En los metadatos verás tu `MPToken` de shares con 1.000.000 menos y el `Vault` con `AssetsTotal`/`AssetsAvailable` reducidos en 1.000.000 drops.
4. Repite con `Amount` en shares: `{"mpt_issuance_id": "<ShareMPTID>", "value": "4000000"}`. Al quemar todas las shares en circulación, el pago será exactamente el `AssetsAvailable` restante y ambos totales quedarán a 0.
5. Prueba `Destination` con otra cuenta que tenga `lsfRequireDestTag` sin poner `DestinationTag`: `tecDST_TAG_NEEDED`.

## Relacionado

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [DepositPreauth](/objects/DepositPreauth)
- [VaultDeposit](/tx/VaultDeposit), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [DepositPreauth](/tx/DepositPreauth), [CredentialCreate](/tx/CredentialCreate)
- [SingleAssetVault](/amendments/SingleAssetVault), [Credentials](/amendments/Credentials), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
