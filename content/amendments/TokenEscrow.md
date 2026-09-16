---
title: TokenEscrow
summary: Permite que el Amount de un Escrow sea un token IOU o MPT, además de XRP.
xrplDocs: https://xrpl.org/resources/known-amendments#tokenescrow
---

## Qué cambia

Hasta ahora, [EscrowCreate](/tx/EscrowCreate) solo aceptaba XRP en el campo `Amount`. Con TokenEscrow, `Amount` puede ser también un IOU emitido o un MPT: `EscrowCreate` comprueba, con `featureTokenEscrow` activo, que si el importe no es nativo lo maneja como `STAmount` de tipo `Issue` o `MPTIssue` en vez de rechazarlo, y valida por ejemplo que un MPT no supere `kMaxMpTokenAmount` y que el importe sea estrictamente positivo. Las trustlines o MPTokens implicados deben existir y estar autorizados igual que en cualquier otra transferencia de esos tipos de token; si el emisor del IOU tiene `RequireAuth`, se aplican las mismas comprobaciones de autorización que en un `Payment`.

`EscrowFinish` y `EscrowCancel` liberan o devuelven el importe en el mismo tipo de activo con el que se creó el escrow, moviendo balance de trustline o de MPToken en lugar de drops de XRP. El resto de la mecánica del escrow (condición criptográfica, `CancelAfter`/`FinishAfter`, o ejecución opcional de un `FinishFunction` si `featureSmartEscrow` está activo) no cambia: solo se generaliza qué tipo de valor puede quedar retenido.

Este amendment depende de `fixTokenEscrowV1` para comportarse correctamente en los casos límite de emisores con clawback o congelación; sin ese fix, algunos escenarios de tokens IOU/MPT en escrow pueden dejar el estado inconsistente.

## Transacciones y objetos afectados

- [EscrowCreate](/tx/EscrowCreate), [EscrowFinish](/tx/EscrowFinish) y [EscrowCancel](/tx/EscrowCancel): `Amount` admite IOU y MPT además de XRP.
- Objeto [Escrow](/objects/Escrow): el importe retenido puede representar un token en vez de XRP.
- Interactúa con [TrustSet](/tx/TrustSet)/[RippleState](/objects/RippleState) y [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate)/[MPToken](/objects/MPToken) según el tipo de activo escrowed.

## Estado y contexto

Amplía uno de los mecanismos más antiguos del protocolo, el escrow condicional o temporizado, a cualquier token emitido en el ledger (IOU) o MPT, no solo XRP. Esto permite casos de uso como nóminas, vesting de tokens de proyecto, o pagos condicionados en stablecoins emitidas en XRPL, que antes solo podían montarse con XRP nativo o requerían un contrato externo.
