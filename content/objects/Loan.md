---
title: Loan
summary: An individual loan between a borrower and a LoanBroker, with a payment schedule, interest, and fees.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/loan
createdBy: LoanSet
modifiedBy: LoanSet, LoanManage, LoanPay
reserve: 1
---

## What it represents

A `Loan` records a `Borrower`'s debt to a [LoanBroker](/objects/LoanBroker): how much is owed (`TotalValueOutstanding`, `PrincipalOutstanding`), when the next payment is due (`NextPaymentDueDate`), and what interest rates and fees apply in each situation (current, late, at final settlement, or for early overpayment). The broker sets these terms when creating it; the borrower can only pay or fail to pay.

The object keeps the full accounting of the loan: outstanding principal, accrued management fee (`ManagementFeeOutstanding`), and the delinquency status is reflected in its flags, not in a text field.

## Lifecycle

- **Creation**: [LoanSet](/tx/LoanSet) by the broker (or with their authorization), without a prior `LoanBrokerID`+`LoanSequence`. Sets `StartDate`, `PaymentInterval`, `PeriodicPayment`, and the interest rates and fees. Increases the `LoanBroker`'s `DebtTotal` and the borrower's `OwnerCount`.
- **Payment**: [LoanPay](/tx/LoanPay), normally by the borrower, covers the `PeriodicPayment` (or more, generating `lsfLoanOverpayment`). Updates `PreviousPaymentDueDate`/`NextPaymentDueDate` and reduces `PrincipalOutstanding`.
- **Management**: [LoanManage](/tx/LoanManage), reserved to the broker, marks default (`lsfLoanDefault`) or impairment (`lsfLoanImpaired`) when `GracePeriod` is exceeded without payment, which can trigger consumption of the broker's `CoverAvailable`.
- **Closure**: [LoanDelete](/tx/LoanDelete), only when the balance reaches zero (fully paid off or liquidated after default). Deletes the object and reduces the broker's `DebtTotal`.

## Key fields

- **Borrower** — who must pay; not necessarily the `Owner` who pays the object's reserve (that is the broker/owner).
- **LoanBrokerID / LoanBrokerNode** — the broker this loan belongs to, and its directory link.
- **StartDate / PaymentInterval** — when the payment schedule starts and how often an installment is due, in seconds since the Ripple Epoch.
- **PeriodicPayment** — amount of each regular installment.
- **PrincipalOutstanding / TotalValueOutstanding** — outstanding principal and total outstanding debt (principal plus accrued interest/fees).
- **InterestRate / LateInterestRate / CloseInterestRate / OverpaymentInterestRate** — rates applied depending on whether the loan is current, in default, at its final settlement, or facing an early payment larger than owed.
- **LoanOriginationFee / LoanServiceFee / LatePaymentFee / ClosePaymentFee / OverpaymentFee** — fixed fees associated with each event in the loan's lifecycle.
- **GracePeriod** — margin after `NextPaymentDueDate` before a missed payment triggers `lsfLoanDefault`.
- **PaymentRemaining** — installments remaining in the original schedule.

## Flags

- **lsfLoanDefault** — the borrower did not pay within the `GracePeriod`; the broker can begin liquidating the `CoverAvailable`.
- **lsfLoanImpaired** — the broker considers the loan impaired (high risk of default) even though a payment has not technically come due yet.
- **lsfLoanOverpayment** — the last payment exceeded the expected `PeriodicPayment`, applying `OverpaymentInterestRate`/`OverpaymentFee`.

## How to query it

`account_objects` with `type: "loan"` returns it for the `Owner` (the broker). With `ledger_entry`, `loan` accepts `loan_broker_id` and `loan_seq`:

```json
{ "method": "ledger_entry", "params": [{ "loan": { "loan_broker_id": "5A7C9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C", "loan_seq": 1 }, "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x004C || LoanBrokerID || LoanSequence)` (`keylet::loan`, namespace `'L'`). Typical response:

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

## Reserve

Consumes 1 unit of owner reserve (0.2 XRP on testnet) from the borrower.

## Related

- [LoanSet](/tx/LoanSet), [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
