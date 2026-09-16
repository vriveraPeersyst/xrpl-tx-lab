---
title: LoanDelete
summary: Borra un objeto Loan que ya no tiene cuotas pendientes (pagado o en default) y libera su reserva.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loandelete
xls: XLS-0066
amendment: LendingProtocol
level: intermedio
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanDelete` elimina un objeto [Loan](/objects/Loan) cuyo ciclo de vida ha terminado: o bien el prestatario pagó todas las cuotas con [LoanPay](/tx/LoanPay), o bien el broker lo declaró en default con [LoanManage](/tx/LoanManage). En ambos casos el Loan queda con `PaymentRemaining = 0`, y es la única condición que exige el transactor.

Pueden enviarla tanto el **prestatario** como el **owner del LoanBroker**. Al borrar, se quita el Loan del directorio del prestatario y del de la pseudo-cuenta del broker, baja en 1 el `OwnerCount` de ambos y, si era el último préstamo del broker, cualquier resto de `DebtTotal` (polvo de redondeo) se pone a cero.

## Cuándo usarlo

- Recuperar la unidad de owner reserve que el prestatario pagaba por el Loan.
- Limpiar préstamos en default para poder borrar el broker con [LoanBrokerDelete](/tx/LoanBrokerDelete), que exige `OwnerCount = 0`.

## Cómo funciona por dentro

**preflight** (`LoanDelete::preflight`): `LoanID` ≠ 0 (`temINVALID`). Antes, `checkExtraFeatures` devuelve `temDISABLED` si faltan los amendments.

**preclaim** (`LoanDelete::preclaim`):
- El Loan debe existir (`tecNO_ENTRY`).
- `PaymentRemaining` debe ser 0; un préstamo activo devuelve `tecHAS_OBLIGATIONS`.
- Se lee el broker del Loan; `Account` debe ser el `Owner` del broker o el `Borrower` del Loan (`tecNO_PERMISSION`).

**doApply** (`LoanDelete::doApply`):
1. `dirRemove` del Loan en el directorio de la pseudo-cuenta del broker (`LoanBrokerNode`) y en el del prestatario (`OwnerNode`).
2. `view.erase(loan)`.
3. `adjustLoanBrokerOwnerCount(-1)` en el broker. Si su `OwnerCount` queda en 0 y `DebtTotal` no es exactamente cero, se fuerza a 0: no quedan préstamos con los que cobrar esa deuda residual.
4. `decreaseOwnerCountForObject` en el prestatario (libera la reserva).

No se mueven fondos: cualquier saldo pendiente ya se liquidó en el último `LoanPay` o se absorbió en el default.

## Campos clave

- **LoanID** — índice del objeto Loan (32 bytes). Se calcula a partir de `LoanBrokerID` y `LoanSequence`; lo ves en `account_objects` con `type: "loan"`.

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temINVALID** — `LoanID` a cero.
- **tecNO_ENTRY** — no existe un Loan con ese ID.
- **tecHAS_OBLIGATIONS** — el préstamo aún tiene cuotas pendientes (`PaymentRemaining > 0`). Págalo con [LoanPay](/tx/LoanPay) o declara el default con [LoanManage](/tx/LoanManage).
- **tecNO_PERMISSION** — no eres ni el prestatario ni el owner del broker.

## Ejemplo

```json
{
  "TransactionType": "LoanDelete",
  "Account": "rXXXX_TU_CUENTA",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Sustituye `LoanID` por el `index` del Loan creado con [LoanSet](/tx/LoanSet).

## Pruébalo en testnet

1. Hoy recibirás `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: crea un préstamo con `PaymentTotal: 1` mediante [LoanSet](/tx/LoanSet) y págalo con un único [LoanPay](/tx/LoanPay).
3. Consulta `account_objects` con `type: "loan"`: `PaymentRemaining` será 0 y `PrincipalOutstanding` 0.
4. Envía `LoanDelete` con ese `LoanID`. El objeto desaparece y tu `OwnerCount` baja en 1.
5. Si lo intentas antes de pagar, verás `tecHAS_OBLIGATIONS`.

## Relacionado

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanBrokerDelete](/tx/LoanBrokerDelete)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker)
- [LendingProtocol](/amendments/LendingProtocol)
