---
title: LoanBrokerSet
summary: Crea o modifica un LoanBroker, el intermediario que concede préstamos con el capital de un Vault y aporta capital de primera pérdida.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokerset
xls: XLS-0066
amendment: LendingProtocol
level: avanzado
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (y tampoco [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy cualquier `LoanBrokerSet` falla en `preflight` con `temDISABLED`. Esta página describe lo que hará cuando se active.

`LoanBrokerSet` crea un objeto [LoanBroker](/objects/LoanBroker) asociado a un [Vault](/objects/Vault) que ya posees, o modifica uno existente. El broker es el "banco" del protocolo de préstamos: usa los activos depositados en el Vault por los inversores para financiar préstamos ([LoanSet](/tx/LoanSet)) y, a cambio, cobra una comisión de gestión (`ManagementFeeRate`) sobre los intereses.

Para proteger a los depositantes del Vault, el broker debe mantener **capital de primera pérdida** (*first-loss capital* o *cover*) en una pseudo-cuenta propia. Si un préstamo entra en impago, ese cover se liquida antes de que el Vault absorba pérdidas. `CoverRateMinimum` fija cuánto cover debe haber en proporción a la deuda viva y `CoverRateLiquidation` qué fracción de ese mínimo se liquida en un default.

Al crear el broker, `doApply` crea también una **pseudo-cuenta** (AccountRoot con `LoanBrokerID`) que custodia el cover y actúa como propietaria de los objetos [Loan](/objects/Loan). El broker se enlaza al directorio del propietario y al de la pseudo-cuenta del Vault.

## Cuándo usarlo

- Eres el propietario de un Vault y quieres ofrecer préstamos a terceros usando su liquidez.
- Quieres ajustar el límite de deuda (`DebtMaximum`) o los metadatos (`Data`) de un broker que ya existe.
- Como paso previo a [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) y [LoanSet](/tx/LoanSet).

## Cómo funciona por dentro

**preflight** (`LoanBrokerSet::preflight`, validación estática):
- `checkExtraFeatures` exige `SingleAssetVault` y `MPTokensV1` activos (y `PermissionedDomains` si hay `DomainID`); si no, `temDISABLED`.
- `Data` de hasta 256 bytes; `ManagementFeeRate` ≤ 10 000 (unidades de 1/10 de punto básico, es decir, ≤ 10 %); `CoverRateMinimum` y `CoverRateLiquidation` ≤ 100 000 (100 %); `DebtMaximum` ≥ 0 y dentro del rango de un MPT.
- Si llevas `LoanBrokerID` (modificación), **no** puedes incluir `ManagementFeeRate`, `CoverRateMinimum` ni `CoverRateLiquidation`: son fijos para toda la vida del broker.
- `CoverRateMinimum` y `CoverRateLiquidation` deben ser ambos cero o ambos distintos de cero. `VaultID` y `LoanBrokerID` no pueden ser cero.

**preclaim** (`LoanBrokerSet::preclaim`, contra el ledger):
- El Vault debe existir (`tecNO_ENTRY`) y tú debes ser su `Owner` (`tecNO_PERMISSION`).
- Si modificas: el broker debe existir, pertenecerte y apuntar al mismo `VaultID`. No puedes bajar `DebtMaximum` por debajo del `DebtTotal` actual (`tecLIMIT_EXCEEDED`), salvo poniéndolo a 0 (sin límite).
- Si creas: con [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) activo el Vault tiene que ser *closed-ended*; además el activo debe poder tener holdings nuevos (`canAddHolding`) y la pseudo-cuenta del Vault no puede estar congelada.
- `DebtMaximum` tiene que ser representable en el activo del Vault (`tecPRECISION_LOSS`).

**doApply**:
- Modificación: solo se escriben `Data` y `DebtMaximum`.
- Creación: aumenta el `OwnerCount` del propietario en **2** (objeto + pseudo-cuenta) y comprueba la reserva (`tecINSUFFICIENT_RESERVE`); crea la pseudo-cuenta con un holding vacío del activo del Vault; inicializa `LoanSequence = 1`, `Sequence`, `VaultID`, `Owner`, `Account` (la pseudo-cuenta) y los campos opcionales del tx.

## Campos clave

- **VaultID** — ID del Vault cuyo activo se prestará. Obligatorio incluso al modificar (debe coincidir con el guardado).
- **LoanBrokerID** — si está presente, modificas ese broker; si no, creas uno nuevo.
- **ManagementFeeRate** — porcentaje de los intereses que se queda el broker, en 1/10 de punto básico (100 = 1 %). Máximo 10 000. Inmutable.
- **CoverRateMinimum** — cover mínimo exigido como fracción de `DebtTotal`, en 1/10 pb (10 000 = 10 %). Inmutable. Si es 0, no se exige cover.
- **CoverRateLiquidation** — fracción del cover mínimo que se liquida en un default, en 1/10 pb. Inmutable.
- **DebtMaximum** — tope de `DebtTotal` del broker; 0 significa sin límite.
- **Data** — hasta 256 bytes arbitrarios (hex).

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temINVALID** — rate fuera de rango, `Data` demasiado largo, intentas cambiar un campo fijo al modificar, o solo uno de los dos `CoverRate*` es cero.
- **tecNO_ENTRY** — el Vault (o el broker a modificar) no existe.
- **tecNO_PERMISSION** — no eres el owner del Vault o del broker, el `VaultID` no coincide, o el Vault no es closed-ended (V1_1).
- **tecLIMIT_EXCEEDED** — `DebtMaximum` menor que la deuda viva.
- **tecINSUFFICIENT_RESERVE** — la creación consume dos unidades de owner reserve.
- **tecPRECISION_LOSS** — `DebtMaximum` no representable en el activo.

## Ejemplo

```json
{
  "TransactionType": "LoanBrokerSet",
  "Account": "rXXXX_TU_CUENTA",
  "VaultID": "0000000000000000000000000000000000000000000000000000000000000000",
  "ManagementFeeRate": 100,
  "CoverRateMinimum": 1000,
  "Data": "7B7D"
}
```

Sustituye `VaultID` por el ID del Vault que creaste con [VaultCreate](/tx/VaultCreate) (lo verás en `account_objects` con `type: "vault"`). Ojo: este ejemplo lleva `CoverRateMinimum` sin `CoverRateLiquidation`; `preflight` exige que ambos sean cero o ambos no cero, así que añade `"CoverRateLiquidation": 1000` (o quita el mínimo) para que sea válido.

## Pruébalo en testnet

1. Hoy, cualquier envío devuelve `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en testnet. Puedes enviarlo desde el builder para verlo.
2. Cuando se active: crea un Vault con [VaultCreate](/tx/VaultCreate) y anota su ID.
3. Envía `LoanBrokerSet` con ese `VaultID`, `ManagementFeeRate`, `CoverRateMinimum` y `CoverRateLiquidation`.
4. Consulta `account_objects` de tu cuenta: verás un objeto `LoanBroker` con `Account` (la pseudo-cuenta), `LoanSequence: 1`, `DebtTotal: 0` y `CoverAvailable: 0`. Tu `OwnerCount` habrá subido en 2.
5. Deposita cover con [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit) antes de conceder préstamos.

## Relacionado

- [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback)
- [LoanSet](/tx/LoanSet), [VaultCreate](/tx/VaultCreate)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1), [SingleAssetVault](/amendments/SingleAssetVault)
