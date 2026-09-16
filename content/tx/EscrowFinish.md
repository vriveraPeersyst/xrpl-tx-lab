---
title: EscrowFinish
summary: Libera al destinatario los fondos de un Escrow cuyo FinishAfter ya ha pasado, aportando el Fulfillment si el escrow tenía Condition.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowfinish
amendment: Escrow
level: intermedio
---

## Qué hace

`EscrowFinish` completa un [Escrow](/objects/Escrow) creado con [EscrowCreate](/tx/EscrowCreate): entrega el importe bloqueado a la cuenta `Destination` del escrow y borra el objeto del ledger. Cualquier cuenta puede enviar esta transacción (no tiene por qué ser el remitente ni el destinatario), siempre que se cumplan las condiciones: ha pasado `FinishAfter`, no ha pasado `CancelAfter` y, si el escrow tenía `Condition`, se presenta el `Fulfillment` correcto.

El escrow se identifica por `Owner` (quien lo creó) y `OfferSequence` (el `Sequence` o Ticket de la transacción `EscrowCreate`). Al finalizar, el `OwnerCount` del creador baja en uno y recupera la reserva del objeto.

Un detalle importante: los escrows no crean cuentas. Si el destino se ha borrado mientras el escrow estaba vivo, la finalización falla con `tecNO_DST`.

## Cuándo usarlo

- Cobrar un vesting o un pago programado cuando llega la fecha.
- Cerrar un intercambio condicionado revelando la preimagen (`Fulfillment`) de la condición.
- Automatizar la liberación: un servicio externo puede enviar el `EscrowFinish` en nombre del destinatario, ya que cualquiera puede firmarlo.

## Cómo funciona por dentro

**`EscrowFinish::preflight`** (estático). `Condition` y `Fulfillment` van juntos o no van: si aparece uno sin el otro, `temMALFORMED`. En `preflightSigValidated`, si ambos están, se verifica que el fulfillment satisface la condición (`checkCondition`) y el resultado se cachea en el HashRouter; también se validan los `CredentialIDs` con `credentials::checkFields` si los hay. La fee no es la base: `EscrowFinish::calculateBaseFee` añade `base × (32 + tamaño_del_fulfillment / 16)` drops cuando hay `Fulfillment`. Con la fee base de testnet (10 drops) un fulfillment pequeño cuesta al menos 330 drops.

**`EscrowFinish::preclaim`** (contra el ledger). Si hay `CredentialIDs` y [Credentials](/amendments/Credentials) está activo, se comprueba que las credenciales son válidas para la cuenta que envía. Con [TokenEscrow](/amendments/TokenEscrow) activo, se lee ya aquí el escrow por `keylet::escrow(Owner, OfferSequence)`; si no existe, `tecNO_TARGET`. Si el importe es un token, `escrowFinishPreclaimHelper` exige que el destino esté autorizado por el emisor (si `RequireAuth`) y que no esté en deep freeze (`tecFROZEN`) o bloqueado en el MPT (`tecLOCKED`).

**`EscrowFinish::doApply`** (efectos). Con el tiempo de cierre del ledger padre: si `FinishAfter` existe y aún no ha pasado, `tecNO_PERMISSION` ("demasiado pronto"); si `CancelAfter` existe y ya ha pasado, también `tecNO_PERMISSION` ("demasiado tarde"). Luego la condición: si el fulfillment cacheado como inválido, `tecCRYPTOCONDITION_ERROR`; si el escrow no tenía `Condition` pero la transacción la trae, o si la trae distinta a la almacenada, también `tecCRYPTOCONDITION_ERROR`. Se lee el destino (`tecNO_DST` si no existe) y se aplica `verifyDepositPreauth`: si el destino tiene `lsfDepositAuth`, solo puede finalizar el propio destino, una cuenta preautorizada con [DepositPreauth](/tx/DepositPreauth) o alguien con credenciales aceptadas por el destino. Después borra el escrow de los directorios del creador y del destino, abona el importe: XRP directamente al `Balance`; tokens con `escrowUnlockApplyHelper`, aplicando el `TransferRate` guardado en el objeto en el momento de crearlo, y quitando el escrow del directorio del emisor. Por último decrementa el `OwnerCount` del creador y elimina el objeto.

## Campos clave

- **Owner** — Cuenta que creó el escrow. No es necesariamente tu cuenta.
- **OfferSequence** — `Sequence` (o `TicketSequence`) de la `EscrowCreate` original. Junto con `Owner` identifica el objeto.
- **Condition** — Debe ser exactamente la misma que se guardó en el escrow. Si el escrow no tenía condición, no la incluyas.
- **Fulfillment** — Preimagen en hexadecimal que satisface la condición. Obligatorio si pones `Condition`. Sube la fee.
- **CredentialIDs** — Identificadores de credenciales para pasar el filtro `DepositAuth` del destino.

## Errores habituales

- **tecNO_PERMISSION** — Todavía no ha llegado `FinishAfter`, ya ha pasado `CancelAfter`, o el destino tiene `DepositAuth` y no estás preautorizado.
- **tecNO_TARGET** — No existe un escrow con ese `Owner` + `OfferSequence`. Revisa que usas el `Sequence` de la `EscrowCreate`, no el del escrow en `account_objects` con otro nombre.
- **tecCRYPTOCONDITION_ERROR** — `Fulfillment` incorrecto, `Condition` distinta a la del escrow, o has puesto `Condition` en un escrow que no la tenía.
- **temMALFORMED** — `Condition` sin `Fulfillment` o viceversa.
- **telINSUF_FEE_P / terINSUF_FEE_B** — La fee no cubre el extra por `Fulfillment`.
- **tecNO_DST** — La cuenta destino del escrow ya no existe.
- **tecFROZEN / tecLOCKED** — Escrow de tokens con destino congelado o bloqueado.

## Ejemplo

Finaliza un escrow que creaste tú mismo (por eso `Owner` es tu cuenta) con `Sequence` 12345 y sin condición:

```json
{
  "TransactionType": "EscrowFinish",
  "Account": "rXXXX_TU_CUENTA",
  "Owner": "rXXXX_TU_CUENTA",
  "OfferSequence": 12345
}
```

Si el escrow tuviera condición, añadirías `"Condition": "A0258020...810120"` y `"Fulfillment": "A0228020..."`.

## Pruébalo en testnet

1. Crea antes un escrow con [EscrowCreate](/tx/EscrowCreate) con `FinishAfter` a unos dos minutos y apunta su `Sequence`.
2. Envía `EscrowFinish` de inmediato con ese `OfferSequence`: verás `tecNO_PERMISSION`, porque aún no ha pasado `FinishAfter`.
3. Espera a que el tiempo de cierre del ledger supere `FinishAfter` y reenvía. El resultado debe ser `tesSUCCESS`.
4. Consulta `account_objects` con `type: "escrow"` en tu cuenta: el objeto ha desaparecido. `account_info` de la cuenta destino muestra el `Balance` incrementado y tu `OwnerCount` ha bajado en uno.
5. Opcional: activa `asfDepositAuth` en la cuenta destino y prueba a finalizar desde una tercera cuenta para ver el `tecNO_PERMISSION` de `DepositAuth`.

## Relacionado

- [EscrowCreate](/tx/EscrowCreate) — crea el escrow.
- [EscrowCancel](/tx/EscrowCancel) — devuelve los fondos si pasa `CancelAfter`.
- [Escrow](/objects/Escrow) — el objeto que se borra aquí.
- [DepositPreauth](/tx/DepositPreauth) — preautoriza a quien puede finalizar hacia una cuenta con `DepositAuth`.
- [Credentials](/amendments/Credentials) — permite pasar `DepositAuth` con credenciales.
- [TokenEscrow](/amendments/TokenEscrow) — escrow de IOU y MPT.
