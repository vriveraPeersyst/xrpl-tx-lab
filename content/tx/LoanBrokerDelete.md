---
title: LoanBrokerDelete
summary: Borra un LoanBroker sin préstamos vivos, devuelve el cover restante al propietario y elimina su pseudo-cuenta.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokerdelete
xls: XLS-0066
amendment: LendingProtocol
level: intermedio
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo que sigue describe su comportamiento cuando se active.

`LoanBrokerDelete` elimina un objeto [LoanBroker](/objects/LoanBroker) que ya no tiene préstamos asociados. En la misma transacción se transfiere al propietario todo el capital de primera pérdida que quedaba en la pseudo-cuenta del broker (`CoverAvailable`), se borra el holding vacío de esa pseudo-cuenta, se borra la propia pseudo-cuenta y se liberan las dos unidades de owner reserve que consumía el broker.

Es la operación inversa de [LoanBrokerSet](/tx/LoanBrokerSet) en modo creación. No afecta al [Vault](/objects/Vault) subyacente, que sigue existiendo.

## Cuándo usarlo

- Has cerrado la actividad de préstamo: todos los [Loan](/objects/Loan) se han pagado o han entrado en default y se han borrado con [LoanDelete](/tx/LoanDelete).
- Quieres recuperar el cover depositado sin pasar por [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw) y liberar la reserva.
- Antes de borrar el Vault con [VaultDelete](/tx/VaultDelete), que exige que la pseudo-cuenta del Vault no tenga objetos en su directorio.

## Cómo funciona por dentro

**preflight** (`LoanBrokerDelete::preflight`): solo comprueba que `LoanBrokerID` no sea cero (`temINVALID`). Antes, `checkExtraFeatures` exige los amendments del protocolo o devuelve `temDISABLED`.

**preclaim** (`LoanBrokerDelete::preclaim`):
- El broker debe existir (`tecNO_ENTRY`) y tú debes ser su `Owner` (`tecNO_PERMISSION`).
- `OwnerCount` del broker (número de préstamos vivos) debe ser 0; si no, `tecHAS_OBLIGATIONS`.
- Comprobación defensiva: si `DebtTotal` redondeado a la escala del Vault no es cero, `tecHAS_OBLIGATIONS` (en la práctica el último [LoanDelete](/tx/LoanDelete) ya lo pone a cero).
- Si queda `CoverAvailable > 0`, el propietario va a recibir fondos: no puede estar *deep frozen* para ese activo. Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) también se comprueba que la pseudo-cuenta del broker no esté congelada o bloqueada.

**doApply** (`LoanBrokerDelete::doApply`):
1. Quita el broker del directorio del propietario y del de la pseudo-cuenta del Vault (`VaultNode`).
2. `accountSend` de `CoverAvailable` desde la pseudo-cuenta del broker al propietario, sin transfer fee.
3. `removeEmptyHolding` de la pseudo-cuenta (borra la trust line o el MPToken).
4. Comprueba que la pseudo-cuenta tenga balance XRP cero, `OwnerCount` 0 y sin directorio; si no, `tecHAS_OBLIGATIONS`. Luego la borra.
5. Reduce en 2 el `OwnerCount` del propietario y borra el broker.

## Campos clave

- **LoanBrokerID** — ID del objeto LoanBroker a borrar (hash de 32 bytes). Lo obtienes en `account_objects` con `type: "loan_broker"` tras el `LoanBrokerSet`.

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temINVALID** — `LoanBrokerID` a cero.
- **tecNO_ENTRY** — no existe ningún LoanBroker con ese ID.
- **tecNO_PERMISSION** — no eres el `Owner` del broker.
- **tecHAS_OBLIGATIONS** — todavía hay préstamos (`OwnerCount > 0`). Bórralos primero con [LoanDelete](/tx/LoanDelete) (requiere que estén pagados o en default).
- **tecFROZEN / tecLOCKED** — tu cuenta está deep frozen para el activo del Vault (o la pseudo-cuenta está congelada) y hay cover que devolver.

## Ejemplo

```json
{
  "TransactionType": "LoanBrokerDelete",
  "Account": "rXXXX_TU_CUENTA",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Sustituye `LoanBrokerID` por el `index` del objeto LoanBroker que creaste con [LoanBrokerSet](/tx/LoanBrokerSet).

## Pruébalo en testnet

1. Hoy el builder devolverá `temDISABLED`: ni `LendingProtocol` ni `SingleAssetVault` están activos en la testnet.
2. Cuando se active: crea un Vault, un broker con [LoanBrokerSet](/tx/LoanBrokerSet) y deposita algo de cover con [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit).
3. Consulta `account_objects` con `type: "loan_broker"` y copia el `index` en `LoanBrokerID`.
4. Envía `LoanBrokerDelete`. Después, `account_objects` ya no mostrará el broker, tu `OwnerCount` habrá bajado en 2 y tu saldo del activo habrá aumentado en el `CoverAvailable` que quedaba.
5. Si intentas borrarlo con un préstamo vivo, observarás `tecHAS_OBLIGATIONS`.

## Relacionado

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanDelete](/tx/LoanDelete), [VaultDelete](/tx/VaultDelete)
- [LoanBroker](/objects/LoanBroker), [Loan](/objects/Loan), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
