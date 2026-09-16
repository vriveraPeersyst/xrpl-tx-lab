---
title: LoanSet
summary: Creates a loan between a LoanBroker and a borrower, signed by both parties, and transfers the principal from the Vault.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanset
xls: XLS-0066
amendment: LendingProtocol
level: advanced
---

## What it does

**Notice:** the [LendingProtocol](/amendments/LendingProtocol) amendment **is not active on testnet** (nor is [SingleAssetVault](/amendments/SingleAssetVault), which it depends on). Today this transaction fails with `temDISABLED`. What follows describes its behavior once it's active.

`LoanSet` creates a [Loan](/objects/Loan) object: an amortizing loan with fixed periodic payments. It's a **bilateral** transaction: it's signed by the borrower and by the [LoanBroker](/objects/LoanBroker)'s owner (or vice versa). One of the two sends the transaction as `Account`, and the other contributes `CounterpartySignature`, a signature over that same transaction. This way both parties explicitly accept the terms.

In `doApply`, the principal leaves the [Vault](/objects/Vault)'s pseudo-account for the borrower (minus the origination fee, which goes to the broker), the Vault's `AssetsAvailable` decreases, the broker's `DebtTotal` rises, and the Loan is created with its schedule: `PeriodicPayment`, `NextPaymentDueDate = StartDate + PaymentInterval`, `PaymentRemaining = PaymentTotal`. The loan ends up in the borrower's directory (who pays the reserve) and in the broker's pseudo-account directory.

## When to use it

- A broker wants to lend Vault assets to a client under an amortization schedule agreed off-chain.
- The borrower wants to formalize that agreement on-chain with verifiable terms (rate, fees, terms).

## How it works inside

**preflight** (`LoanSet::preflight`):
- Reserve sponsorship isn't supported (`temINVALID_FLAG`). Outside a Batch, `CounterpartySignature` is mandatory (`temBAD_SIGNER`); inside a Batch with [BatchV1_1](/amendments/BatchV1_1), `Counterparty` must be specified.
- `Data` ≤ 256 bytes. `PrincipalRequested` > 0. `LoanOriginationFee` ≤ principal. All rates (`InterestRate`, `LateInterestRate`, `CloseInterestRate`, `OverpaymentInterestRate`, `OverpaymentFee`) ≤ 100,000 (1/10 bp, i.e. 100%). `PaymentTotal` > 0 if specified. `PaymentInterval` ≥ 60 s. `GracePeriod` between 60 and `PaymentInterval`.

**checkSign** (`LoanSet::checkSign`): besides the normal signature, it verifies `CounterpartySignature` against the `Counterparty` account or, if missing, against the broker's `Owner`. It supports multisigning. `calculateBaseFee` adds a base fee for each counterparty signer.

**preclaim** (`LoanSet::preclaim`):
- The full schedule (`StartDate + PaymentInterval × PaymentTotal + GracePeriod`) must fit in a `uint32` of Ripple Epoch; otherwise `tecKILLED`.
- The broker must exist (`tecNO_ENTRY`) and **one of the two parties** must be its owner (`tecNO_PERMISSION`). The borrower is the other party.
- With [LendingProtocolV1_1](/amendments/LendingProtocolV1_1): the Vault cannot be in the subscription phase (`tecTOO_SOON`) nor in the redemption phase (`tecEXPIRED`), and the last payment must fall at least 60 s before `RedemptionDate`.
- If the Vault (accrual model) is already at `AssetsMaximum`, `tecLIMIT_EXCEEDED`.
- Values must be representable in the asset (`tecPRECISION_LOSS`); `canAddHolding` to create the borrower's trust line or MPToken; the Vault's pseudo-account and the borrower cannot be frozen; the broker's pseudo-account and owner cannot be deep frozen.

**doApply** (`LoanSet::doApply`):
- `AssetsAvailable ≥ PrincipalRequested` (`tecINSUFFICIENT_FUNDS`).
- `computeLoanProperties` calculates the periodic installment using the amortization formula (periodic rate = `InterestRate × PaymentInterval / seconds_per_year`), the `LoanScale`, the total interest, and the broker's share (`ManagementFeeRate`).
- The new `DebtTotal` can't exceed `DebtMaximum` (`tecLIMIT_EXCEEDED`), and `CoverAvailable ≥ minimumBrokerCover(new DebtTotal)` (`tecINSUFFICIENT_FUNDS`).
- Raises the borrower's `OwnerCount` by 1 and checks their reserve.
- `accountSendMulti` from the Vault's pseudo-account: `principal − LoanOriginationFee` to the borrower and the fee to the broker's owner.
- Creates the Loan with `keylet::loan(LoanBrokerID, LoanSequence)`, increments the broker's `LoanSequence`, and updates the Vault (`AssetsAvailable −= principal`, `AssetsTotal += interest` in accrual mode) and the broker (`DebtTotal`).

## Key fields

- **LoanBrokerID** — broker funding the loan.
- **Counterparty / CounterpartySignature** — the other party and their signature (`Account`, `SigningPubKey`, `TxnSignature`, or `Signers`). If `Counterparty` is missing, the broker's owner is assumed.
- **PrincipalRequested** — principal in units of the Vault's asset (a number, not an Amount object).
- **InterestRate** — annual rate in 1/10 bp (500 = 0.5%).
- **PaymentInterval / PaymentTotal** — seconds between installments (default 60) and number of installments (default 1).
- **GracePeriod** — seconds after the due date before default can be declared (default 60, ≤ interval).
- **LoanOriginationFee** — deducted from the principal delivered and paid to the broker's owner.
- **LoanServiceFee / LatePaymentFee / ClosePaymentFee** — fixed fees per installment, per late payment, and per early cancellation.
- **LateInterestRate / CloseInterestRate / OverpaymentInterestRate / OverpaymentFee** — penalties used by [LoanPay](/tx/LoanPay).

## Flags

- **tfLoanOverpayment** (0x00010000) — sets `lsfLoanOverpayment` on the Loan: allows [LoanPay](/tx/LoanPay) to accept payments above the installment.

## Common errors

- **temDISABLED** — the amendment is not active (current situation on testnet).
- **temBAD_SIGNER** — `CounterpartySignature` is missing or doesn't correspond to the counterparty.
- **temINVALID** — some rate, fee, or term is out of range.
- **tecNO_PERMISSION** — neither party is the broker's owner.
- **tecINSUFFICIENT_FUNDS** — the Vault lacks liquidity, or the broker doesn't have enough cover.
- **tecLIMIT_EXCEEDED** — you'd exceed `DebtMaximum` or `AssetsMaximum`.
- **tecINSUFFICIENT_RESERVE** — the borrower doesn't cover the reserve for the new object.

## Example

```json
{
  "TransactionType": "LoanSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "PrincipalRequested": "10000000",
  "InterestRate": 500,
  "PaymentInterval": 604800,
  "PaymentTotal": 4,
  "CounterpartySignature": {
    "CounterpartySignature": {
      "Account": "rYYYY_OTHER_ACCOUNT",
      "SigningPubKey": "",
      "TxnSignature": ""
    }
  }
}
```

Here you're the borrower and rYYYY_OTHER_ACCOUNT is the broker's owner: 10 XRP over 4 weekly installments at 0.5% annual. `SigningPubKey` and `TxnSignature` must be filled with the counterparty's actual signature over this same transaction; the builder can't generate it for you. Note: the nested object repeats the name `CounterpartySignature` because that's how it's defined in the binary format.

## Try it on testnet

1. Today the builder will return `temDISABLED`: `LendingProtocol` and `SingleAssetVault` are not active on testnet.
2. Once active: rYYYY_OTHER_ACCOUNT creates a Vault and broker, deposits cover, and a third party deposits assets into the Vault ([VaultDeposit](/tx/VaultDeposit)).
3. Prepare the unsigned transaction, have the counterparty sign it, and paste their signature into `CounterpartySignature`; then sign it yourself with Xaman.
4. After validation, your account's `account_objects` with `type: "loan"` will show the Loan with `PeriodicPayment`, `NextPaymentDueDate`, and `PaymentRemaining: 4`; your XRP balance will have risen by 10 XRP, and the Vault's `AssetsAvailable` will have dropped by the same amount.

## Related

- [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete), [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [VaultDeposit](/tx/VaultDeposit)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [Batch](/amendments/Batch)
