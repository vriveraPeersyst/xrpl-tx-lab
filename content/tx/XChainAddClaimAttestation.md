---
title: XChainAddClaimAttestation
summary: Un witness atestigua que vio un XChainCommit en la otra cadena; al alcanzar el quórum, la door entrega los fondos y paga las recompensas.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaddclaimattestation
xls: XLS-0038
amendment: XChainBridge
level: avanzado
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

Esta transacción la envían los **witnesses**, no los usuarios. Un witness es un servidor que observa las dos cadenas; cuando ve validado un [XChainCommit](/tx/XChainCommit) en la cadena origen, construye un mensaje con los datos del envío (claim ID, importe, cuenta origen, destino opcional, cuenta de recompensa, sentido del envío y especificación del puente), lo firma con su clave y lo publica en la cadena de destino con `XChainAddClaimAttestation`. Cualquier cuenta puede enviar la transacción (paga el fee), pero la firma que cuenta es la del witness (`PublicKey` + `Signature`), y su cuenta (`AttestationSignerAccount`) debe estar en la SignerList de la door.

La atestación se guarda en el array `XChainClaimAttestations` del [XChainOwnedClaimID](/objects/XChainOwnedClaimID) correspondiente. Cuando la suma de pesos de los witnesses que atestiguan lo mismo alcanza el `SignerQuorum` de la door, y la atestación incluye `Destination`, la transferencia se completa en la misma transacción: la door paga al destino, el owner del claim ID paga las recompensas y el claim ID se borra. Si no hay `Destination`, el owner deberá enviar [XChainClaim](/tx/XChainClaim).

## Cuándo usarlo

- Solo si operas un witness server del puente. Un usuario final nunca la envía a mano.
- Para reponer una atestación tras un cambio en la SignerList: las de firmantes que ya no están se descartan y hay que reenviar.

## Cómo funciona por dentro

`attestationPreflight<AttestationClaim>` (en `transactors/bridge/XChainBridge.cpp`):

- `PublicKey` debe ser una clave válida (`temMALFORMED`) y los campos deben formar una atestación bien construida.
- Verifica la firma sobre el mensaje serializado (`AttestationClaim::message`) con la especificación del puente (`temXCHAIN_BAD_PROOF`).
- `Amount` debe ser positivo y su activo el de la cadena **origen** según `WasLockingChainSend` (`temXCHAIN_BAD_PROOF`).

`attestationPreclaim`:

- Debe existir el [Bridge](/objects/Bridge) (`tecNO_ENTRY`) y la door debe tener SignerList (`tecXCHAIN_NO_SIGNERS_LIST`).
- `checkAttestationPublicKey`: `AttestationSignerAccount` debe estar en la lista (`tecNO_PERMISSION`). Si `PublicKey` es la master key de esa cuenta, esta no puede tener `lsfDisableMaster`; si no lo es, debe ser su `RegularKey`. Si la cuenta no existe en el ledger, la clave debe derivar exactamente a ella. Cualquier desajuste: `tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR`.

`attestationDoApply` → `applyClaimAttestations`:

1. Debe existir el `XChainOwnedClaimID` con ese `XChainClaimID` (`tecXCHAIN_NO_CLAIM_ID`).
2. `OtherChainSource` debe coincidir con el guardado en el claim ID (`tecXCHAIN_SENDING_ACCOUNT_MISMATCH`), y `WasLockingChainSend` debe apuntar hacia esta cadena (`tecXCHAIN_WRONG_CHAIN`).
3. `onNewAttestations`: si ya había una atestación de ese firmante, la **reemplaza**; si no, la añade. Después `claimHelper` purga las de firmantes inválidos y suma pesos de las que coinciden en importe, sentido **y destino** (`CheckDst::Check`) con la recién añadida.
4. Si hay quórum y la atestación trae `Destination`, `finalizeClaimHelper` transfiere desde la door al destino (`CanCreateDstPolicy::Yes`, así que puede crear la cuenta si es XRP ≥ reserva base), reparte la `SignatureReward` del claim ID desde su owner entre las `AttestationRewardAccount`, y borra el claim ID. Si la transferencia principal falla, el claim se **conserva** (`KeepClaim`) y la transacción devuelve el error solo si la lista de atestaciones no cambió; si cambió, se guarda la atestación y la tx tiene éxito aunque no se haya entregado.
5. Sin quórum o sin destino, solo se actualiza el array de atestaciones.

## Campos clave

- **AttestationSignerAccount** — cuenta del witness en la SignerList de la door; de su peso depende el quórum.
- **PublicKey** / **Signature** — clave con la que se firmó el mensaje de atestación y la firma. No es la firma de la transacción.
- **OtherChainSource** — cuenta que hizo el `XChainCommit` en la otra cadena; debe ser la del claim ID.
- **Amount** — importe en el activo de la cadena origen (el del commit).
- **WasLockingChainSend** — 1 si el commit fue en la cadena locking, 0 si fue en la issuing.
- **AttestationRewardAccount** — cuenta que cobrará la parte de la recompensa de este witness.
- **Destination** — opcional; lo que el commit indicó en `OtherChainDestination`. Con él la entrega es automática.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **temXCHAIN_BAD_PROOF** — la firma no verifica sobre los campos enviados, o el activo/importe no cuadra con el sentido del envío.
- **tecNO_PERMISSION** — el firmante no está en la SignerList de la door.
- **tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR** — la clave pública no corresponde a la cuenta firmante (master deshabilitada o regular key distinta).
- **tecXCHAIN_NO_CLAIM_ID** — el claim ID no existe o ya se consumió.
- **tecXCHAIN_SENDING_ACCOUNT_MISMATCH** — `OtherChainSource` no es el del claim ID.
- **tecXCHAIN_WRONG_CHAIN** — `WasLockingChainSend` apunta a la cadena equivocada.

## Ejemplo

```json
{
  "TransactionType": "XChainAddClaimAttestation",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rYYYY_OTRA_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "PublicKey": "",
  "Signature": "",
  "OtherChainSource": "rYYYY_OTRA_CUENTA",
  "Amount": "1000000",
  "AttestationRewardAccount": "rXXXX_TU_CUENTA",
  "AttestationSignerAccount": "rXXXX_TU_CUENTA",
  "WasLockingChainSend": 1,
  "XChainClaimID": "1"
}
```

`rYYYY_OTRA_CUENTA` es la door de la cadena locking y `rZZZZ_EMISOR` la door de la cadena emisora. `PublicKey` y `Signature` van vacíos porque solo un witness real puede producirlos: la firma debe cubrir exactamente estos campos serializados.

## Pruébalo en testnet

1. Carga el ejemplo en el builder. Sin una firma real de witness sobre el mensaje, la transacción nunca pasará de `preflight`.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo. Con el amendment activo pero con `Signature` vacía obtendrías `temMALFORMED` o `temXCHAIN_BAD_PROOF`.
3. Cuando el amendment se active y operes un witness: tras `tesSUCCESS` sin quórum, `ledger_entry` del `XChainOwnedClaimID` mostrará una entrada más en `XChainClaimAttestations`. Con quórum y `Destination`, el objeto desaparecerá, el destino habrá recibido `Amount` y cada `AttestationRewardAccount` su parte de la `SignatureReward`.

## Relacionado

- [XChainCommit](/tx/XChainCommit), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainClaim](/tx/XChainClaim)
- [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation)
- [SignerListSet](/tx/SignerListSet)
- [XChainOwnedClaimID](/objects/XChainOwnedClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
