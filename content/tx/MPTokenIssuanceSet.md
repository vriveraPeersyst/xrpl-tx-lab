---
title: MPTokenIssuanceSet
summary: Bloquea o desbloquea una emisión de MPT (o un tenedor concreto); con DynamicMPT también muta metadatos y capacidades.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuanceset
amendment: MPTokensV1
level: intermedio
---

## Qué hace

`MPTokenIssuanceSet` es la herramienta de control del emisor sobre una emisión de Multi-Purpose Token ya creada. Hoy en testnet, con solo [MPTokensV1](/amendments/MPTokensV1) activo, su función es la de un interruptor de emergencia: bloquear (`tfMPTLock`) o desbloquear (`tfMPTUnlock`) la emisión completa —si la creaste con la capacidad `lsfMPTCanLock`— o, indicando `Holder`, un tenedor concreto. Mientras está bloqueado, ese saldo no puede transferirse.

El amendment [DynamicMPT](/amendments/DynamicMPT) amplía mucho esta transacción (mutar `TransferFee`, `MPTokenMetadata`, marcar capacidades como inmutables con `ImmutableFlags`...), pero **no está activo en testnet hoy**: cualquier campo de mutación (`TransferFee`, `MPTokenMetadata`, `ImmutableFlags`, o las claves ElGamal de [ConfidentialTransfer](/amendments/ConfidentialTransfer), tampoco activo) devuelve `temDISABLED`. En la práctica, en testnet solo puedes usar los flags de lock/unlock.

## Cuándo usarlo

- Congelar la circulación de una emisión ante una incidencia (bloqueo global con `tfMPTLock`, sin `Holder`).
- Bloquear a un tenedor concreto por sospecha de fraude, dejando intacto el resto de la circulación.
- Revertir el bloqueo (`tfMPTUnlock`) una vez resuelta la incidencia.

## Cómo funciona por dentro

**`MPTokenIssuanceSet::preflight`** primero calcula si la transacción es una "mutación" (`isMutate`): si incluye `TransferFee`, `MPTokenMetadata`, `ImmutableFlags` o algún flag de habilitar/deshabilitar capacidades. Si `isMutate` es verdadero pero [DynamicMPT](/amendments/DynamicMPT) no está activo, devuelve `temDISABLED` de inmediato — el camino que verás hoy en testnet si intentas usar esos campos. También rechaza `tfMPTLock` y `tfMPTUnlock` juntos (`temINVALID_FLAG`) y que `Holder` sea la propia cuenta emisora (`temMALFORMED`).

**`MPTokenIssuanceSet::preclaim`** exige que la emisión exista (`tecOBJECT_NOT_FOUND`). Para bloquear/desbloquear, exige que la emisión se creara con la capacidad `lsfMPTCanLock` (si no, el bloqueo no está disponible). Si indicas `Holder`, ese tenedor debe tener ya un `MPToken` para la emisión (`tecOBJECT_NOT_FOUND` si no lo tiene).

**`MPTokenIssuanceSet::doApply`** activa o desactiva el flag `lsfMPTLocked` en el `MPTokenIssuance` (bloqueo global, sin `Holder`) o en el `MPToken` concreto del tenedor indicado.

## Campos clave

- **MPTokenIssuanceID** — la emisión sobre la que operas.
- **Holder** — opcional; si lo indicas, el bloqueo/desbloqueo afecta solo a ese tenedor. Si lo omites, afecta a la emisión completa.
- **TransferFee**, **MPTokenMetadata**, **ImmutableFlags**, **IssuerEncryptionKey**, **AuditorEncryptionKey** — campos de mutación que requieren [DynamicMPT](/amendments/DynamicMPT) o [ConfidentialTransfer](/amendments/ConfidentialTransfer); no funcionales en testnet hoy.

## Flags

- **tfMPTLock** — bloquea la emisión completa, o al tenedor indicado en `Holder`. Requiere que la emisión tenga `lsfMPTCanLock`.
- **tfMPTUnlock** — revierte el bloqueo. No puedes combinarlo con `tfMPTLock` en la misma transacción.

## Errores habituales

- **temDISABLED** — usaste un campo de mutación (`TransferFee`, `MPTokenMetadata`, `ImmutableFlags`, claves ElGamal) sin el amendment correspondiente activo; es lo que verás hoy en testnet si los incluyes.
- **temINVALID_FLAG** — pusiste `tfMPTLock` y `tfMPTUnlock` a la vez.
- **temMALFORMED** — `Holder` es tu propia cuenta emisora.
- **tecOBJECT_NOT_FOUND** — la emisión no existe, o el `Holder` indicado no tiene `MPToken` para ella.
- **tecNO_PERMISSION** — no eres el emisor de la emisión indicada.

## Ejemplo

```json
{
  "TransactionType": "MPTokenIssuanceSet",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "Flags": 1
}
```

Bloquea la emisión completa (`Flags: 1` = `tfMPTLock`). Usa `Flags: 2` para `tfMPTUnlock`, y añade `Holder` para actuar solo sobre un tenedor.

## Pruébalo en testnet

1. Crea una emisión con `lsfMPTCanLock` habilitado usando `MPTokenIssuanceCreate` (Flags incluye el bit de "can lock").
2. Haz que otra cuenta cree su `MPToken` con [MPTokenAuthorize](/tx/MPTokenAuthorize).
3. Envía el ejemplo con `Flags: 1` para bloquear toda la emisión.
4. Intenta un `Payment` de esa MPT hacia el tenedor: comprueba que falla mientras esté bloqueada.
5. Envía `MPTokenIssuanceSet` con `Flags: 2` para desbloquear, y repite el `Payment`: ahora tiene éxito.

## Relacionado

- [MPTokenAuthorize](/tx/MPTokenAuthorize) — crea el `MPToken` que este comando bloquea/desbloquea.
- [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy) — destruye la emisión completa cuando ya no circula.
- Objetos: [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken).
- Amendments: [MPTokensV1](/amendments/MPTokensV1), [DynamicMPT](/amendments/DynamicMPT), [ConfidentialTransfer](/amendments/ConfidentialTransfer).
