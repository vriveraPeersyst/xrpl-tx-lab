---
title: XChainAddAccountCreateAttestation
summary: Un witness atestigua un XChainAccountCreateCommit de la otra cadena; con quórum, la door crea la cuenta destino y paga las recompensas.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchainaddaccountcreateattestation
xls: XLS-0038
amendment: XChainBridge
level: avanzado
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** Hasta que se active, cualquier envío se rechaza con `temDISABLED`.

Es la contrapartida de [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit). Cuando un witness ve validado en la otra cadena un commit de creación de cuenta, firma un mensaje con sus datos (número de creación `XChainAccountCreateCount`, importe, recompensa, cuenta origen, cuenta a crear, sentido) y lo publica aquí. Como no existe un claim ID creado por el usuario, las atestaciones se acumulan en un objeto [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID) que **posee la door** y que el propio transactor crea la primera vez que llega una atestación para ese número.

Cuando se alcanza el quórum y ese número es exactamente el siguiente que le toca al puente (`XChainAccountClaimCount + 1`), la door crea la cuenta `Destination` con `Amount`, paga la `SignatureReward` a los witnesses **con sus propios fondos** (que el usuario ya adelantó en la otra cadena) y avanza el contador. Las creaciones se procesan en orden estricto.

## Cuándo usarlo

- Solo si operas un witness server. Los usuarios nunca la envían a mano.
- Para desatascar una cola de creaciones: si un número anterior no tiene quórum, los siguientes esperan en sus objetos hasta que le llegue el turno.

## Cómo funciona por dentro

`attestationPreflight<AttestationCreateAccount>` (en `transactors/bridge/XChainBridge.cpp`): clave pública válida, atestación bien formada, firma que verifica sobre el mensaje con la especificación del puente, importes válidos y `Amount` positivo con el activo de la cadena origen según `WasLockingChainSend`. Fallos: `temMALFORMED` o `temXCHAIN_BAD_PROOF`.

`attestationPreclaim`: existe el [Bridge](/objects/Bridge) (`tecNO_ENTRY`), la door tiene SignerList (`tecXCHAIN_NO_SIGNERS_LIST`), `AttestationSignerAccount` está en ella (`tecNO_PERMISSION`) y `PublicKey` corresponde a esa cuenta (master no deshabilitada o regular key correcta: `tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR`).

`attestationDoApply` → `applyCreateAccountAttestations`:

1. Lee `XChainAccountClaimCount` del Bridge. Si `XChainAccountCreateCount` de la atestación es ≤ a ese valor, ya se procesó: `tecXCHAIN_ACCOUNT_CREATE_PAST`. Si está 128 o más por delante (`kXbridgeMaxAccountCreateClaims`), `tecXCHAIN_ACCOUNT_CREATE_TOO_MANY`.
2. `WasLockingChainSend` debe apuntar hacia esta cadena (`tecXCHAIN_WRONG_CHAIN`).
3. Si no existe el `XChainOwnedCreateAccountClaimID` para ese número, la **door** debe cubrir la reserva de un objeto más (`tecINSUFFICIENT_RESERVE`); si existe, se cargan sus atestaciones.
4. `onNewAttestations` añade o reemplaza la de este firmante y `claimHelper` (con `CheckDst::Check`) suma pesos de las que coinciden en importe, sentido y cuenta destino.
5. Si hay quórum **y** es el siguiente número en la cola: `finalizeClaimHelper` transfiere `Amount` desde la door a `Destination` (puede crear la cuenta si `Amount` ≥ reserva base; si no, `tecNO_DST_INSUF_XRP`), reparte `SignatureReward` desde la door entre las `AttestationRewardAccount`, y borra el objeto. Se usa `OnTransferFail::RemoveClaim`: aunque la creación falle, el claim se elimina y el contador avanza, para no bloquear a los siguientes. Solo `tecINTERNAL`, `tecUNFUNDED_PAYMENT` y errores `tef` abortan la transacción. Al final, `XChainAccountClaimCount` del Bridge pasa a valer este número.
6. Si no hay quórum o no es su turno: si el objeto no existía se crea (con `Account` = door, `XChainAccountCreateCount` y el array `XChainCreateAccountAttestations`), se inserta en el directorio de la door y sube su `OwnerCount`; si existía, se actualiza el array.

## Campos clave

- **XChainAccountCreateCount** — número de orden que asignó el Bridge de la otra cadena al hacer el commit. Determina la posición en la cola.
- **Destination** — cuenta a crear (o financiar, si ya existe) en esta cadena.
- **Amount** — XRP que recibirá la cuenta; es el `Amount` del commit, no incluye la recompensa.
- **SignatureReward** — la recompensa que el usuario adelantó; se reparte entre los witnesses desde la door.
- **AttestationSignerAccount** / **PublicKey** / **Signature** — identidad y firma del witness sobre el mensaje de atestación.
- **AttestationRewardAccount** — cuenta que cobra la parte de este witness.

## Errores habituales

- **temDISABLED** — el amendment no está activo. Es lo que verás hoy en testnet.
- **temXCHAIN_BAD_PROOF** — la firma no cubre estos campos o el activo no cuadra con el sentido.
- **tecXCHAIN_ACCOUNT_CREATE_PAST** — ese número de creación ya fue procesado.
- **tecXCHAIN_ACCOUNT_CREATE_TOO_MANY** — hay más de 127 creaciones pendientes por delante.
- **tecNO_PERMISSION** / **tecXCHAIN_BAD_PUBLIC_KEY_ACCOUNT_PAIR** — el firmante no está en la SignerList o la clave no le corresponde.
- **tecINSUFFICIENT_RESERVE** — la door no cubre la reserva del nuevo objeto de atestaciones.
- **tecXCHAIN_WRONG_CHAIN** — `WasLockingChainSend` apunta a la cadena equivocada.

## Ejemplo

```json
{
  "TransactionType": "XChainAddAccountCreateAttestation",
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
  "Amount": "20000000",
  "AttestationRewardAccount": "rXXXX_TU_CUENTA",
  "AttestationSignerAccount": "rXXXX_TU_CUENTA",
  "WasLockingChainSend": 1,
  "XChainAccountCreateCount": "1",
  "Destination": "rYYYY_OTRA_CUENTA",
  "SignatureReward": "100"
}
```

`rYYYY_OTRA_CUENTA` es la door de la cadena locking y `rZZZZ_EMISOR` la door de la cadena emisora. `PublicKey` y `Signature` van vacíos porque solo un witness real puede producirlos.

## Pruébalo en testnet

1. Carga el ejemplo en el builder. Sin firma real de witness no pasará de `preflight`.
2. Envíalo: hoy obtendrás `temDISABLED` porque XChainBridge no está activo. Con el amendment activo y firma vacía, `temMALFORMED` o `temXCHAIN_BAD_PROOF`.
3. Cuando el amendment se active y operes un witness: tras `tesSUCCESS` sin quórum, `account_objects` de la **door** con `type: "xchain_owned_create_account_claim_id"` mostrará el objeto con tu atestación en `XChainCreateAccountAttestations`. Con quórum y en su turno, el objeto desaparecerá, `account_info` de `Destination` devolverá la cuenta creada con `Amount`, y `ledger_entry` del Bridge mostrará `XChainAccountClaimCount` igual a `XChainAccountCreateCount`.

## Relacionado

- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation)
- [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [SignerListSet](/tx/SignerListSet)
- [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID), [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge), [fixXChainRewardRounding](/amendments/fixXChainRewardRounding)
