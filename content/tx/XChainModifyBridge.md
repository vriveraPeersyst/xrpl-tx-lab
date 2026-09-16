---
title: XChainModifyBridge
summary: Cambia la recompensa a los witnesses o el mínimo de creación de cuentas de un puente existente; solo la cuenta door puede enviarla.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainmodifybridge
xls: XLS-0038
amendment: XChainBridge
level: avanzado
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

`XChainModifyBridge` modifica los dos únicos parámetros ajustables de un objeto [Bridge](/objects/Bridge) ya creado con [XChainCreateBridge](/tx/XChainCreateBridge): la `SignatureReward` que cobran los witnesses y el `MinAccountCreateAmount` que habilita (o, con el flag `tfClearAccountCreateAmount`, deshabilita) la creación de cuentas a través del puente. La especificación del puente (`XChainBridge`: doors y activos) no se puede cambiar; sirve solo para localizar el objeto.

La envía la cuenta door de esa cadena. Como la door está controlada por multifirma por los witnesses, en la práctica esta transacción requiere un quórum de ellos. Solo afecta al Bridge de la cadena donde se envía: si quieres el mismo cambio en las dos cadenas, hay que enviarla en ambas.

## Cuándo usarlo

- Ajustar la recompensa de los witnesses cuando cambian los costes o el precio del XRP.
- Activar la creación de cuentas por puente en un puente XRP-XRP que se creó sin `MinAccountCreateAmount`.
- Desactivar la creación de cuentas con `tfClearAccountCreateAmount` (por ejemplo, ante abusos o para congelar el bootstrap).

## Cómo funciona por dentro

En el código la clase se llama `BridgeModify` (en `transactors/bridge/XChainBridge.cpp`), aunque el tipo de transacción es `XChainModifyBridge`.

`BridgeModify::preflight`:

- Debe cambiar algo: si no viene ni `SignatureReward`, ni `MinAccountCreateAmount`, ni el flag `tfClearAccountCreateAmount`, devuelve `temMALFORMED`.
- No puedes fijar `MinAccountCreateAmount` y a la vez marcar `tfClearAccountCreateAmount` (`temMALFORMED`).
- La cuenta debe ser una de las dos doors del `XChainBridge` (`temXCHAIN_BRIDGE_NONDOOR_OWNER`).
- `SignatureReward`, si va, debe ser XRP no negativo (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`).
- `MinAccountCreateAmount`, si va, debe ser XRP positivo y los dos activos del puente deben ser XRP (`temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT`).
- Los flags se validan contra `tfXChainModifyBridgeMask`: el único válido es `tfClearAccountCreateAmount`.

`BridgeModify::preclaim`: busca el Bridge en el lado que corresponde a la door que firma (`keylet::bridge(spec, chainType)`); si no existe, `tecNO_ENTRY`.

`BridgeModify::doApply`: escribe `SignatureReward` y/o `MinAccountCreateAmount` en el objeto y, si el flag está puesto y el campo existe, lo elimina con `makeFieldAbsent`. No toca los contadores ni la reserva.

## Campos clave

- **XChainBridge** — la especificación completa del puente, usada solo para localizarlo. Debe coincidir exactamente con la del objeto.
- **SignatureReward** — nueva recompensa en drops. Afecta a los `XChainCreateClaimID` y `XChainAccountCreateCommit` futuros: deben indicar exactamente este valor. Los claim IDs ya creados conservan la recompensa con la que se crearon.
- **MinAccountCreateAmount** — nuevo mínimo en drops para `XChainAccountCreateCommit`. Presente = creación de cuentas habilitada.

## Flags

- **tfClearAccountCreateAmount** (0x00010000) — elimina `MinAccountCreateAmount` del Bridge, con lo que `XChainAccountCreateCommit` pasará a fallar con `tecXCHAIN_CREATE_ACCOUNT_DISABLED`. Incompatible con enviar `MinAccountCreateAmount` en la misma transacción.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **temMALFORMED** — no cambias nada, o combinas `MinAccountCreateAmount` con `tfClearAccountCreateAmount`.
- **temXCHAIN_BRIDGE_NONDOOR_OWNER** — la cuenta no es door del puente.
- **temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT** — mínimo no XRP, cero o puente de IOU.
- **tecNO_ENTRY** — no existe un Bridge con esa especificación en esta cadena (o lo estás enviando desde la door equivocada).
- **temINVALID_FLAG** — has puesto un flag distinto de `tfClearAccountCreateAmount`.

## Ejemplo

```json
{
  "TransactionType": "XChainModifyBridge",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rXXXX_TU_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "200"
}
```

Tu cuenta es la door de la cadena locking; `rZZZZ_EMISOR` es la door de la cadena emisora. Sube la recompensa de 100 a 200 drops.

## Pruébalo en testnet

1. Carga el ejemplo en el builder con la misma `XChainBridge` que usaste (o usarías) en `XChainCreateBridge`.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo.
3. Cuando el amendment se active y exista el Bridge: tras `tesSUCCESS`, `ledger_entry` con `bridge_account` y `bridge` (la especificación) devolverá el objeto con `SignatureReward: "200"`. Si usaste `tfClearAccountCreateAmount`, el campo `MinAccountCreateAmount` habrá desaparecido.
4. Comprueba después que un `XChainCreateClaimID` con la recompensa antigua falla con `tecXCHAIN_REWARD_MISMATCH`.

## Relacionado

- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
