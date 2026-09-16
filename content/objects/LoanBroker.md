---
title: LoanBroker
summary: Un gestor de préstamos que pide capital prestado de un Vault y lo coloca en préstamos individuales a prestatarios.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/loanbroker
createdBy: LoanBrokerSet
modifiedBy: LoanBrokerSet, LoanBrokerCoverDeposit, LoanBrokerCoverWithdraw, LoanBrokerCoverClawback, LoanSet, LoanDelete
reserve: 2
---

## Qué representa

Un `LoanBroker` es el intermediario entre un [Vault](/objects/Vault) (que agrupa el capital de los depositantes) y los prestatarios individuales. El broker toma prestado del vault hasta `DebtMaximum`, y por cada préstamo que concede aparece un [Loan](/objects/Loan) enlazado a él. El broker también mantiene su propio "cover": una reserva de capital propio (`CoverAvailable`) que absorbe primero las pérdidas por impago, antes de que estas lleguen a golpear a los depositantes del vault. `CoverRateMinimum` y `CoverRateLiquidation` marcan los umbrales de esa cobertura frente a `DebtTotal`.

Es la pieza central del sistema de préstamos: agrupa políticas comunes a todos sus préstamos (comisiones, tipos de interés) para no tener que repetirlas en cada `Loan`.

## Ciclo de vida

- **Creación**: [LoanBrokerSet](/tx/LoanBrokerSet) sin `LoanBrokerID` previo. Se ancla a un `VaultID` existente y fija las comisiones (`ManagementFeeRate`) y umbrales de cobertura.
- **Actualización**: el mismo [LoanBrokerSet](/tx/LoanBrokerSet), pasando el `LoanBrokerID`, para ajustar parámetros que no afecten a préstamos ya abiertos.
- **Cobertura**: [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) añade capital propio a `CoverAvailable`; [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw) lo retira si sobra por encima del mínimo; [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback) lo consume para cubrir un impago.
- **Préstamos**: cada [LoanSet](/tx/LoanSet) que use este broker incrementa `DebtTotal` y `OwnerCount`; cada [LoanDelete](/tx/LoanDelete) los reduce.
- **Borrado**: [LoanBrokerDelete](/tx/LoanBrokerDelete), solo si no le queda ningún `Loan` abierto ni deuda con el vault.

## Campos clave

- **VaultID / VaultNode** — el vault del que el broker toma prestado el capital, y su enlace de directorio.
- **Owner / Account** — el dueño del broker, quien paga la reserva y recibe la comisión de gestión.
- **LoanSequence** — contador interno para numerar los `Loan` que cuelgan de este broker (junto con `LoanBrokerID` forma la clave de cada préstamo).
- **DebtTotal / DebtMaximum** — deuda actual del broker con el vault y el tope que puede alcanzar.
- **CoverAvailable / CoverRateMinimum / CoverRateLiquidation** — capital propio de respaldo y los umbrales que disparan avisos o liquidación si `CoverAvailable` cae demasiado respecto a `DebtTotal`.
- **ManagementFeeRate** — comisión que cobra el broker sobre los pagos de los préstamos, antes de que el resto vaya al vault.
- **Data** — bytes libres para metadatos del broker (nombre, URI, etc., según convención de la aplicación).

## Flags

No tiene flags `lsf*` propios.

## Cómo consultarlo

`account_objects` con `type: "loan_broker"` lo devuelve para su `Owner`. Con `ledger_entry`, `loan_broker` acepta `owner` y `seq` (la `Sequence` de la `LoanBrokerSet` que lo creó):

```json
{ "method": "ledger_entry", "params": [{ "loan_broker": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790200 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x006C || AccountID_owner || Sequence)` (`keylet::loanBroker`, namespace `'l'`). Respuesta típica:

```json
{
  "index": "5A7C9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C",
  "node": {
    "LedgerEntryType": "LoanBroker",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "VaultID": "9E1B3D5F7A9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B",
    "DebtTotal": "0",
    "DebtMaximum": "500000000000",
    "CoverAvailable": "10000000000",
    "ManagementFeeRate": 500,
    "OwnerNode": "0",
    "VaultNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 2 unidades de reserva de propietario (0,4 XRP en testnet) al crearse.

## Relacionado

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [Vault](/objects/Vault), [Loan](/objects/Loan)
