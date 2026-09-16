---
title: OfferCancel
summary: Retira del libro una orden tuya que sigue viva, identificada por el Sequence de la OfferCreate que la creó.
category: dex
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/offercancel
level: básico
---

## Qué hace

`OfferCancel` elimina un objeto [Offer](/objects/Offer) que tu cuenta tiene en el DEX. Solo necesitas indicar `OfferSequence`: el `Sequence` (o el número de Ticket) con el que enviaste la [OfferCreate](/tx/OfferCreate) original. Al borrarse la orden, desaparece del directorio del libro y de tu directorio de propietario, y tu `OwnerCount` baja en 1, liberando 0,2 XRP de reserva en testnet.

Es una transacción deliberadamente tolerante: si la orden ya no existe (porque se cruzó por completo, la borró otra transacción o nunca llegó a colocarse), el resultado sigue siendo `tesSUCCESS`. Pagas la tasa, pero no hay error. Eso hace seguro enviarla "por si acaso".

No hay forma de cancelar la orden de otra cuenta: la clave del objeto se deriva de tu `Account` más el `OfferSequence` (`keylet::offer(account, seq)`), así que solo puede coincidir con órdenes tuyas.

## Cuándo usarlo

- Retirar una orden límite que ya no quieres mantener (el precio se ha movido).
- Liberar reserva de propietario antes de borrar una cuenta con [AccountDelete](/tx/AccountDelete): las ofertas son borrables automáticamente, pero cancelarlas antes evita sorpresas.
- Limpiar órdenes expiradas: una orden con `Expiration` pasada sigue ocupando reserva hasta que alguien la toca.
- Si además quieres colocar una nueva orden, es más barato usar el campo `OfferSequence` de [OfferCreate](/tx/OfferCreate), que cancela y crea en una sola transacción.

## Cómo funciona por dentro

**`OfferCancel::preflight`**: la única validación estática es que `OfferSequence` no sea 0; si lo es, `temBAD_SEQUENCE`.

**`OfferCancel::preclaim`**: lee tu [AccountRoot](/objects/AccountRoot) (si no existe, `terNO_ACCOUNT`) y comprueba que `OfferSequence` es **estrictamente menor** que tu `Sequence` actual. Un valor igual o mayor no puede corresponder a ninguna orden ya enviada y devuelve `temBAD_SEQUENCE`. Ojo: como la comparación es contra `Sequence`, si la orden se creó con un Ticket cuyo número es mayor que tu `Sequence` actual, esta comprobación la rechaza.

**`OfferCancel::doApply`**: construye la clave `keylet::offer(Account, OfferSequence)` y hace `peek` en el ledger. Si el objeto existe, llama a `offerDelete`, que lo saca del directorio del libro (`BookDirectory`/`BookNode`), de tu directorio de propietario (`OwnerNode`), decrementa `OwnerCount` y borra el SLE. Si no existe, escribe un log de depuración y devuelve `tesSUCCESS` sin tocar nada.

El transactor no consulta ningún amendment: el comportamiento es el mismo desde hace años. No tiene flags propios.

## Campos clave

- **OfferSequence** — `Sequence` de la transacción `OfferCreate` que creó la orden. Si la creaste con un Ticket, es el `TicketSequence`. Lo encuentras como `seq` en la respuesta de `account_offers` o en el campo `Sequence` del objeto `Offer` en `account_objects`.

## Errores habituales

- **temBAD_SEQUENCE** — `OfferSequence` es 0, o es mayor o igual que el `Sequence` actual de tu cuenta. Copia el valor exacto de `account_offers`.
- **terNO_ACCOUNT** — la cuenta que firma no existe en el ledger (no está financiada).
- **tesSUCCESS sin cambios** — no es un error, pero es la situación más confusa: la orden ya no estaba. Comprueba en los metadatos si hay un nodo `Offer` en `DeletedNode`; si no lo hay, no se borró nada.
- **tefPAST_SEQ / terPRE_SEQ** — errores genéricos de secuencia de la propia transacción (no de `OfferSequence`): reenvía con el `Sequence` correcto de la cuenta.

## Ejemplo

```json
{
  "TransactionType": "OfferCancel",
  "Account": "rXXXX_TU_CUENTA",
  "OfferSequence": 12345
}
```

## Pruébalo en testnet

1. Crea una orden con [OfferCreate](/tx/OfferCreate) a un precio que nadie vaya a cruzar (por ejemplo, 1 XRP por 1.000.000 USD) y anota el `Sequence` de esa transacción.
2. Consulta `account_offers` y verifica que aparece con ese `seq`.
3. Envía `OfferCancel` con `OfferSequence` igual a ese valor.
4. Vuelve a consultar `account_offers`: la orden ha desaparecido. En `account_info`, `OwnerCount` ha bajado en 1.
5. Reenvía exactamente la misma `OfferCancel`: verás `tesSUCCESS` otra vez, pero en los metadatos solo se modifica tu `AccountRoot` (tasa y `Sequence`), sin `DeletedNode`.
6. Prueba con `OfferSequence` igual a tu `Sequence` actual y observa `temBAD_SEQUENCE`.

## Relacionado

- [OfferCreate](/tx/OfferCreate)
- [Offer](/objects/Offer)
- [DirectoryNode](/objects/DirectoryNode)
- [TicketCreate](/tx/TicketCreate)
- [AccountDelete](/tx/AccountDelete)
