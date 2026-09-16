---
title: LoanPay
summary: Paga una o varias cuotas de un préstamo, un pago tardío, una cancelación anticipada o un sobrepago, repartiendo entre Vault y broker.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanpay
xls: XLS-0066
amendment: LendingProtocol
level: avanzado
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanPay` es la transacción con la que el **prestatario** devuelve un [Loan](/objects/Loan). Según el flag, hace un pago regular (una o varias cuotas de golpe), un pago tardío con penalizaciones, una cancelación anticipada total o un pago regular con sobrepago de principal. Cada pago se descompone en tres partes: principal e interés, que vuelven a la pseudo-cuenta del [Vault](/objects/Vault), y las fees del broker (`ManagementFeeRate` sobre el interés más `LoanServiceFee`, `LatePaymentFee`, etc.), que van al owner del [LoanBroker](/objects/LoanBroker).

Detalle importante: si el broker no tiene el cover mínimo, o no puede recibir el activo (deep frozen, sin autorización), la fee no se pierde: se ingresa en la pseudo-cuenta del broker y suma a `CoverAvailable`. Y si el préstamo estaba *impaired*, un pago lo restaura automáticamente (`unimpairLoan`) antes de aplicarse.

## Cuándo usarlo

- Pagar la cuota del periodo (o adelantar varias en una sola transacción, hasta 100).
- Ponerte al día tras un retraso (`tfLoanLatePayment`), antes de que el broker declare el default.
- Liquidar el préstamo entero antes de tiempo (`tfLoanFullPayment`).
- Reducir principal por encima de la cuota (`tfLoanOverpayment`), si el préstamo lo permite.

## Cómo funciona por dentro

**preflight** (`LoanPay::preflight`): `LoanID` ≠ 0; `Amount` > 0 (`temBAD_AMOUNT`); a lo sumo un flag de los tres (`temINVALID_FLAG`).

**calculateBaseFee** (`LoanPay::calculateBaseFee`): un pago regular puede procesar varias cuotas, así que el fee mínimo escala: un fee base por cada 5 cuotas estimadas (`Amount / (cuota + LoanServiceFee)`), con tope de 20 fees base (100 cuotas). Pagos tardíos y totales cuestan un solo fee base.

**preclaim** (`LoanPay::preclaim`):
- El Loan debe existir y `Borrower` debe ser tu cuenta (`tecNO_PERMISSION`).
- `tfLoanOverpayment` sobre un préstamo sin `lsfLoanOverpayment` → `tecNO_PERMISSION` (con [fixCleanup3_1_3](/amendments/fixCleanup3_1_3); antes, `temINVALID_FLAG`).
- Si `PaymentRemaining = 0` o `PrincipalOutstanding = 0`, `tecKILLED` (ya pagado).
- `Amount` en el activo del Vault (`tecWRONG_ASSET`); tú no congelado; pseudo-cuenta del Vault no deep frozen; autorización del emisor.
- Debes tener **todo** `Amount` disponible aunque el pago consuma menos: no hay pagos parciales (`tecINSUFFICIENT_FUNDS`).

**doApply** (`LoanPay::doApply` y `loanMakePayment` en `LendingHelpers.cpp`):
- Si el pago está vencido (`isPaymentLate`) y no llevas `tfLoanLatePayment`, `tecEXPIRED`.
- **Regular**: bucle que aplica cuotas completas mientras `Amount` cubra `PeriodicPayment + LoanServiceFee`, queden pagos y no supere 100. Si no alcanza ni para una cuota, `tecINSUFFICIENT_PAYMENT`. El remanente se ignora salvo con sobrepago.
- **Overpayment**: tras las cuotas completas, el resto (redondeado a `LoanScale`) se aplica a principal con `OverpaymentFee` y `OverpaymentInterestRate`, y se recalcula el calendario.
- **Late**: una cuota más el interés de demora (`LateInterestRate` sobre el retraso) y `LatePaymentFee`. Si `Amount` no cubre el total, `tecINSUFFICIENT_PAYMENT`.
- **Full**: solo si `PaymentRemaining > 1` (`tecKILLED` en la última cuota). Paga el principal teórico pendiente más el interés devengado y de cierre (`CloseInterestRate`) más `ClosePaymentFee`.
- Después actualiza `PrincipalOutstanding`, `TotalValueOutstanding`, `NextPaymentDueDate`, `PaymentRemaining`; `Vault.AssetsAvailable += principal + interés`; `Vault.AssetsTotal` según modelo accrual o cash-basis; `Broker.DebtTotal −= delta`.
- `accountSendMulti` desde tu cuenta a la pseudo-cuenta del Vault y al payee del broker, sin transfer fee. Si `AssetsAvailable` no cambia por redondeo, `tecPRECISION_LOSS`.

## Campos clave

- **LoanID** — préstamo a pagar.
- **Amount** — cantidad que pones a disposición, en el activo del Vault. Debe cubrir al menos una cuota (regular), o el total exigido (late/full). Lo que sobre no se cobra (excepto en sobrepago).

## Flags

- **tfLoanOverpayment** (0x00010000) — pago regular más sobrepago de principal. Requiere `lsfLoanOverpayment` en el Loan.
- **tfLoanFullPayment** (0x00020000) — cancela el préstamo completo antes de la última cuota.
- **tfLoanLatePayment** (0x00040000) — obligatorio si `NextPaymentDueDate` ya pasó.

Son mutuamente excluyentes.

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **tecNO_PERMISSION** — no eres el prestatario, o pides sobrepago en un préstamo que no lo admite.
- **tecEXPIRED** — el pago está vencido y no usaste `tfLoanLatePayment`.
- **tecINSUFFICIENT_PAYMENT** — `Amount` no cubre la cuota (o el total tardío/completo).
- **tecINSUFFICIENT_FUNDS** — tu saldo disponible es menor que `Amount`.
- **tecKILLED** — el préstamo ya está pagado, o intentas `tfLoanFullPayment` en la última cuota.
- **tecWRONG_ASSET** — `Amount` no es el activo del Vault.
- **telINSUF_FEE_P** — el fee no cubre los incrementos por número de cuotas.

## Ejemplo

```json
{
  "TransactionType": "LoanPay",
  "Account": "rXXXX_TU_CUENTA",
  "LoanID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "2500000"
}
```

Pago regular de 2,5 XRP (una cuota del préstamo de 10 XRP a 4 plazos del ejemplo de [LoanSet](/tx/LoanSet); ajusta a `PeriodicPayment + LoanServiceFee` del Loan real). Sustituye `LoanID` por el índice del Loan.

## Pruébalo en testnet

1. Hoy el builder devolverá `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: crea un préstamo con [LoanSet](/tx/LoanSet) y lee `PeriodicPayment`, `LoanServiceFee` y `NextPaymentDueDate` en `account_objects` (`type: "loan"`).
3. Antes del vencimiento, envía `LoanPay` con `Amount` ≥ `PeriodicPayment + LoanServiceFee`. Verás `PaymentRemaining` bajar en 1, `NextPaymentDueDate` avanzar un `PaymentInterval`, `AssetsAvailable` del Vault subir y el owner del broker recibir su fee.
4. Envía el doble: se aplicarán dos cuotas en una sola transacción.
5. Deja pasar el vencimiento y paga sin flag: `tecEXPIRED`. Repite con `Flags: 262144` y observa que se cobran `LatePaymentFee` e interés de demora.

## Relacionado

- [LoanSet](/tx/LoanSet), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [fixCleanup3_1_3](/amendments/fixCleanup3_1_3), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
