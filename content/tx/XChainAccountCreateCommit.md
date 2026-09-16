---
title: XChainAccountCreateCommit
summary: Envía XRP por el puente para crear una cuenta nueva en la otra cadena, sin necesidad de claim ID previo.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaccountcreatecommit
xls: XLS-0038
amendment: XChainBridge
level: intermedio
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

El flujo normal del puente exige un claim ID en la cadena de destino, y para crearlo hace falta tener allí una cuenta con XRP. Eso es un problema de arranque en una sidechain nueva. `XChainAccountCreateCommit` lo resuelve: envías `Amount` (XRP) más `SignatureReward` a la door de esta cadena, indicando la cuenta `Destination` que quieres que exista en la otra. No necesitas claim ID; en su lugar el puente usa un contador secuencial, `XChainAccountCreateCount`, que se incrementa con cada envío y ordena las creaciones.

En la otra cadena, los witnesses envían [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation). Al alcanzar el quórum, la door de allí crea la cuenta `Destination` con `Amount` y paga la recompensa a los witnesses con los fondos que tú adelantaste. Aquí la recompensa **sí se cobra por adelantado**: la door recibe `Amount + SignatureReward`.

Solo funciona en puentes XRP-XRP y solo si la door ha configurado `MinAccountCreateAmount` en el [Bridge](/objects/Bridge).

## Cuándo usarlo

- Crear tu primera cuenta en una sidechain a partir de XRP de la mainchain (o al revés).
- Financiar cuentas de terceros en la otra cadena sin que ellos tengan que hacer nada.

## Cómo funciona por dentro

En el código la clase se llama `XChainCreateAccountCommit` (en `transactors/bridge/XChainBridge.cpp`).

`XChainCreateAccountCommit::preflight`: `Amount` debe ser XRP positivo; `SignatureReward` XRP no negativa; y ambos del mismo activo. Cualquier incumplimiento devuelve `temBAD_AMOUNT`.

`XChainCreateAccountCommit::preclaim`:

- Debe existir el Bridge (`tecNO_ENTRY`).
- `SignatureReward` debe ser exactamente la del Bridge (`tecXCHAIN_REWARD_MISMATCH`).
- El Bridge debe tener `MinAccountCreateAmount`; si no, `tecXCHAIN_CREATE_ACCOUNT_DISABLED`.
- `Amount` debe ser ≥ `MinAccountCreateAmount` (`tecXCHAIN_INSUFF_CREATE_AMOUNT`).
- La door no puede enviársela a sí misma (`tecXCHAIN_SELF_COMMIT`).
- El activo de `Amount` debe ser el de esta cadena (`tecXCHAIN_BAD_TRANSFER_ISSUE`) y el de la otra cadena debe ser XRP (`tecXCHAIN_CREATE_ACCOUNT_NONXRP_ISSUE`): no se pueden crear cuentas con IOU.

`XChainCreateAccountCommit::doApply`:

- Transfiere `Amount + SignatureReward` a la door con `transferHelper` (`CanCreateDstPolicy::Yes`, `DepositAuthPolicy::Normal`). Exige `saldo ≥ importe + reserva` (`tecUNFUNDED_PAYMENT`), permitiendo que el fee salga de la reserva pero no el importe.
- Incrementa `XChainAccountCreateCount` en el Bridge. Ese número es el que los witnesses citarán como `XChainAccountCreateCount` en sus atestaciones.

En la otra cadena, `applyCreateAccountAttestations` procesa las creaciones **en orden estricto**: solo se ejecuta la que tiene `createCount == XChainAccountClaimCount + 1`. Las siguientes (hasta 128 por delante, `kXbridgeMaxAccountCreateClaims`) se acumulan en objetos [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID) propiedad de la door hasta que les toque. Si la creación falla (por ejemplo, `Amount` por debajo de la reserva base de la otra cadena → `tecNO_DST_INSUF_XRP`), el claim se descarta igualmente (`OnTransferFail::RemoveClaim`) para no bloquear a las siguientes; los fondos quedan en la door.

## Campos clave

- **Destination** — la cuenta a crear en la **otra** cadena. Si ya existe, simplemente recibe el XRP.
- **Amount** — XRP que recibirá la cuenta nueva. Debe ser ≥ `MinAccountCreateAmount` del Bridge; en la práctica también ≥ reserva base de la otra cadena, o la creación fallará allí y perderás los fondos (quedan en la door).
- **SignatureReward** — copia exacta de la recompensa del Bridge. Se cobra ahora, junto con `Amount`.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **tecXCHAIN_CREATE_ACCOUNT_DISABLED** — el Bridge no tiene `MinAccountCreateAmount`.
- **tecXCHAIN_INSUFF_CREATE_AMOUNT** — `Amount` menor que el mínimo del Bridge.
- **tecXCHAIN_REWARD_MISMATCH** — `SignatureReward` distinta a la del Bridge.
- **tecXCHAIN_CREATE_ACCOUNT_NONXRP_ISSUE** — el puente no es XRP-XRP.
- **tecUNFUNDED_PAYMENT** — no tienes `Amount + SignatureReward + reserva`.
- **temBAD_AMOUNT** — `Amount` o `SignatureReward` no son XRP, o `Amount` es 0.

## Ejemplo

```json
{
  "TransactionType": "XChainAccountCreateCommit",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTRA_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "Destination": "rYYYY_OTRA_CUENTA",
  "Amount": "20000000",
  "SignatureReward": "100"
}
```

`rYYYY_OTRA_CUENTA` es la door de la cadena locking (y, en este ejemplo simplificado, también la dirección a crear en la otra cadena); `rZZZZ_EMISOR` es la door de la cadena emisora. Envías 20 XRP más 100 drops de recompensa.

## Pruébalo en testnet

1. Carga el ejemplo en el builder. `SignatureReward` debe coincidir con la del Bridge y `Amount` superar su `MinAccountCreateAmount`.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo.
3. Cuando el amendment se active y exista el puente: tras `tesSUCCESS`, `account_info` de la door mostrará `Balance` aumentado en `Amount + SignatureReward`, y `ledger_entry` del Bridge mostrará `XChainAccountCreateCount` incrementado en 1.
4. En la otra cadena, la door acumulará un `XChainOwnedCreateAccountClaimID` con las atestaciones hasta el quórum; entonces `account_info` de `Destination` responderá con la cuenta recién creada y `XChainAccountClaimCount` del Bridge de allí igualará tu número de creación.

## Relacionado

- [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation), [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge)
- [XChainCommit](/tx/XChainCommit), [XChainCreateClaimID](/tx/XChainCreateClaimID)
- [Bridge](/objects/Bridge), [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID)
- [XChainBridge](/amendments/XChainBridge)
