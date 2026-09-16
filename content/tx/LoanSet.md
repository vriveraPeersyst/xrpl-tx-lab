---
title: LoanSet
summary: Crea un préstamo entre un LoanBroker y un prestatario, firmado por ambas partes, y transfiere el principal desde el Vault.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanset
xls: XLS-0066
amendment: LendingProtocol
level: avanzado
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanSet` crea un objeto [Loan](/objects/Loan): un préstamo amortizable con pagos periódicos fijos. Es una transacción **bilateral**: la firma el prestatario y el propietario del [LoanBroker](/objects/LoanBroker) (o al revés). Uno de los dos envía la transacción como `Account` y el otro aporta `CounterpartySignature`, una firma sobre la misma transacción. Así ambas partes aceptan explícitamente los términos.

En `doApply` el principal sale de la pseudo-cuenta del [Vault](/objects/Vault) hacia el prestatario (menos la comisión de apertura, que va al broker), se reduce `AssetsAvailable` del Vault, sube `DebtTotal` del broker y se crea el Loan con su calendario: `PeriodicPayment`, `NextPaymentDueDate = StartDate + PaymentInterval`, `PaymentRemaining = PaymentTotal`. El préstamo queda en el directorio del prestatario (que paga la reserva) y en el de la pseudo-cuenta del broker.

## Cuándo usarlo

- Un broker quiere prestar activos del Vault a un cliente con un calendario de amortización acordado fuera de la cadena.
- El prestatario quiere formalizar on-chain ese acuerdo con términos verificables (tipo, fees, plazos).

## Cómo funciona por dentro

**preflight** (`LoanSet::preflight`):
- No se admite patrocinio de reserva (`temINVALID_FLAG`). Fuera de un Batch, `CounterpartySignature` es obligatoria (`temBAD_SIGNER`); dentro de un Batch con [BatchV1_1](/amendments/BatchV1_1) hay que indicar `Counterparty`.
- `Data` ≤ 256 bytes. `PrincipalRequested` > 0. `LoanOriginationFee` ≤ principal. Todos los rates (`InterestRate`, `LateInterestRate`, `CloseInterestRate`, `OverpaymentInterestRate`, `OverpaymentFee`) ≤ 100 000 (1/10 pb, es decir 100 %). `PaymentTotal` > 0 si se indica. `PaymentInterval` ≥ 60 s. `GracePeriod` entre 60 y `PaymentInterval`.

**checkSign** (`LoanSet::checkSign`): además de la firma normal, verifica `CounterpartySignature` con la cuenta `Counterparty` o, si falta, con el `Owner` del broker. Soporta multifirma. `calculateBaseFee` añade un fee base por cada firmante de la contraparte.

**preclaim** (`LoanSet::preclaim`):
- El calendario completo (`StartDate + PaymentInterval × PaymentTotal + GracePeriod`) tiene que caber en un `uint32` de Ripple Epoch; si no, `tecKILLED`.
- El broker debe existir (`tecNO_ENTRY`) y **una de las dos partes** ser su owner (`tecNO_PERMISSION`). El prestatario es la otra.
- Con [LendingProtocolV1_1](/amendments/LendingProtocolV1_1): el Vault no puede estar en fase de suscripción (`tecTOO_SOON`) ni de redención (`tecEXPIRED`), y el último pago debe caer al menos 60 s antes de `RedemptionDate`.
- Si el Vault (modelo *accrual*) ya está en `AssetsMaximum`, `tecLIMIT_EXCEEDED`.
- Valores representables en el activo (`tecPRECISION_LOSS`); `canAddHolding` para crear la trust line o MPToken del prestatario; la pseudo-cuenta del Vault y el prestatario no pueden estar congelados; la pseudo-cuenta del broker y el owner no deep frozen.

**doApply** (`LoanSet::doApply`):
- `AssetsAvailable ≥ PrincipalRequested` (`tecINSUFFICIENT_FUNDS`).
- `computeLoanProperties` calcula la cuota periódica con la fórmula de amortización (tasa periódica = `InterestRate × PaymentInterval / segundos_año`), el `LoanScale`, el interés total y la parte del broker (`ManagementFeeRate`).
- El nuevo `DebtTotal` no puede superar `DebtMaximum` (`tecLIMIT_EXCEEDED`) y `CoverAvailable ≥ minimumBrokerCover(DebtTotal nuevo)` (`tecINSUFFICIENT_FUNDS`).
- Sube en 1 el `OwnerCount` del prestatario y comprueba su reserva.
- `accountSendMulti` desde la pseudo-cuenta del Vault: `principal − LoanOriginationFee` al prestatario y la fee al owner del broker.
- Crea el Loan con `keylet::loan(LoanBrokerID, LoanSequence)`, incrementa `LoanSequence` del broker y actualiza Vault (`AssetsAvailable −= principal`, `AssetsTotal += interés` en modo accrual) y broker (`DebtTotal`).

## Campos clave

- **LoanBrokerID** — broker que financia el préstamo.
- **Counterparty / CounterpartySignature** — la otra parte y su firma (`Account`, `SigningPubKey`, `TxnSignature` o `Signers`). Si `Counterparty` falta se asume el owner del broker.
- **PrincipalRequested** — principal en unidades del activo del Vault (número, no objeto Amount).
- **InterestRate** — tipo anual en 1/10 pb (500 = 0,5 %).
- **PaymentInterval / PaymentTotal** — segundos entre cuotas (por defecto 60) y número de cuotas (por defecto 1).
- **GracePeriod** — segundos tras la fecha de vencimiento antes de poder declarar default (por defecto 60, ≤ intervalo).
- **LoanOriginationFee** — se descuenta del principal entregado y va al owner del broker.
- **LoanServiceFee / LatePaymentFee / ClosePaymentFee** — fees fijas por cuota, por pago tardío y por cancelación anticipada.
- **LateInterestRate / CloseInterestRate / OverpaymentInterestRate / OverpaymentFee** — penalizaciones usadas por [LoanPay](/tx/LoanPay).

## Flags

- **tfLoanOverpayment** (0x00010000) — fija `lsfLoanOverpayment` en el Loan: permite que [LoanPay](/tx/LoanPay) acepte pagos superiores a la cuota.

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temBAD_SIGNER** — falta `CounterpartySignature` o no corresponde a la contraparte.
- **temINVALID** — algún rate, fee o plazo fuera de rango.
- **tecNO_PERMISSION** — ninguna de las partes es el owner del broker.
- **tecINSUFFICIENT_FUNDS** — el Vault no tiene liquidez o el broker no tiene cover suficiente.
- **tecLIMIT_EXCEEDED** — superarías `DebtMaximum` o `AssetsMaximum`.
- **tecINSUFFICIENT_RESERVE** — el prestatario no cubre la reserva del nuevo objeto.

## Ejemplo

```json
{
  "TransactionType": "LoanSet",
  "Account": "rXXXX_TU_CUENTA",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "PrincipalRequested": "10000000",
  "InterestRate": 500,
  "PaymentInterval": 604800,
  "PaymentTotal": 4,
  "CounterpartySignature": {
    "CounterpartySignature": {
      "Account": "rYYYY_OTRA_CUENTA",
      "SigningPubKey": "",
      "TxnSignature": ""
    }
  }
}
```

Aquí tú eres el prestatario y rYYYY_OTRA_CUENTA el owner del broker: 10 XRP a 4 cuotas semanales al 0,5 % anual. `SigningPubKey` y `TxnSignature` deben rellenarse con la firma real de la contraparte sobre esta misma transacción; el builder no puede generarla por ti. Nota: el objeto anidado repite el nombre `CounterpartySignature` porque así está definido en el formato binario.

## Pruébalo en testnet

1. Hoy el builder devolverá `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: rYYYY_OTRA_CUENTA crea Vault y broker, deposita cover y un tercero deposita activos en el Vault ([VaultDeposit](/tx/VaultDeposit)).
3. Prepara la transacción sin firmar, haz que la contraparte la firme y pega su firma en `CounterpartySignature`; luego firma tú con Xaman.
4. Tras validar, `account_objects` de tu cuenta con `type: "loan"` mostrará el Loan con `PeriodicPayment`, `NextPaymentDueDate` y `PaymentRemaining: 4`; tu saldo de XRP habrá subido 10 XRP y `AssetsAvailable` del Vault habrá bajado en la misma cantidad.

## Relacionado

- [LoanPay](/tx/LoanPay), [LoanManage](/tx/LoanManage), [LoanDelete](/tx/LoanDelete), [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [VaultDeposit](/tx/VaultDeposit)
- [Loan](/objects/Loan), [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [Batch](/amendments/Batch)
