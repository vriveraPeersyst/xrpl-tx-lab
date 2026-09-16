---
title: XChainCreateBridge
summary: Crea un puente entre dos cadenas (locking e issuing) desde una de sus cuentas door, fijando la recompensa a los witnesses y el mínimo para crear cuentas.
category: puente
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/xchaincreatebridge
xls: XLS-0038
amendment: XChainBridge
level: avanzado
---

## Qué hace

**Atención: el amendment [XChainBridge](/amendments/XChainBridge) no está activo en la testnet.** El tipo existe en las definiciones de la red (el servidor lo soporta), pero cualquier envío se rechaza con `temDISABLED` hasta que se active. Lo que sigue describe lo que hará cuando esté habilitado.

Un puente conecta dos ledgers independientes: la **cadena locking** (donde el activo original queda bloqueado) y la **cadena issuing** (donde se emite un activo "envuelto" que lo representa 1:1). No hay tipo de cambio: cada token envuelto equivale a un token bloqueado. En cada cadena hay una **cuenta door**, controlada por multifirma por un conjunto de **witnesses** (servidores que observan ambas cadenas y firman atestaciones de lo que ocurre en la otra).

`XChainCreateBridge` la envía una de las dos cuentas door y crea el objeto [Bridge](/objects/Bridge) en su propia cadena. El objeto guarda la especificación del puente (`XChainBridge`: las dos doors y los dos activos), la `SignatureReward` que cobrarán los witnesses por cada atestación y, opcionalmente, `MinAccountCreateAmount`, que habilita la creación de cuentas a través del puente. Además inicializa tres contadores a 0: `XChainClaimID`, `XChainAccountCreateCount` y `XChainAccountClaimCount`.

Para que el puente funcione de verdad hay que crearlo **en las dos cadenas** (una transacción por cadena, cada una enviada por su door) y configurar en cada door una lista de firmantes ([SignerListSet](/tx/SignerListSet)) con las claves de los witnesses.

## Cuándo usarlo

- Montar una sidechain que use XRP envuelto: la door de la issuing chain debe ser la cuenta raíz de esa cadena.
- Puentear un token emitido (IOU): la door de la issuing chain debe ser el propio emisor del token envuelto.
- Solo tiene sentido si controlas la cuenta door y un conjunto de witnesses; un usuario normal nunca envía esta transacción.

## Cómo funciona por dentro

`XChainCreateBridge::preflight` (validación estática, en `transactors/bridge/XChainBridge.cpp`):

- Las dos doors deben ser distintas (`temXCHAIN_EQUAL_DOOR_ACCOUNTS`), para evitar replays entre cadenas.
- La cuenta que envía debe ser una de las dos doors (`temXCHAIN_BRIDGE_NONDOOR_OWNER`).
- Los dos activos deben ser ambos XRP o ambos IOU (`temXCHAIN_BRIDGE_BAD_ISSUES`): tienen rangos numéricos distintos.
- `SignatureReward` debe ser XRP y no negativa (`temXCHAIN_BRIDGE_BAD_REWARD_AMOUNT`). Puede ser 0.
- `MinAccountCreateAmount`, si va, debe ser XRP positivo y el puente debe ser XRP-XRP (`temXCHAIN_BRIDGE_BAD_MIN_ACCOUNT_CREATE_AMOUNT`).
- Si el activo de la issuing chain es XRP, `IssuingChainDoor` tiene que ser la cuenta raíz (la derivada de `masterpassphrase`, `rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh`), para que nunca "se quede sin" XRP envuelto. Si es un IOU, la door debe ser su emisor. Y la door locking no puede ser el emisor del activo que bloquea (no habría nada que bloquear). Todo ello devuelve `temXCHAIN_BRIDGE_BAD_ISSUES`.

`XChainCreateBridge::preclaim` (contra el ledger):

- Si ya existe un Bridge con esa especificación en cualquiera de los dos lados, `tecDUPLICATE`.
- Si el activo de esta cadena es un IOU, su emisor debe existir (`tecNO_ISSUER`) y **no** tener `lsfAllowTrustLineClawback` (`tecNO_PERMISSION`): un clawback rompería la garantía de que cada token envuelto está respaldado.
- La cuenta debe cubrir la reserva con un objeto más (`tecINSUFFICIENT_RESERVE`).

`XChainCreateBridge::doApply` crea el objeto Bridge (`keylet::bridge(spec, chainType)`), lo enlaza en el directorio del owner y sube el `OwnerCount` en 1.

## Campos clave

- **XChainBridge** — objeto con `LockingChainDoor`, `LockingChainIssue`, `IssuingChainDoor` e `IssuingChainIssue`. Identifica el puente; debe ser idéntico en las dos cadenas y en todas las transacciones posteriores.
- **SignatureReward** — XRP (en drops) que quien reclama paga a los witnesses; se reparte a partes iguales entre los que atestiguaron. Cada `XChainCreateClaimID` y `XChainAccountCreateCommit` debe indicar exactamente este valor.
- **MinAccountCreateAmount** — si está presente, el puente permite `XChainAccountCreateCommit` y ese es el mínimo de XRP a enviar. Si se omite, la creación de cuentas por puente está deshabilitada.

## Errores habituales

- **temDISABLED** — el amendment no está activo en la red. Es lo que verás hoy en testnet.
- **temXCHAIN_BRIDGE_NONDOOR_OWNER** — la cuenta que firma no es ninguna de las dos doors.
- **temXCHAIN_BRIDGE_BAD_ISSUES** — issuing door incorrecta (no es la raíz para XRP o no es el emisor para IOU), o mezcla XRP/IOU.
- **temXCHAIN_EQUAL_DOOR_ACCOUNTS** — has puesto la misma cuenta en las dos doors.
- **tecDUPLICATE** — el puente ya existe en esta cadena.
- **tecNO_PERMISSION** — el emisor del IOU tiene clawback habilitado.
- **tecINSUFFICIENT_RESERVE** — no cubres la reserva del nuevo objeto.

## Ejemplo

```json
{
  "TransactionType": "XChainCreateBridge",
  "Account": "rXXXX_TU_CUENTA",
  "XChainBridge": {
    "LockingChainDoor": "rXXXX_TU_CUENTA",
    "LockingChainIssue": { "currency": "XRP" },
    "IssuingChainDoor": "rZZZZ_EMISOR",
    "IssuingChainIssue": { "currency": "XRP" }
  },
  "SignatureReward": "100",
  "MinAccountCreateAmount": "10000000"
}
```

Aquí tu cuenta actúa como door de la cadena locking y `rZZZZ_EMISOR` es la door de la cadena emisora. Ojo: para un puente XRP-XRP real, esa door emisora tendría que ser la cuenta raíz de la sidechain, no una cuenta cualquiera.

## Pruébalo en testnet

1. Carga el ejemplo en el builder y fírmalo con tu cuenta.
2. Envíalo: hoy la respuesta será `temDISABLED`, porque XChainBridge no está activo. Consulta `feature` con el hash `C98D98EE9616ACD36E81FDEB8D41D349BF5F1B41DD64A0ABC1FE9AA5EA267E9C` para ver su estado de votación.
3. Cuando el amendment se active: tras un `tesSUCCESS`, `account_objects` con `type: "bridge"` mostrará el objeto Bridge con `XChainClaimID: 0`, `XChainAccountCreateCount: 0` y `XChainAccountClaimCount: 0`, y `OwnerCount` de tu cuenta subirá en 1.
4. Después tendrías que configurar los witnesses con `SignerListSet` y deshabilitar la master key de la door; sin lista de firmantes cualquier atestación o claim falla con `tecXCHAIN_NO_SIGNERS_LIST`.

## Relacionado

- [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim)
- [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit)
- [SignerListSet](/tx/SignerListSet)
- [Bridge](/objects/Bridge)
- [XChainBridge](/amendments/XChainBridge)
