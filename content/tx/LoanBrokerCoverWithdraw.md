---
title: LoanBrokerCoverWithdraw
summary: Retira capital de primera pérdida de un LoanBroker, siempre que quede el mínimo exigido por la deuda viva.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverwithdraw
xls: XLS-0066
amendment: LendingProtocol
level: intermedio
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanBrokerCoverWithdraw` saca activos de la pseudo-cuenta de un [LoanBroker](/objects/LoanBroker) y reduce `CoverAvailable`. Es la inversa de [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit). La regla central: después de retirar, el cover restante debe seguir siendo **al menos `CoverRateMinimum × DebtTotal`**; el protocolo nunca deja que el broker se descapitalice mientras tenga préstamos vivos.

Los fondos van al propietario del broker o, si indicas `Destination`, a un tercero. En ese segundo caso se aplican las mismas comprobaciones que en un pago normal (autorización fuerte, DepositAuth, credenciales).

## Cuándo usarlo

- Recuperar cover sobrante cuando la deuda viva ha bajado (préstamos pagados).
- Recoger las comisiones que [LoanPay](/tx/LoanPay) haya enviado a la pseudo-cuenta en lugar de a tu cuenta (ocurre cuando el cover estaba por debajo del mínimo o no podías recibir el activo).
- Vaciar el cover antes de un [LoanBrokerDelete](/tx/LoanBrokerDelete) (aunque este ya devuelve el resto automáticamente).

## Cómo funciona por dentro

**preflight** (`LoanBrokerCoverWithdraw::preflight`): `LoanBrokerID` ≠ 0 (`temINVALID`); `Amount` > 0 y legal (`temBAD_AMOUNT`); `Destination`, si aparece, ≠ cuenta cero (`temMALFORMED`); `CredentialIDs` bien formado. `checkExtraFeatures` exige además `Credentials` + [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) si incluyes `CredentialIDs`.

**preclaim** (`LoanBrokerCoverWithdraw::preclaim`):
- El destino no puede ser una pseudo-cuenta (`tecPSEUDO_ACCOUNT`).
- El broker debe existir y ser tuyo; `Amount` en el activo del Vault (`tecWRONG_ASSET`).
- `canApplyToBrokerCover` (con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)): si el importe redondea a cero a la escala del cover, `tecPRECISION_LOSS`.
- `canTransfer` desde la pseudo-cuenta al destino. Con `fixCleanup3_2_0` se **ignora** `lsfMPTCanTransfer`: un emisor de MPT no puede atrapar el cover del broker. Siguen aplicando NoRipple, congelación y autorización.
- Si `Destination` ≠ tu cuenta: `canWithdraw` (DepositAuth / preautorización / credenciales del destino) y `requireAuth` con `StrongAuth` (el destino debe tener ya trust line o MPToken). Si el destino eres tú, basta `WeakAuth`, y con `fixCleanup3_4_0` se crea el holding si falta.
- Congelación: con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) se usa `checkWithdrawFreeze`; antes, la pseudo-cuenta no puede estar congelada ni el destino deep frozen (salvo que el destino sea el emisor).
- Límites: `CoverAvailable ≥ Amount` y `CoverAvailable − Amount ≥ minimumBrokerCover(DebtTotal, CoverRateMinimum)`, redondeado hacia arriba; si no, `tecINSUFFICIENT_FUNDS`. Finalmente se verifica que la pseudo-cuenta tenga realmente el saldo.

**doApply** (`LoanBrokerCoverWithdraw::doApply`): resta `Amount` a `CoverAvailable` y llama a `doWithdraw`, que transfiere de la pseudo-cuenta al destino (creando el holding si procede) sin transfer fee.

## Campos clave

- **LoanBrokerID** — ID del broker.
- **Amount** — cantidad a retirar en el activo del Vault.
- **Destination** — cuenta receptora; por defecto, tu propia cuenta. No puede ser una pseudo-cuenta.
- **DestinationTag** — etiqueta para el destino, si la exige.
- **CredentialIDs** — credenciales para superar el DepositAuth del destino (requiere `Credentials` y `fixCleanup3_4_0`).

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **tecINSUFFICIENT_FUNDS** — pides más de lo disponible o dejarías el cover por debajo del mínimo exigido por la deuda viva.
- **tecNO_PERMISSION** — no eres el `Owner` del broker, o el destino tiene DepositAuth y no estás preautorizado.
- **tecWRONG_ASSET** — activo distinto al del Vault.
- **tecPSEUDO_ACCOUNT** — `Destination` es una pseudo-cuenta (Vault, AMM, broker…).
- **tecNO_AUTH / tecNO_LINE** — el destino tercero no tiene trust line o MPToken autorizado para el activo.
- **tecPRECISION_LOSS** — importe que redondea a cero.

## Ejemplo

```json
{
  "TransactionType": "LoanBrokerCoverWithdraw",
  "Account": "rXXXX_TU_CUENTA",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Sustituye `LoanBrokerID` por el `index` del broker que creaste con [LoanBrokerSet](/tx/LoanBrokerSet).

## Pruébalo en testnet

1. Hoy el builder devolverá `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: crea Vault y broker, y deposita 2 XRP de cover con [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit).
3. Envía `LoanBrokerCoverWithdraw` con `Amount: "1000000"`. En `account_objects` (`type: "loan_broker"`) verás `CoverAvailable` reducido a 1 000 000 y tu saldo XRP subirá 1 XRP menos el fee.
4. Concede un préstamo con [LoanSet](/tx/LoanSet) y prueba a retirar todo el cover: fallará con `tecINSUFFICIENT_FUNDS` porque `DebtTotal × CoverRateMinimum` bloquea parte del saldo.

## Relacionado

- [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverClawback](/tx/LoanBrokerCoverClawback), [LoanBrokerDelete](/tx/LoanBrokerDelete), [LoanPay](/tx/LoanPay)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault)
- [LendingProtocol](/amendments/LendingProtocol), [Credentials](/amendments/Credentials), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
