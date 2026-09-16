---
title: EscrowCancel
summary: Devuelve al creador los fondos de un Escrow cuyo CancelAfter ya ha pasado y elimina el objeto del ledger.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowcancel
amendment: Escrow
level: básico
---

## Qué hace

`EscrowCancel` deshace un [Escrow](/objects/Escrow) que ha caducado: devuelve el importe bloqueado a la cuenta que lo creó (`Owner`) y borra el objeto. Solo es posible si el escrow tenía `CancelAfter` y ese instante ya ha pasado según el tiempo de cierre del ledger. Un escrow sin `CancelAfter` no se puede cancelar nunca: solo puede terminar con [EscrowFinish](/tx/EscrowFinish).

Como en `EscrowFinish`, cualquier cuenta puede enviar la transacción; no hace falta ser el creador ni el destinatario. El escrow se identifica por `Owner` y `OfferSequence` (el `Sequence` o Ticket de la [EscrowCreate](/tx/EscrowCreate) original). Al cancelar, el creador recupera los fondos y una unidad de owner reserve.

## Cuándo usarlo

- Recuperar una fianza o un pago condicionado que el destinatario no reclamó a tiempo.
- Limpiar escrows vencidos para liberar reserva (0,2 XRP por objeto en testnet).
- Cualquier servicio de "housekeeping" puede cancelar escrows caducados de terceros, ya que la transacción no exige ser el propietario.

## Cómo funciona por dentro

**`EscrowCancel::preflight`** no valida nada específico: solo se aplican las comprobaciones comunes a toda transacción (firma, fee, flags universales).

**`EscrowCancel::preclaim`** (contra el ledger). Con [TokenEscrow](/amendments/TokenEscrow) activo, como en testnet, busca el escrow por `keylet::escrow(Owner, OfferSequence)`; si no existe, `tecNO_TARGET`. Si el importe es un token IOU, `escrowCancelPreclaimHelper<Issue>` comprueba que el creador sigue autorizado por el emisor (`requireAuth`), para poder devolverle los fondos. Para MPT, comprueba además que la emisión existe (`tecOBJECT_NOT_FOUND`). Nota: no se comprueba la congelación, a diferencia de `EscrowFinish`; la devolución al creador se permite aunque la línea esté congelada.

**`EscrowCancel::doApply`** (efectos). Si el escrow no tiene `CancelAfter`, `tecNO_PERMISSION`. Si el tiempo de cierre del ledger padre aún no ha superado `CancelAfter`, también `tecNO_PERMISSION`. A partir de ahí: elimina el escrow del owner directory del creador y, si existe `DestinationNode`, del directorio del destinatario. Devuelve el importe: si es XRP, lo suma al `Balance` del creador; si es token, llama a `escrowUnlockApplyHelper` con tasa de paridad (`kParityRate`), es decir, sin aplicar `TransferRate` al devolver, y borra el enlace del directorio del emisor. Si el creador borró su trust line mientras el escrow estaba pendiente, la devolución la vuelve a crear (`createAsset` es verdadero cuando quien cancela es el creador). Por último decrementa el `OwnerCount` del creador y borra el objeto. El amendment [fixCleanup3_4_0](/amendments/fixCleanup3_4_0) (no activo en testnet) solo cambia el orden en que se descuenta el owner count respecto a la posible recreación de la trust line, para que el escrow eliminado no cuente contra la reserva.

A diferencia de `EscrowFinish`, aquí no hay condición criptográfica ni comprobación de `DepositAuth`: el dinero vuelve a su dueño, no entra en ninguna cuenta ajena.

## Campos clave

- **Owner** — Cuenta que creó el escrow y que recibirá los fondos de vuelta.
- **OfferSequence** — `Sequence` (o `TicketSequence`) de la transacción `EscrowCreate`. Con `Owner`, identifica el objeto.

No hay más campos propios. La cuenta que firma (`Account`) puede ser cualquiera.

## Errores habituales

- **tecNO_PERMISSION** — El escrow no tiene `CancelAfter`, o aún no ha llegado ese instante. Recuerda que se compara con el tiempo de cierre del ledger padre, no con tu reloj.
- **tecNO_TARGET** — No hay escrow con ese `Owner` + `OfferSequence`; quizá ya fue finalizado o cancelado.
- **tecNO_AUTH** — Escrow de tokens con emisor `RequireAuth` que ha retirado la autorización al creador.
- **tecOBJECT_NOT_FOUND** — Escrow de MPT cuya emisión ya no existe.
- **tefBAD_LEDGER** — Fallo interno al quitar el objeto de un directorio; no debería ocurrir.

## Ejemplo

Cancela un escrow que creaste tú con `Sequence` 12345:

```json
{
  "TransactionType": "EscrowCancel",
  "Account": "rXXXX_TU_CUENTA",
  "Owner": "rXXXX_TU_CUENTA",
  "OfferSequence": 12345
}
```

## Pruébalo en testnet

1. Crea un escrow con [EscrowCreate](/tx/EscrowCreate) usando `FinishAfter` a +60 s y `CancelAfter` a +180 s (el builder admite `{{time+180}}`). Anota su `Sequence`.
2. Envía `EscrowCancel` de inmediato: obtendrás `tecNO_PERMISSION` porque `CancelAfter` aún no ha pasado.
3. Espera a que el ledger supere `CancelAfter` y reenvía. El resultado debe ser `tesSUCCESS`.
4. Consulta `account_objects` con `type: "escrow"`: el objeto ya no está. En `account_info`, tu `Balance` ha recuperado el importe (menos las fees) y tu `OwnerCount` ha bajado en uno.
5. Prueba también a cancelar desde otra cuenta (`Account` distinta de `Owner`): funciona igual, porque cualquiera puede cancelar un escrow vencido.

## Relacionado

- [EscrowCreate](/tx/EscrowCreate) — crea el escrow y fija `CancelAfter`.
- [EscrowFinish](/tx/EscrowFinish) — la vía alternativa: entregar al destinatario.
- [Escrow](/objects/Escrow) — el objeto que se elimina.
- [TokenEscrow](/amendments/TokenEscrow) — escrow de IOU y MPT.
- [fixTokenEscrowV1](/amendments/fixTokenEscrowV1) — correcciones al escrow de tokens.
