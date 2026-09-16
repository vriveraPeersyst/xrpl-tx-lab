---
title: VaultSet
summary: Modifica los campos mutables de una bóveda existente: tope de activos, datos y dominio permisionado.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultset
xls: XLS-0065
amendment: SingleAssetVault
level: intermedio
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** Cualquier `VaultSet` que envíes hoy falla con `temDISABLED`. Esta página describe el código que se activará cuando el amendment se vote.

`VaultSet` es la transacción de mantenimiento de un [Vault](/objects/Vault). Solo el `Owner` de la bóveda puede enviarla y solo cambia tres cosas: el tope `AssetsMaximum`, el campo libre `Data` y, en bóvedas privadas, el `DomainID` que decide quién puede participar. Todo lo demás (activo, política de retirada, escala, si es privada o no) queda fijado en [VaultCreate](/tx/VaultCreate) y no se puede tocar.

Un detalle importante: el `DomainID` no vive en el objeto Vault sino en la [MPTokenIssuance](/objects/MPTokenIssuance) de las shares. `VaultSet` actualiza esa emisión (y además marca el Vault como modificado para que los invariantes puedan verificarlo).

## Cuándo usarlo

- Subir o bajar el límite de capital que acepta la bóveda según la demanda.
- Cambiar el dominio permisionado de una bóveda privada (por ejemplo, migrar a un nuevo emisor de credenciales) o quitarlo enviando `DomainID` a ceros.
- Actualizar el `Data` descriptivo (hasta 256 bytes) que ven los integradores.

## Cómo funciona por dentro

`VaultSet::checkExtraFeatures` exige [PermissionedDomains](/amendments/PermissionedDomains) si envías `DomainID`.

`VaultSet::preflight` (validación estática) devuelve `temMALFORMED` si `VaultID` es cero, si `Data` está vacío o supera 256 bytes, si `AssetsMaximum` es negativo, o si **no envías ninguno** de los tres campos mutables (una transacción que no cambia nada no es válida).

`VaultSet::preclaim` (contra el ledger): busca el Vault (`tecNO_ENTRY` si no existe) y comprueba que `Account` es su `Owner` (`tecNO_PERMISSION` si no). Si envías `DomainID`, exige que el Vault tenga `lsfVaultPrivate` (`tecNO_PERMISSION` en caso contrario: no existe forma de convertir una bóveda pública en privada) y, si el `DomainID` no es cero, que el [PermissionedDomain](/objects/PermissionedDomain) exista (`tecOBJECT_NOT_FOUND`).

`VaultSet::doApply`: copia `Data` si viene. Si viene `AssetsMaximum` y es distinto de 0, comprueba que no sea menor que el `AssetsTotal` actual (`tecLIMIT_EXCEEDED`); es decir, no puedes fijar un tope por debajo de lo que ya hay depositado, aunque sí puedes quitar el tope con `0`. Si viene `DomainID`: un valor distinto de cero lo escribe en la emisión de shares (`sfDomainID`), y un valor cero lo elimina de la emisión, con lo que la bóveda privada queda solo accesible al owner (el flag `lsfMPTRequireAuth` sigue puesto y `checkVaultDomain` devuelve `tecNO_AUTH` sin dominio).

## Campos clave

- **VaultID** — el `index` del objeto Vault (lo obtienes de los metadatos del VaultCreate o de `account_objects` con `type: "vault"`).
- **AssetsMaximum** — nuevo tope de `AssetsTotal`. `0` = sin límite. Un valor positivo menor que el total actual falla.
- **DomainID** — solo en bóvedas privadas. Un hash de 32 bytes a ceros elimina el dominio actual.
- **Data** — hasta 256 bytes en hex; no puede enviarse vacío.

## Errores habituales

- **temDISABLED** — el amendment no está activo en testnet; hoy es el único resultado posible.
- **temMALFORMED** — no has incluido ningún campo a modificar, `VaultID` a ceros o `Data` vacío/demasiado largo.
- **tecNO_ENTRY** — no existe un Vault con ese `VaultID`.
- **tecNO_PERMISSION** — no eres el `Owner`, o intentas poner `DomainID` en una bóveda que no se creó con `tfVaultPrivate`.
- **tecOBJECT_NOT_FOUND** — el `DomainID` indicado no existe.
- **tecLIMIT_EXCEEDED** — `AssetsMaximum` es positivo y menor que el `AssetsTotal` actual.

## Ejemplo

```json
{
  "TransactionType": "VaultSet",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "AssetsMaximum": "2000000000"
}
```

Sustituye el `VaultID` de ceros por el `index` real de tu bóveda (el de ceros falla en `preflight` con `temMALFORMED`). Al ser una bóveda de XRP, `AssetsMaximum` se expresa en drops (2.000 XRP).

## Pruébalo en testnet

1. Hoy: envía el ejemplo desde el builder y verás `temDISABLED`, porque `SingleAssetVault` no está habilitado. No se consume fee ni Sequence.
2. Cuando el amendment se active: crea antes una bóveda con [VaultCreate](/tx/VaultCreate) y copia su `index`.
3. Envía `VaultSet` con ese `VaultID` y un `AssetsMaximum` mayor. Consulta `ledger_entry` con `{"vault": "<VaultID>"}` o `account_objects` con `type: "vault"`: verás el nuevo `AssetsMaximum`.
4. Prueba a poner un tope inferior a `AssetsTotal` tras un depósito: obtendrás `tecLIMIT_EXCEEDED`.
5. Si la bóveda es privada, cambia el `DomainID` y comprueba con `ledger_entry` sobre el `ShareMPTID` (tipo `mpt_issuance`) que el campo `DomainID` ha cambiado en la emisión de shares, no en el Vault.

## Relacionado

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
- [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultDelete](/tx/VaultDelete)
- [PermissionedDomainSet](/tx/PermissionedDomainSet)
- [SingleAssetVault](/amendments/SingleAssetVault), [PermissionedDomains](/amendments/PermissionedDomains)
