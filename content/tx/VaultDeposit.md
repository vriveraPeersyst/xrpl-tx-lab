---
title: VaultDeposit
summary: Deposita el activo de una bóveda y recibe a cambio shares (MPT) proporcionales al valor aportado.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultdeposit
xls: XLS-0065
amendment: SingleAssetVault
level: intermedio
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** Cualquier `VaultDeposit` que envíes hoy falla con `temDISABLED`. Esta página describe el código que se activará cuando el amendment se vote.

`VaultDeposit` transfiere una cantidad del activo de la bóveda desde tu cuenta a la pseudo-cuenta del [Vault](/objects/Vault) y, a cambio, la pseudo-cuenta te entrega shares: un [MPToken](/objects/MPToken) de la emisión `ShareMPTID`. Las shares representan tu parte proporcional del valor total de la bóveda. Cuando el fondo gana (por ejemplo, intereses de préstamos) cada share vale más activos; cuando pierde, menos.

Si es tu primer depósito, la transacción crea automáticamente el `MPToken` de shares en tu cuenta (consume 1 unidad de owner reserve). En bóvedas privadas, además, necesitas cumplir el dominio permisionado salvo que seas el owner.

## Cuándo usarlo

- Aportar liquidez a un fondo de préstamos (XLS-66) y obtener rendimiento vía las shares.
- Participar en una bóveda privada para la que tienes credenciales del [PermissionedDomain](/objects/PermissionedDomain).
- Cualquier escenario en el que quieras convertir un activo en una participación fungible y transferible (si el owner no marcó `tfVaultShareNonTransferable`).

## Cómo funciona por dentro

`VaultDeposit::preflight` (validación estática): `temMALFORMED` si `VaultID` es cero; `temBAD_AMOUNT` si `Amount` es cero o negativo.

`VaultDeposit::preclaim` (contra el ledger):
- Busca el Vault (`tecNO_ENTRY`). Con [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), una bóveda cerrada en fase de inversión o de redención rechaza depósitos con `tecEXPIRED`.
- `Amount` debe ser exactamente el `Asset` de la bóveda (`tecWRONG_ASSET`); no puedes depositar shares.
- `canTransfer` comprueba que el activo puede moverse de ti a la pseudo-cuenta (para MPT, `lsfMPTCanTransfer`; para IOU, rippling y freeze).
- Con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) (activo en testnet), `checkDepositFreeze` rechaza si el activo está congelado globalmente o para ti (`tecFROZEN` en IOU, `tecLOCKED` en MPT).
- Si la bóveda es privada y no eres el owner, `checkVaultDomain` valida que tienes una credencial aceptada del `DomainID` de la emisión de shares; sin dominio devuelve `tecNO_AUTH`. Una credencial caducada se tolera aquí porque `doApply` la borra.
- `requireAuth`: si el activo es un MPT necesitas ya tener el MPToken (y estar autorizado si la emisión lo exige).
- Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), el importe se redondea hacia abajo a la escala del `AssetsTotal`; si queda a cero, `tecPRECISION_LOSS`. Después comprueba que tu saldo cubre el importe (`tecINSUFFICIENT_FUNDS`).

`VaultDeposit::doApply`: si eres owner o la bóveda es pública, crea tu `MPToken` de shares si no existe; si es privada y no eres owner, `enforceMPTokenAuthorization` te autoriza contra el dominio. Luego calcula las shares con `assetsToSharesDeposit` (`VaultHelpers.cpp`): si `AssetsTotal` es 0, shares = importe × 10^`Scale` truncado; si no, shares = `OutstandingAmount` × importe / `AssetsTotal`, truncado a entero. Si sale 0 shares, `tecPRECISION_LOSS`. Convierte esas shares de vuelta a activos para cobrarte solo lo que valen realmente (nunca más de lo ofrecido). Suma el resultado a `AssetsTotal` y `AssetsAvailable`, y si `AssetsMaximum` ≠ 0 y el nuevo total lo supera, `tecLIMIT_EXCEEDED`. Finalmente mueve los activos de ti a la pseudo-cuenta y las shares de la pseudo-cuenta a ti, ambos sin transfer fee (`WaiveTransferFee::Yes`). Un desbordamiento numérico con escalas grandes devuelve `tecPATH_DRY`.

## Campos clave

- **VaultID** — `index` del objeto Vault.
- **Amount** — cantidad del activo de la bóveda: drops si es XRP, `{currency, issuer, value}` si es IOU, `{mpt_issuance_id, value}` si es MPT. Lo que realmente se cobra puede ser algo menor por el truncado a shares enteras.

## Errores habituales

- **temDISABLED** — el amendment no está activo en testnet; hoy es el único resultado posible.
- **tecNO_ENTRY** — no existe una bóveda con ese `VaultID`.
- **tecWRONG_ASSET** — `Amount` no es el activo de la bóveda (moneda o emisor distinto).
- **tecINSUFFICIENT_FUNDS** — tu saldo del activo es menor que el importe.
- **tecNO_AUTH / tecEXPIRED** — bóveda privada y no tienes credencial válida del dominio (o el dominio no está configurado).
- **tecLIMIT_EXCEEDED** — el depósito superaría `AssetsMaximum`.
- **tecPRECISION_LOSS** — el importe es tan pequeño que no genera ni una share entera.
- **tecFROZEN / tecLOCKED** — el emisor ha congelado el activo.

## Ejemplo

```json
{
  "TransactionType": "VaultDeposit",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "5000000"
}
```

Sustituye el `VaultID` de ceros por el `index` de la bóveda (el de ceros falla con `temMALFORMED`). `Amount` en drops porque el activo es XRP: 5 XRP.

## Pruébalo en testnet

1. Hoy: envía el ejemplo desde el builder y obtendrás `temDISABLED`, porque `SingleAssetVault` no está habilitado en la red.
2. Cuando el amendment se active: crea una bóveda de XRP con [VaultCreate](/tx/VaultCreate) y usa su `index` como `VaultID`.
3. Envía el depósito. En los metadatos verás modificado el `Vault` (`AssetsTotal` y `AssetsAvailable` +5.000.000), la pseudo-cuenta con +5 XRP, y un `MPToken` creado o modificado en tu cuenta con `MPTAmount` = 5.000.000 shares (escala 0 al ser XRP y primer depósito).
4. Consulta `account_objects` con `type: "mptoken"`: tu balance de shares. `ledger_entry` con `{"vault": "<VaultID>"}` muestra los totales.
5. Haz un segundo depósito de otra cuenta y comprueba que recibe shares en la misma proporción.

## Relacionado

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [MPTokenIssuance](/objects/MPTokenIssuance)
- [VaultCreate](/tx/VaultCreate), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback)
- [CredentialAccept](/tx/CredentialAccept), [PermissionedDomainSet](/tx/PermissionedDomainSet)
- [SingleAssetVault](/amendments/SingleAssetVault), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
