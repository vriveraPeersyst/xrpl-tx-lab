---
title: Loan
summary: Un préstamo individual entre un prestatario y un LoanBroker, con calendario de pagos, intereses y comisiones.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/loan
createdBy: LoanSet
modifiedBy: LoanSet, LoanManage, LoanPay
reserve: 1
---

## Qué representa

Un `Loan` registra la deuda de un `Borrower` frente a un [LoanBroker](/objects/LoanBroker): cuánto debe (`TotalValueOutstanding`, `PrincipalOutstanding`), cuándo toca el próximo pago (`NextPaymentDueDate`) y qué tipos de interés y comisiones se le aplican en cada situación (al día, tarde, en el pago final, o por amortización anticipada). El broker es quien fija estas condiciones al crearlo; el prestatario solo puede pagar o dejar de pagar.

El objeto lleva la contabilidad completa del préstamo: capital pendiente, comisión de gestión acumulada (`ManagementFeeOutstanding`) y el estado de mora se refleja en sus flags, no en un campo de texto.

## Ciclo de vida

- **Creación**: [LoanSet](/tx/LoanSet) por parte del broker (o con su autorización), sin `LoanBrokerID`+`LoanSequence` previos. Fija `StartDate`, `PaymentInterval`, `PeriodicPayment` y los tipos de interés y comisiones. Incrementa `DebtTotal` del `LoanBroker` y `OwnerCount` del prestatario.
- **Pago**: [LoanPay](/tx/LoanPay), normalmente el prestatario, cubre el `PeriodicPayment` (o más, generando `lsfLoanOverpayment`). Actualiza `PreviousPaymentDueDate`/`NextPaymentDueDate` y reduce `PrincipalOutstanding`.
- **Gestión**: [LoanManage](/tx/LoanManage), reservado al broker, marca impago (`lsfLoanDefault`) o deterioro (`lsfLoanImpaired`) cuando se supera `GracePeriod` sin pago, lo que puede disparar el consumo del `CoverAvailable` del broker.
- **Cierre**: [LoanDelete](/tx/LoanDelete), solo cuando el saldo queda a cero (pagado por completo o liquidado tras impago). Borra el objeto y reduce `DebtTotal` del broker.

## Campos clave

- **Borrower** — quien debe pagar; no es necesariamente el `Owner` que paga la reserva del objeto (ese es el broker/propietario).
- **LoanBrokerID / LoanBrokerNode** — el broker al que pertenece este préstamo, y su enlace de directorio.
- **StartDate / PaymentInterval** — cuándo empieza el calendario de pagos y cada cuánto vence una cuota, en segundos desde el Ripple Epoch.
- **PeriodicPayment** — importe de cada cuota regular.
- **PrincipalOutstanding / TotalValueOutstanding** — capital pendiente y deuda total pendiente (capital más intereses/comisiones acumulados).
- **InterestRate / LateInterestRate / CloseInterestRate / OverpaymentInterestRate** — tipos aplicados según el préstamo esté al día, en mora, en su liquidación final, o ante un pago anticipado mayor al debido.
- **LoanOriginationFee / LoanServiceFee / LatePaymentFee / ClosePaymentFee / OverpaymentFee** — comisiones fijas asociadas a cada evento del ciclo de vida del préstamo.
- **GracePeriod** — margen tras `NextPaymentDueDate` antes de que un impago dispare `lsfLoanDefault`.
- **PaymentRemaining** — cuotas que quedan por pagar en el calendario original.

## Flags

- **lsfLoanDefault** — el prestatario no pagó dentro del `GracePeriod`; el broker puede empezar a liquidar el `CoverAvailable`.
- **lsfLoanImpaired** — el broker considera el préstamo deteriorado (riesgo alto de impago) aunque técnicamente no haya vencido un pago.
- **lsfLoanOverpayment** — el último pago superó el `PeriodicPayment` esperado, aplicando `OverpaymentInterestRate`/`OverpaymentFee`.

## Cómo consultarlo

`account_objects` con `type: "loan"` lo devuelve para el `Owner` (el broker). Con `ledger_entry`, `loan` acepta `loan_broker_id` y `loan_seq`:

```json
{ "method": "ledger_entry", "params": [{ "loan": { "loan_broker_id": "5A7C9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C", "loan_seq": 1 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x004C || LoanBrokerID || LoanSequence)` (`keylet::loan`, namespace `'L'`). Respuesta típica:

```json
{
  "index": "3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F",
  "node": {
    "LedgerEntryType": "Loan",
    "Borrower": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "LoanBrokerID": "5A7C9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C",
    "PrincipalOutstanding": "100000000000",
    "PeriodicPayment": "5000000",
    "NextPaymentDueDate": 812086400,
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del prestatario.

## Relacionado

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
