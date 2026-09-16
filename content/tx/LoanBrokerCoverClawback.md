---
title: LoanBrokerCoverClawback
summary: Permite al emisor de un IOU o MPT recuperar (clawback) el cover excedente que un LoanBroker guarda en su pseudo-cuenta.
category: prestamos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/loanbrokercoverclawback
xls: XLS-0066
amendment: LendingProtocol
level: avanzado
---

## Qué hace

**Aviso:** el amendment [LendingProtocol](/amendments/LendingProtocol) **no está activo en la testnet** (ni [SingleAssetVault](/amendments/SingleAssetVault), del que depende). Hoy esta transacción falla con `temDISABLED`. Lo siguiente describe su comportamiento cuando se active.

`LoanBrokerCoverClawback` es la versión para brokers del [Clawback](/tx/Clawback) tradicional: el **emisor** del activo del Vault retira tokens de la pseudo-cuenta de un [LoanBroker](/objects/LoanBroker), reduciendo `CoverAvailable`. Solo funciona con IOU o MPT (XRP no tiene emisor) y solo si el emisor tiene habilitado el clawback (`lsfAllowTrustLineClawback` sin `lsfNoFreeze` para IOU; `lsfMPTCanClawback` en la emisión para MPT).

La cantidad recuperable está acotada: **nunca por debajo del cover mínimo** que exige la deuda viva (`CoverRateMinimum × DebtTotal`). Un `Amount` de cero (o ausente) significa "todo el excedente".

## Cuándo usarlo

- Eres emisor de un stablecoin regulado y necesitas retirar fondos de un broker por orden legal o por incumplimiento de tus términos.
- Quieres recuperar tokens de un broker abandonado sin obligar al broker a hacer un [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw).

## Cómo funciona por dentro

**preflight** (`LoanBrokerCoverClawback::preflight`):
- Debe haber `LoanBrokerID` o `Amount` (al menos uno); `LoanBrokerID` ≠ 0.
- `Amount` no puede ser XRP (`temBAD_AMOUNT`) ni negativo; cero está permitido ("todo").
- Si **no** hay `LoanBrokerID`, `Amount` tiene que ser un IOU cuyo `issuer` sea la pseudo-cuenta del broker (no puede ser tu cuenta ni cero, y no puede ser MPT, `temINVALID`). El transactor deduce el broker de ahí.

**preclaim** (`LoanBrokerCoverClawback::preclaim`):
- `determineBrokerID`: usa `LoanBrokerID` o, si falta, lee la AccountRoot del `issuer` de `Amount`; si no existe, `tecNO_ENTRY`; si existe pero no tiene `LoanBrokerID` (no es pseudo-cuenta de broker), `tecOBJECT_NOT_FOUND`.
- El activo del Vault no puede ser XRP y **tú debes ser su emisor** (`tecNO_PERMISSION`).
- `determineAsset`: acepta `Amount` con `issuer` = tú o = pseudo-cuenta del broker; cualquier otra cosa, o una moneda distinta a la del Vault, es `tecWRONG_ASSET`.
- `determineClawAmount`: `max = CoverAvailable − minimumBrokerCover(DebtTotal, CoverRateMinimum)` (mínimo redondeado hacia arriba). Si `max ≤ 0`, `tecINSUFFICIENT_FUNDS`. El importe efectivo es `min(Amount, max)`, o `max` si `Amount` es 0.
- `canApplyToBrokerCover` (con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)): `tecPRECISION_LOSS` si el importe redondea a cero.
- Comprueba las flags del emisor: IOU necesita `lsfAllowTrustLineClawback` y no `lsfNoFreeze`; MPT necesita `lsfMPTCanClawback` en la MPTokenIssuance (`tecNO_PERMISSION` / `tecOBJECT_NOT_FOUND`).

**doApply** (`LoanBrokerCoverClawback::doApply`): recalcula el importe, resta a `CoverAvailable` y hace `accountSend` de la pseudo-cuenta del broker al emisor sin transfer fee.

## Campos clave

- **LoanBrokerID** — opcional. Si lo das, `Amount` puede llevar `issuer` = tu cuenta (formato normal del token).
- **Amount** — opcional. Cantidad máxima a recuperar; 0 = todo el excedente. Si omites `LoanBrokerID`, su `issuer` debe ser la pseudo-cuenta del broker, siguiendo la convención del Clawback clásico (el "issuer" del Amount es el tenedor).

## Errores habituales

- **temDISABLED** — el amendment no está activo (situación actual en testnet).
- **temINVALID** — faltan ambos campos, o `Amount` sin `LoanBrokerID` es MPT o tiene `issuer` inválido.
- **temBAD_AMOUNT** — `Amount` es XRP o negativo.
- **tecNO_PERMISSION** — no eres el emisor del activo del Vault, el activo es XRP, o no tienes clawback habilitado.
- **tecINSUFFICIENT_FUNDS** — el cover ya está en el mínimo exigido; no hay excedente que recuperar.
- **tecWRONG_ASSET** — la moneda o el emisor de `Amount` no encajan con el activo del Vault.
- **tecOBJECT_NOT_FOUND** — la cuenta indicada como `issuer` no es pseudo-cuenta de un broker (o falta la MPTokenIssuance).

## Ejemplo

```json
{
  "TransactionType": "LoanBrokerCoverClawback",
  "Account": "rXXXX_TU_CUENTA",
  "LoanBrokerID": "0000000000000000000000000000000000000000000000000000000000000000",
  "Amount": "1000000"
}
```

Nota: el `Amount` en drops de este ejemplo del registro **no es válido**: el transactor rechaza XRP con `temBAD_AMOUNT`. Para probarlo de verdad necesitas un Vault de un IOU que tú emitas, por ejemplo `"Amount": { "currency": "USD", "issuer": "rXXXX_TU_CUENTA", "value": "10" }`, y `LoanBrokerID` con el índice del broker (creado por otra cuenta, rYYYY_OTRA_CUENTA) sobre ese Vault.

## Pruébalo en testnet

1. Hoy recibirás `temDISABLED`: `LendingProtocol` y `SingleAssetVault` no están activos en la testnet.
2. Cuando se active: con tu cuenta como emisor, activa `asfAllowTrustLineClawback` mediante [AccountSet](/tx/AccountSet) **antes** de emitir nada.
3. Desde rYYYY_OTRA_CUENTA, crea un Vault de tu token USD, un broker con `CoverRateMinimum` (p. ej. 1000) y deposita 10 USD de cover.
4. Envía `LoanBrokerCoverClawback` desde tu cuenta con `Amount: 0` en USD. Verás en `account_objects` del broker que `CoverAvailable` cae al mínimo exigido (0 si no hay deuda) y tu balance de emisor se reduce en esa cantidad.
5. Repite: obtendrás `tecINSUFFICIENT_FUNDS` porque ya no hay excedente.

## Relacionado

- [Clawback](/tx/Clawback), [LoanBrokerCoverDeposit](/tx/LoanBrokerCoverDeposit), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw), [VaultClawback](/tx/VaultClawback)
- [LoanBroker](/objects/LoanBroker), [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance)
- [LendingProtocol](/amendments/LendingProtocol), [Clawback](/amendments/Clawback), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
