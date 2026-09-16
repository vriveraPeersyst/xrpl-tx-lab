---
title: XChainClaim
summary: Completa una transferencia por puente cuyo claim ID ya tiene quórum de atestaciones, entregando los fondos desde la door al destino que elijas.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainclaim
xls: XLS-0038
amendment: XChainBridge
level: intermedio
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

`XChainClaim` es el paso final "manual" de una transferencia por puente. Cuando hiciste [XChainCommit](/tx/XChainCommit) en la cadena origen sin indicar `OtherChainDestination`, los witnesses atestiguan el envío sin destino y los fondos no se entregan solos: quedan a la espera en tu [XChainOwnedClaimID](/objects/XChainOwnedClaimID). Con `XChainClaim` eliges a qué cuenta de esta cadena van (`Destination`, con `DestinationTag` opcional) y el importe (`Amount`), que debe coincidir con el que atestiguaron los witnesses.

Si la reclamación tiene éxito: la door de esta cadena paga `Amount` al destino, tu cuenta paga la `SignatureReward` repartida entre los witnesses que atestiguaron, y el objeto `XChainOwnedClaimID` se borra (liberando reserva). Si el commit llevaba `OtherChainDestination`, no hace falta esta transacción: la entrega ocurre automáticamente al alcanzar quórum en [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation).

## Cuándo usarlo

- Cuando hiciste el commit sin destino y quieres decidir después a quién entregar.
- Cuando la entrega automática falló (por ejemplo, el destino tenía DepositAuth o pedía destination tag) y el claim ID sigue vivo: el código conserva el claim (`OnTransferFail::KeepClaim`) para que puedas reintentar con otro destino o con `DestinationTag`.
- Para recibir en tu propia cuenta saltándote tu propio DepositAuth (ver abajo).

## Cómo funciona por dentro

`XChainClaim::preflight` (en `transactors/bridge/XChainBridge.cpp`): `Amount` positivo y con el activo de uno de los dos lados del puente (`temBAD_AMOUNT`).

`XChainClaim::preclaim`:

- Debe existir el [Bridge](/objects/Bridge) (`tecNO_ENTRY`) y la cuenta `Destination` (`tecNO_DST`): a diferencia de la creación de cuentas por puente, aquí no se crean cuentas.
- El activo de `Amount` debe ser el de **esta** cadena (`tecXCHAIN_BAD_TRANSFER_ISSUE`).
- Debe existir el `XChainOwnedClaimID` con ese `XChainClaimID` (`tecXCHAIN_NO_CLAIM_ID`) y **ser tuyo** (`tecXCHAIN_BAD_CLAIM_ID`).
- El quórum no se comprueba aquí sino en `doApply`.

`XChainClaim::doApply`:

1. Lee la lista de firmantes y el quórum de la door (`getSignersListAndQuorum`); sin SignerList, `tecXCHAIN_NO_SIGNERS_LIST`.
2. `onClaim` → `claimHelper` con `CheckDst::Ignore`: descarta las atestaciones cuyo firmante ya no está en la lista o cuya clave ya no es válida, suma los pesos de las que coinciden en importe (convertido al issue de la cadena origen) y en `WasLockingChainSend`, ignorando el destino que atestiguaron. Si el peso no llega al quórum, `tecXCHAIN_CLAIM_NO_QUORUM`.
3. `finalizeClaimHelper` transfiere desde la door al `Destination` (`transferHelper`, con `DepositAuthPolicy::DstCanBypass`: si el destino eres tú mismo, tu propio DepositAuth no bloquea). Si esa transferencia falla, se devuelve el error y el claim se **conserva**.
4. Reparte la `SignatureReward` guardada en el claim ID desde tu cuenta a partes iguales entre las `AttestationRewardAccount` de los witnesses que contaron para el quórum. Con [fixXChainRewardRounding](/amendments/fixXChainRewardRounding) (tampoco activo en testnet) el reparto redondea hacia abajo. Un fallo individual en un pago de recompensa no anula la operación, salvo `tecUNFUNDED_PAYMENT` o `tecINTERNAL`.
5. Borra el `XChainOwnedClaimID` del ledger y de tu directorio, y baja tu `OwnerCount` en 1.

## Campos clave

- **XChainClaimID** — número del claim ID que posees y sobre el que ya hay atestaciones.
- **Amount** — importe en el activo de esta cadena. Debe coincidir numéricamente con lo atestiguado; si no, no hay quórum para "ese" importe.
- **Destination** / **DestinationTag** — cuenta de esta cadena que recibe. Debe existir. Si tiene `lsfRequireDestTag`, el tag es obligatorio.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **tecXCHAIN_CLAIM_NO_QUORUM** — aún no hay suficientes atestaciones para ese importe, o el importe no coincide con el del commit.
- **tecXCHAIN_BAD_CLAIM_ID** — el claim ID existe pero pertenece a otra cuenta.
- **tecXCHAIN_NO_CLAIM_ID** — no existe (quizá ya se consumió con una entrega automática).
- **tecNO_DST** — la cuenta destino no existe en esta cadena.
- **tecDST_TAG_NEEDED** / **tecNO_PERMISSION** — el destino exige tag o tiene DepositAuth; el claim se conserva para reintentar.
- **tecXCHAIN_NO_SIGNERS_LIST** — la door no tiene lista de firmantes configurada.

## Ejemplo

```json
{
  "TransactionType": "XChainClaim",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTRA_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "XChainClaimID": "1",
  "Destination": "rXXXX_TU_CUENTA",
  "Amount": "1000000"
}
```

`rYYYY_OTRA_CUENTA` es la door de la cadena locking y `rZZZZ_EMISOR` la door de la cadena emisora. Reclamas 1 XRP para ti mismo.

## Pruébalo en testnet

1. Carga el ejemplo en el builder con el `XChainClaimID` de un claim ID tuyo y el mismo `Amount` que enviaste en el `XChainCommit` de la otra cadena.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo.
3. Cuando el amendment se active y haya quórum: tras `tesSUCCESS`, `account_objects` con `type: "xchain_owned_claim_id"` ya no mostrará el objeto, el `Balance` del `Destination` habrá subido en `Amount` y el tuyo habrá bajado en `SignatureReward + Fee`. En los metadatos verás los pagos de recompensa a cada witness.
4. Si lo envías antes de que haya quórum, verás `tecXCHAIN_CLAIM_NO_QUORUM` y el claim ID seguirá intacto; consulta `ledger_entry` con `xchain_owned_claim_id` para ver cuántas atestaciones lleva.

## Relacionado

- [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
