---
title: VaultDelete
summary: Borra una bóveda vacía junto con su pseudo-cuenta y la emisión de shares, devolviendo la reserva al owner.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultdelete
xls: XLS-0065
amendment: SingleAssetVault
level: intermedio
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** Cualquier `VaultDelete` que envíes hoy falla con `temDISABLED`. Esta página describe el código que se activará cuando el amendment se vote.

`VaultDelete` destruye un [Vault](/objects/Vault) que ya no tiene nada dentro. Elimina los tres objetos que creó [VaultCreate](/tx/VaultCreate): el propio Vault, la pseudo-cuenta que custodiaba el activo y la [MPTokenIssuance](/objects/MPTokenIssuance) de las shares. También borra el holding vacío del activo de la pseudo-cuenta (trust line o MPToken) y, si aún existe, tu propio `MPToken` de shares. El `OwnerCount` de tu cuenta baja en 2 y recuperas la reserva.

Solo el `Owner` puede borrarla, y solo cuando la bóveda está completamente vacía: sin activos (`AssetsTotal` y `AssetsAvailable` a cero) y sin shares en circulación (`OutstandingAmount` de la emisión a cero). Si quedan depositantes, cada uno debe retirar con [VaultWithdraw](/tx/VaultWithdraw), o el emisor debe recuperar con [VaultClawback](/tx/VaultClawback).

## Cuándo usarlo

- Cerrar un producto de rendimiento que ha terminado y del que todos los participantes ya han salido.
- Recuperar las 2 unidades de owner reserve que bloquea la bóveda.
- Limpiar bóvedas de prueba que creaste y ya no usas.

## Cómo funciona por dentro

`VaultDelete::preflight` (validación estática) devuelve `temMALFORMED` si `VaultID` es cero. Si incluyes `MemoData` (un motivo de borrado de hasta 256 bytes) hace falta [LendingProtocolV1_1](/amendments/LendingProtocolV1_1); sin ese amendment el campo provoca `temDISABLED`.

`VaultDelete::preclaim` (contra el ledger): busca el Vault (`tecNO_ENTRY`), comprueba que `Account` es el `Owner` (`tecNO_PERMISSION`) y que `AssetsAvailable` y `AssetsTotal` son cero (`tecHAS_OBLIGATIONS`). Después lee la emisión de shares (`ShareMPTID`), verifica que su emisor es la pseudo-cuenta del Vault y que `OutstandingAmount` es cero (`tecHAS_OBLIGATIONS` si quedan shares en manos de alguien).

`VaultDelete::doApply` hace la limpieza en orden: (1) `removeEmptyHolding` sobre la pseudo-cuenta para borrar su trust line o MPToken del activo; (2) si tú, el owner, aún tienes un `MPToken` de shares, lo elimina; (3) quita la emisión de shares del directorio de la pseudo-cuenta, decrementa su `OwnerCount` y la borra; (4) comprueba que la pseudo-cuenta no tiene balance, ni objetos, ni directorio (si no, `tecHAS_OBLIGATIONS`) y borra su `AccountRoot`; (5) quita el Vault de tu directorio, baja tu `OwnerCount` en 2 y borra el Vault. Cualquier inconsistencia en el ledger produce `tefBAD_LEDGER` o `tefINTERNAL`, códigos que en la práctica no deberías ver.

Nota: si la bóveda está enlazada a un [LoanBroker](/objects/LoanBroker) con préstamos activos, `AssetsTotal` no es cero (incluye el capital prestado), así que el borrado falla hasta que el broker devuelva todo.

## Campos clave

- **VaultID** — `index` del objeto Vault que quieres borrar.
- **MemoData** — motivo del borrado, hasta 256 bytes en hex. Solo con [LendingProtocolV1_1](/amendments/LendingProtocolV1_1).

## Errores habituales

- **temDISABLED** — el amendment no está activo en testnet (o has usado `MemoData` sin LendingProtocolV1_1).
- **temMALFORMED** — `VaultID` a ceros o `MemoData` demasiado largo.
- **tecNO_ENTRY** — no existe una bóveda con ese `VaultID`.
- **tecNO_PERMISSION** — no eres el `Owner`.
- **tecHAS_OBLIGATIONS** — quedan activos (`AssetsTotal`/`AssetsAvailable` ≠ 0) o shares en circulación. Retira todo primero.

## Ejemplo

```json
{
  "TransactionType": "VaultDelete",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Sustituye el `VaultID` de ceros por el `index` real de tu bóveda; el de ceros se rechaza en `preflight`.

## Pruébalo en testnet

1. Hoy: envía el ejemplo desde el builder y obtendrás `temDISABLED`, porque `SingleAssetVault` no está habilitado en la red.
2. Cuando el amendment se active: crea una bóveda con [VaultCreate](/tx/VaultCreate), deposita con [VaultDeposit](/tx/VaultDeposit) e intenta borrarla. Verás `tecHAS_OBLIGATIONS`.
3. Retira todo con [VaultWithdraw](/tx/VaultWithdraw) (por ejemplo indicando en `Amount` todas tus shares) y vuelve a enviar `VaultDelete`. Ahora obtendrás `tesSUCCESS`.
4. Consulta `account_objects` con `type: "vault"`: la bóveda ya no está. En `account_info` tu `OwnerCount` ha bajado en 2 y `ledger_entry` sobre la antigua pseudo-cuenta devuelve `entryNotFound`.

## Relacionado

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [VaultCreate](/tx/VaultCreate), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback)
- [LoanBrokerDelete](/tx/LoanBrokerDelete)
- [SingleAssetVault](/amendments/SingleAssetVault), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1)
