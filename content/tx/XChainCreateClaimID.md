---
title: XChainCreateClaimID
summary: Reserva en la cadena de destino un identificador de reclamación (claim ID) antes de enviar fondos por el puente desde la otra cadena.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincreateclaimid
xls: XLS-0038
amendment: XChainBridge
level: intermedio
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

Una transferencia por puente empieza siempre **en la cadena de destino**: antes de bloquear fondos en la cadena origen, tienes que obtener un **claim ID** en la cadena a la que quieres traerlos. `XChainCreateClaimID` crea el objeto [XChainOwnedClaimID](/objects/XChainOwnedClaimID), con un número secuencial que el puente asigna incrementando su contador `XChainClaimID`. Ese número es de un solo uso: cuando la reclamación se completa el objeto se borra y el número no vuelve a existir nunca.

El objeto guarda quién lo posee (tú), qué cuenta enviará los fondos en la otra cadena (`OtherChainSource`), la `SignatureReward` que pagarás a los witnesses y un array vacío `XChainClaimAttestations` donde se irán acumulando las atestaciones. Es lo que impide que una atestación se use más de una vez.

El flujo completo es: `XChainCreateClaimID` (destino) → [XChainCommit](/tx/XChainCommit) con ese ID (origen) → los witnesses envían [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) (destino) → los fondos llegan automáticamente o los reclamas con [XChainClaim](/tx/XChainClaim).

## Cuándo usarlo

- Es el primer paso de cualquier transferencia de un activo ya puenteado, desde cualquiera de las dos cadenas hacia la otra.
- Necesitas tener ya una cuenta en la cadena de destino. Si no la tienes (bootstrap de una sidechain), usa [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), que no requiere claim ID.

## Cómo funciona por dentro

`XChainCreateClaimID::preflight` (en `transactors/bridge/XChainBridge.cpp`) solo valida `SignatureReward`: debe ser XRP, no negativa y un importe legal (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`).

`XChainCreateClaimID::preclaim`:

- Busca el [Bridge](/objects/Bridge) por su especificación en cualquiera de los dos lados (`readBridge`); si no existe, `tecNO_ENTRY`.
- `SignatureReward` debe ser **exactamente igual** a la del Bridge, ni más ni menos (`tecXCHAIN_REWARD_MISMATCH`).
- La cuenta debe cubrir la reserva con un objeto más (`tecINSUFFICIENT_RESERVE`).

`XChainCreateClaimID::doApply`:

- Incrementa `XChainClaimID` en el Bridge y usa el nuevo valor como identificador (si desbordase a 0, `tecINTERNAL`).
- Crea el objeto `XChainOwnedClaimID` (`keylet::xChainClaimID(spec, id)`) con `Account`, `XChainBridge`, `XChainClaimID`, `OtherChainSource`, `SignatureReward` y `XChainClaimAttestations` vacío.
- Lo inserta en tu directorio de owner y sube tu `OwnerCount` en 1.

Nota: la recompensa **no se cobra aquí**. Se paga desde tu cuenta cuando la reclamación se completa (en `finalizeClaimHelper`, desde `rewardPoolSrc`, que es el owner del claim ID). Por eso conviene mantener saldo suficiente hasta entonces.

## Campos clave

- **XChainBridge** — la especificación del puente. Debe existir un Bridge con ella en esta cadena.
- **SignatureReward** — copia exacta de la recompensa que figura en el Bridge en este momento. Si la door la cambia con [XChainModifyBridge](/tx/XChainModifyBridge), los claim IDs ya creados conservan la antigua.
- **OtherChainSource** — la cuenta de la **otra** cadena que hará el `XChainCommit`. Las atestaciones cuyo `OtherChainSource` no coincida se rechazan con `tecXCHAIN_SENDING_ACCOUNT_MISMATCH`. Suele ser tu propia cuenta en la otra cadena, pero puede ser cualquiera.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **tecNO_ENTRY** — no hay ningún Bridge con esa especificación en esta cadena.
- **tecXCHAIN_REWARD_MISMATCH** — la `SignatureReward` no coincide con la del Bridge. Léela con `ledger_entry` antes de enviar.
- **tecINSUFFICIENT_RESERVE** — falta XRP para la reserva del nuevo objeto.
- **temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT** — la recompensa no es XRP o es negativa.

## Ejemplo

```json
{
  "TransactionType": "XChainCreateClaimID",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTRA_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "100",
  "OtherChainSource": "rYYYY_OTRA_CUENTA"
}
```

`rYYYY_OTRA_CUENTA` hace de door de la cadena locking (y, por simplicidad del ejemplo, también de origen en la otra cadena); `rZZZZ_EMISOR` es la door de la cadena emisora.

## Pruébalo en testnet

1. Carga el ejemplo en el builder. Pon en `XChainBridge` la especificación exacta de un puente y en `SignatureReward` el valor que tenga ese Bridge.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo.
3. Cuando el amendment se active y exista el puente: tras `tesSUCCESS`, `account_objects` con `type: "xchain_owned_claim_id"` mostrará el objeto con `XChainClaimID` igual al contador del Bridge (1 para el primero) y `XChainClaimAttestations: []`.
4. Usa ese `XChainClaimID` en el `XChainCommit` de la otra cadena. Cuando los witnesses atestigüen y se alcance el quórum, el objeto desaparecerá y tu `OwnerCount` bajará en 1.

## Relacionado

- [XChainCommit](/tx/XChainCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainClaim](/tx/XChainClaim)
- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
