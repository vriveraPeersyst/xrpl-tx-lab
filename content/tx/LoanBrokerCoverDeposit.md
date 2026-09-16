---
title: LoanBrokerCoverDeposit
summary: Deposita capital de primera pérdida (cover) en la pseudo-cuenta de un LoanBroker para respaldar sus préstamos.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverdeposit
xls: XLS-0066
amendment: LendingProtocol
level: intermedio
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanBrokerCoverDeposit` mueve activos desde la cuenta del propietario de un [LoanBroker](/objects/LoanBroker) a la pseudo-cuenta del broker y aumenta el campo `CoverAvailable` en esa misma cantidad. Ese saldo es el **capital de primera pérdida** (*first-loss capital*): en un default ([LoanManage](/tx/LoanManage) con `tfLoanDefault`) se liquida antes de que los depositantes del [Vault](/objects/Vault) pierdan nada.

El activo depositado tiene que ser exactamente el activo del Vault al que pertenece el broker (XRP, un IOU o un MPT). Solo el propietario del broker puede depositar.

## Cuándo usarlo

- Antes de conceder préstamos: [LoanSet](/tx/LoanSet) falla con `tecINSUFFICIENT_FUNDS` si `CoverAvailable` no alcanza `CoverRateMinimum × DebtTotal` tras añadir el nuevo préstamo.
- Para reponer cover después de que un default lo haya consumido.
- Para elevar la capacidad de deuda del broker sin tocar `DebtMaximum`.

## Cómo funciona por dentro

**preflight** (`LoanBrokerCoverDeposit::preflight`): `LoanBrokerID` distinto de cero (`temINVALID`); `Amount` estrictamente positivo y con formato legal (`temBAD_AMOUNT`).

**preclaim** (`LoanBrokerCoverDeposit::preclaim`):
- El broker debe existir (`tecNO_ENTRY`) y ser tuyo (`tecNO_PERMISSION`).
- `Amount.asset()` debe coincidir con `Vault.Asset` (`tecWRONG_ASSET`).
- `canTransfer`: el activo debe ser transferible entre tú y la pseudo-cuenta (para MPT, `lsfMPTCanTransfer`).
- Congelaciones: con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) se usa `checkDepositFreeze`; antes, tu cuenta no puede estar congelada y la pseudo-cuenta no puede estar deep frozen.
- `requireAuth` con `StrongAuth`: si el emisor exige autorización, tú debes estar autorizado.
- Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), el importe se redondea **hacia abajo** a la escala de `CoverAvailable`; si queda en cero, `tecPRECISION_LOSS`. Esto evita depósitos "de polvo" que no mueven nada.
- Tu saldo disponible del activo (con congelación y autorización en cuenta) debe cubrir el importe redondeado (`tecINSUFFICIENT_FUNDS`).

**doApply** (`LoanBrokerCoverDeposit::doApply`): vuelve a calcular el importe redondeado, hace `accountSend` de tu cuenta a la pseudo-cuenta del broker sin cobrar transfer fee, y suma ese mismo valor a `CoverAvailable`.

## Campos clave

- **LoanBrokerID** — ID del broker (índice del objeto LoanBroker).
- **Amount** — cantidad a depositar en el activo del Vault. En drops si es XRP; objeto `{currency, issuer, value}` para IOU; `{mpt_issuance_id, value}` para MPT. Con `fixCleanup3_2_0` los decimales que excedan la escala del cover se descartan (redondeo hacia abajo).

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temBAD_AMOUNT** — `Amount` cero o negativo.
- **tecNO_ENTRY** — el `LoanBrokerID` no existe.
- **tecNO_PERMISSION** — no eres el `Owner` del broker.
- **tecWRONG_ASSET** — el activo de `Amount` no es el del Vault.
- **tecINSUFFICIENT_FUNDS** — no tienes saldo suficiente del activo.
- **tecPRECISION_LOSS** — el importe redondeado a la escala del cover es cero.
- **tecFROZEN / tecNO_AUTH** — la trust line está congelada o no estás autorizado por el emisor.

## Ejemplo

```json
{
  "TransactionType": "LoanBrokerCoverDeposit",
  "Account": "rXXXX_TU_CUENTA",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

`Amount` en drops (1 XRP) presupone un Vault de XRP. Sustituye `LoanBrokerID` por el `index` del objeto creado con [LoanBrokerSet](/tx/LoanBrokerSet).

## Pruébalo en testnet

1. Hoy recibirás `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: crea un Vault de XRP con [VaultCreate](/tx/VaultCreate) y un broker con [LoanBrokerSet](/tx/LoanBrokerSet).
3. Consulta `account_objects` con `type: "loan_broker"` y anota `index` y `Account` (la pseudo-cuenta).
4. Envía `LoanBrokerCoverDeposit` con 1 000 000 drops.
5. Vuelve a consultar el broker: `CoverAvailable` valdrá `1000000`. Un `account_info` de la pseudo-cuenta mostrará ese XRP; tu saldo habrá bajado en 1 XRP más el fee.

## Relacionado

- [LoanBrokerSet](/tx/LoanBrokerSet), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback), [LoanSet](/tx/LoanSet), [LoanManage](/tx/LoanManage)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_3_0](/amendments/fixCleanup3_3_0)
