---
title: LoanManage
summary: Permite al broker declarar un préstamo deteriorado (impaired), revertirlo, o declararlo en default liquidando el cover.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanmanage
xls: XLS-0066
amendment: LendingProtocol
level: avanzado
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanManage` es la herramienta del **owner del LoanBroker** para gestionar un préstamo que va mal. Tiene tres acciones excluyentes, elegidas por flag:

- **Impair** (`tfLoanImpair`): marca el [Loan](/objects/Loan) como deteriorado y registra en el [Vault](/objects/Vault) una "pérdida sobre el papel" (`LossUnrealized`) por el valor expuesto. No mueve fondos; reduce el valor contable de las shares del Vault.
- **Unimpair** (`tfLoanUnimpair`): revierte lo anterior. Un [LoanPay](/tx/LoanPay) del prestatario también lo hace automáticamente.
- **Default** (`tfLoanDefault`): cierra el préstamo como impagado. Liquida el capital de primera pérdida del broker hacia el Vault, reconoce la pérdida restante y deja el Loan con todo a cero (`PaymentRemaining = 0`), listo para [LoanDelete](/tx/LoanDelete).

Sin flags es una operación nula que solo actualiza metadatos.

## Cuándo usarlo

- El prestatario se ha retrasado y quieres que los depositantes del Vault vean reflejada la exposición (impair).
- Ha vencido la cuota más el `GracePeriod` y decides ejecutar el default.
- Te equivocaste al deteriorar un préstamo, o el prestatario se ha puesto al día fuera de cadena (unimpair).

## Cómo funciona por dentro

**preflight** (`LoanManage::preflight`): `LoanID` ≠ 0; como mucho un flag activo (`temINVALID_FLAG`).

**preclaim** (`LoanManage::preclaim`), transiciones permitidas:
- Un Loan con `lsfLoanDefault` ya no se puede tocar (`tecNO_PERMISSION`).
- No se puede impair dos veces, ni unimpair uno que no está impaired (`tecNO_PERMISSION`).
- Un préstamo totalmente pagado (`PaymentRemaining = 0`) no se modifica (`tecNO_PERMISSION`).
- `tfLoanDefault` exige que haya pasado `NextPaymentDueDate + GracePeriod`; si no, `tecTOO_SOON`.
- Solo el `Owner` del broker puede enviarla (`tecNO_PERMISSION`).

**doApply → `LoanManage::impairLoan`**: con [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) solo se puede deteriorar un préstamo cuyo pago ya está vencido (`tecTOO_SOON`). Suma `loanVaultExposure` (valor pendiente para el Vault) a `Vault.LossUnrealized`; si esa pérdida superase `AssetsTotal − AssetsAvailable`, `tecLIMIT_EXCEEDED`. Marca `lsfLoanImpaired`. Antes del fix, además adelantaba `NextPaymentDueDate` al momento actual.

**doApply → `LoanManage::unimpairLoan`**: resta la exposición de `LossUnrealized` y quita `lsfLoanImpaired`. Sin `fixCleanup3_4_0`, recalcula `NextPaymentDueDate`.

**doApply → `LoanManage::defaultLoan`**:
1. `totalDefaultAmount = loanVaultExposure(loan)`.
2. Cover liquidado = `min(CoverRateLiquidation × (CoverRateMinimum × DebtTotal), totalDefaultAmount)`, acotado por `CoverAvailable`.
3. Vault: `AssetsTotal −= (total − cubierto)`; `AssetsAvailable += cubierto`. Si el Loan estaba impaired, se descuenta de `LossUnrealized` (la pérdida pasa de latente a real).
4. Broker: `DebtTotal −= total`; `CoverAvailable −= cubierto`.
5. Loan: `lsfLoanDefault`, y `TotalValueOutstanding`, `PaymentRemaining`, `PrincipalOutstanding`, `ManagementFeeOutstanding` y `NextPaymentDueDate` a 0.
6. `accountSend` del importe cubierto desde la pseudo-cuenta del broker a la del Vault (con `fixCleanup3_4_0` este envío queda exento de congelación).

Con [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), todas las rutas con éxito refrescan `associateAsset` en Loan, broker y Vault.

## Campos clave

- **LoanID** — préstamo a gestionar.

## Flags

- **tfLoanDefault** (0x00010000) — ejecuta el default. Irreversible.
- **tfLoanImpair** (0x00020000) — marca como deteriorado y anota `LossUnrealized` en el Vault.
- **tfLoanUnimpair** (0x00040000) — revierte el impair.

Solo puedes activar uno por transacción.

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temINVALID_FLAG** — más de un flag a la vez.
- **tecNO_PERMISSION** — no eres el owner del broker, el préstamo ya está en default o pagado, o la transición no está permitida (impair sobre impaired, unimpair sobre sano).
- **tecTOO_SOON** — default antes de `NextPaymentDueDate + GracePeriod`, o impair (con `fixCleanup3_4_0`) antes del vencimiento.
- **tecLIMIT_EXCEEDED** — la pérdida latente dejaría inconsistente el Vault.
- **tecNO_ENTRY** — el Loan no existe.

## Ejemplo

```json
{
  "TransactionType": "LoanManage",
  "Account": "rXXXX_TU_CUENTA",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Flags": 65536
}
```

`Flags: 65536` es `tfLoanDefault`. Sustituye `LoanID` por el índice del Loan; tu cuenta debe ser el owner del broker que lo concedió.

## Pruébalo en testnet

1. Hoy recibirás `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: crea un préstamo corto (`PaymentInterval: 60`, `GracePeriod: 60`) con [LoanSet](/tx/LoanSet) y no pagues.
3. Pasados 60 s, envía `LoanManage` con `Flags: 131072` (impair). En `ledger_entry` del Vault verás `LossUnrealized` > 0 y en el Loan la flag `lsfLoanImpaired`.
4. Pasados 120 s desde el inicio, envía `Flags: 65536` (default). Observa: `CoverAvailable` del broker baja, `AssetsAvailable` del Vault sube en lo cubierto, `AssetsTotal` baja en lo no cubierto y el Loan queda con `PaymentRemaining: 0` y `lsfLoanDefault`.
5. Termina con [LoanDelete](/tx/LoanDelete).

## Relacionado

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanDelete](/tx/LoanDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
