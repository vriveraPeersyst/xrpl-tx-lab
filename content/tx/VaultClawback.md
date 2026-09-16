---
title: VaultClawback
summary: Permite al emisor del activo recuperar fondos depositados por un holder en una bóveda, o al owner quemar shares huérfanas.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultclawback
xls: XLS-0065
amendment: SingleAssetVault
level: avanzado
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** Cualquier `VaultClawback` que envíes hoy falla con `temDISABLED`. Esta página describe el código que se activará cuando el amendment se vote.

`VaultClawback` extiende el clawback de tokens a los fondos guardados en un [Vault](/objects/Vault). Un holder que deposita un IOU o un MPT en una bóveda ya no lo tiene en su cuenta (lo tiene la pseudo-cuenta), así que un [Clawback](/tx/Clawback) normal no lo alcanza. Con esta transacción el **emisor del activo** quema las shares del `Holder` y recibe de la pseudo-cuenta el activo equivalente. XRP no se puede recuperar nunca.

Tiene un segundo uso, distinto, para el **owner de la bóveda**: cuando el vault se ha quedado sin activos (`AssetsTotal` y `AssetsAvailable` a 0, por ejemplo tras una pérdida total en préstamos) pero siguen existiendo shares, el owner puede quemar todas las shares de un holder para poder llegar a [VaultDelete](/tx/VaultDelete).

## Cuándo usarlo

- Cumplimiento normativo: el emisor de un stablecoin debe inmovilizar/recuperar fondos de una cuenta aunque estén dentro de una bóveda.
- Emisores de MPT con `lsfMPTCanClawback` que necesitan revertir un depósito.
- Limpieza por el owner: eliminar shares sin valor de una bóveda vacía antes de borrarla.

## Cómo funciona por dentro

`VaultClawback::preflight` (validación estática): `temMALFORMED` si `VaultID` es cero o si `Amount` es XRP; `temBAD_AMOUNT` si `Amount` es negativo. Un `Amount` de cero es válido y significa "todo".

`VaultClawback::preclaim` (contra el ledger):
- Busca el Vault (`tecNO_ENTRY`) y su emisión de shares. Con [fixCleanup3_4_0](/amendments/fixCleanup3_4_0), si `Holder` es una pseudo-cuenta, `tecPSEUDO_ACCOUNT`.
- Si omites `Amount`, `clawbackAmount` lo deduce: si eres el `Owner` del vault, quiere decir "shares"; si no, "el activo". Caso ambiguo: si el emisor del activo es también el owner debes indicar `Amount` (`tecWRONG_ASSET`).
- **Vía shares** (`Amount` en shares o implícito para el owner): solo el `Owner` (`tecNO_PERMISSION`); solo si hay shares en circulación y `AssetsTotal` = `AssetsAvailable` = 0 (`tecNO_PERMISSION`); y si indicas un `Amount` distinto de 0 debe ser exactamente todas las shares del holder (`tecLIMIT_EXCEEDED`).
- **Vía activo** (`Amount` en el activo de la bóveda): `tecNO_PERMISSION` si el activo es XRP, si no eres su emisor, o si `Holder` eres tú. Para MPT, la emisión debe tener `lsfMPTCanClawback`; para IOU, tu cuenta debe tener `lsfAllowTrustLineClawback` y no `lsfNoFreeze` (en ambos casos `tecNO_PERMISSION` si no se cumple).
- Cualquier otro activo: `tecWRONG_ASSET`.

`VaultClawback::doApply`: en la vía owner, quema todo el saldo de shares del holder sin mover activos. En la vía emisor, `assetsToClawback` calcula el par (activos recuperados, shares destruidas): con `Amount` = 0 usa todas las shares del holder y las convierte a activos con `sharesToAssetsWithdraw`; con un importe concreto convierte activos → shares (truncando con fixCleanup3_4_0) y vuelve a activos. El resultado se **limita a `AssetsAvailable`**: si parte del capital está prestado por un [LoanBroker](/objects/LoanBroker), solo recuperas lo que hay en caja y se re-derivan las shares. Si el holder es el único accionista no se descuenta `LossUnrealized`. Si las shares a destruir son 0, `tecPRECISION_LOSS`. Después resta lo recuperado de `AssetsTotal` y `AssetsAvailable`, mueve las shares del holder a la pseudo-cuenta (borrando su `MPToken` si queda vacío y no es el owner) y envía los activos de la pseudo-cuenta al emisor, siempre sin transfer fee. Un desbordamiento numérico produce `tecPATH_DRY`.

## Campos clave

- **VaultID** — `index` del Vault.
- **Holder** — cuenta cuyas shares se queman. No puede ser el emisor ni una pseudo-cuenta.
- **Amount** — opcional. En el activo de la bóveda (solo emisor): cantidad a recuperar, `0` o ausente = todo lo que respalden las shares del holder, siempre limitado a `AssetsAvailable`. En shares (solo owner, bóveda sin activos): `0` o el saldo exacto del holder.

## Errores habituales

- **temDISABLED** — el amendment no está activo en testnet; hoy es el único resultado posible.
- **temMALFORMED** — `Amount` es XRP o `VaultID` a ceros.
- **tecNO_PERMISSION** — no eres el emisor del activo (o el activo es XRP); el emisor no tiene `lsfAllowTrustLineClawback` / la emisión MPT no tiene `lsfMPTCanClawback`; o intentas quemar shares sin ser owner o con activos aún en la bóveda.
- **tecWRONG_ASSET** — `Amount` de otra moneda, o eres emisor y owner a la vez y no has indicado `Amount`.
- **tecLIMIT_EXCEEDED** — como owner, `Amount` en shares no coincide con el saldo total del holder.
- **tecPRECISION_LOSS** — el holder no tiene shares o el importe equivale a 0 shares.
- **tecPSEUDO_ACCOUNT** — `Holder` es una pseudo-cuenta.

## Ejemplo

```json
{
  "TransactionType": "VaultClawback",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Holder": "rYYYY_OTRA_CUENTA"
}
```

Sustituye el `VaultID` de ceros por el `index` real. Este ejemplo, sin `Amount`, funciona como emisor de un IOU/MPT que es el activo de la bóveda (recupera todo lo que respaldan las shares del holder) o, si eres el owner de una bóveda vacía, quema todas las shares del holder. Para una bóveda de XRP el clawback siempre falla.

## Pruébalo en testnet

1. Hoy: envía el ejemplo desde el builder y obtendrás `temDISABLED`, porque `SingleAssetVault` no está habilitado en la red.
2. Cuando el amendment se active: desde una cuenta emisora activa `asfAllowTrustLineClawback` con [AccountSet](/tx/AccountSet) (antes de emitir nada), emite un token USD a otra cuenta y crea con esa emisora un `VaultCreate` de `{currency: "USD", issuer: rXXXX_TU_CUENTA}`. Nota: como serás emisor y owner a la vez, tendrás que indicar `Amount` explícito.
3. Que la otra cuenta deposite USD con [VaultDeposit](/tx/VaultDeposit).
4. Envía `VaultClawback` con `Holder` = esa cuenta y `Amount: {currency: "USD", issuer: rXXXX_TU_CUENTA, value: "0"}`. En los metadatos verás el `MPToken` de shares del holder borrado, el `Vault` con `AssetsTotal` reducido y la trust line entre pseudo-cuenta y emisor con menos saldo.
5. Prueba lo mismo contra una bóveda de XRP: con `Amount` en drops falla en `preflight` con `temMALFORMED`; sin `Amount` y sin ser el owner, `preclaim` deduce "el activo" y responde `tecNO_PERMISSION` porque XRP no tiene emisor. En bóvedas de XRP solo existe la vía owner (quemar shares cuando no quedan activos).

## Relacionado

- [Vault](/objects/Vault), [MPToken](/objects/MPToken), [RippleState](/objects/RippleState)
- [Clawback](/tx/Clawback), [AMMClawback](/tx/AMMClawback), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete)
- [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [SingleAssetVault](/amendments/SingleAssetVault), [Clawback](/amendments/Clawback), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
