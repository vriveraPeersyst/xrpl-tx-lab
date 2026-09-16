---
title: TicketCreate
summary: Reserva de golpe varios números de secuencia (Tickets) para enviar después transacciones sin respetar el orden de Sequence.
category: multifirma
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ticketcreate
xls: XLS-0013
amendment: TicketBatch
level: intermedio
---

## Qué hace

Cada cuenta del XRPL tiene un contador `Sequence` que obliga a enviar las transacciones en orden estricto: si la número 10 no se aplica, la 11 se queda esperando. `TicketCreate` rompe esa limitación: consume una única `Sequence` y, a cambio, crea entre 1 y 250 objetos [Ticket](/objects/Ticket), cada uno con su propio `TicketSequence`.

La analogía es la de un talonario numerado: sacas varios "tiques" de una vez y luego los gastas en el orden que quieras. Una transacción posterior que use `TicketSequence: N` en lugar de `Sequence` no compite con las demás y no bloquea a nadie si falla o se retrasa.

Es especialmente útil en multifirma, donde reunir firmas puede tardar días y no sabes en qué orden acabarán las transacciones. Cada Ticket ocupa una unidad de owner reserve (0,2 XRP en testnet) hasta que se consume.

## Cuándo usarlo

- Preparar varias transacciones multifirma en paralelo sin que una bloquee a las demás.
- Firmar en frío (offline) transacciones que se enviarán más tarde, sin adivinar la `Sequence` futura.
- Tener siempre una "vía de emergencia": un Ticket reservado para poder enviar, por ejemplo, un `SetRegularKey` aunque otras transacciones estén encoladas.
- Enviar transacciones desde varios sistemas que comparten cuenta y no se coordinan entre sí.

## Cómo funciona por dentro

`TicketCreate::preflight` solo comprueba una cosa: que `TicketCount` esté entre `kMinValidCount` (1) y `kMaxValidCount` (250). Fuera de ese rango devuelve `temINVALID_COUNT`.

`TicketCreate::preclaim` lee el `AccountRoot` (si no existe, `terNO_ACCOUNT`) y calcula cuántos Tickets tendrá la cuenta tras aplicar la transacción: los que ya tiene (`TicketCount` del `AccountRoot`) más los nuevos, menos uno si la propia `TicketCreate` se envía usando un Ticket. Si el resultado supera `kMaxTicketThreshold` (250), devuelve `tecDIR_FULL`. Es decir, una cuenta nunca puede tener más de 250 Tickets vivos a la vez.

`TicketCreate::doApply` comprueba primero la reserva: el saldo previo al pago de la fee (`preFeeBalance_`) debe cubrir `accountReserve` con `ownerCountDelta = TicketCount`; si no, `tecINSUFFICIENT_RESERVE`. Se compara contra el saldo *antes* de la fee a propósito, para que puedas hundirte en la reserva para pagarla. Después crea un objeto `Ticket` por cada unidad: el primer `TicketSequence` es el `Sequence` actual del `AccountRoot` (la maquinaria de transacciones ya lo ha incrementado en 1 al consumir la transacción), y los siguientes son consecutivos. Cada objeto se inserta en el directorio de la cuenta (si el directorio no admite más entradas, `tecDIR_FULL`). Al final actualiza `TicketCount` del `AccountRoot`, incrementa `OwnerCount` en `TicketCount` unidades y sube `Sequence` a `firstTicketSeq + TicketCount`. Como recuerda un comentario del código, es la única transacción que puede aumentar el `Sequence` de una cuenta en más de uno.

`TicketCreate::makeTxConsequences` declara que la transacción consume `TicketCount` secuencias, lo que la cola de transacciones usa para no aceptar más de las que caben.

El tipo lo introdujo el amendment [TicketBatch](/amendments/TicketBatch) (activo en testnet). El transactor actual ya no lo consulta: está integrado de forma incondicional.

## Campos clave

- **TicketCount** — cuántos Tickets creas (1-250). Cada uno consume una unidad de owner reserve y la cuenta no puede acumular más de 250.
- **Sequence** — el `Sequence` de esta transacción (o el `TicketSequence` si la envías con un Ticket). Los Tickets creados empiezan justo en `Sequence + 1`: si envías `TicketCreate` con `Sequence: 100` y `TicketCount: 3`, obtienes los Tickets 101, 102 y 103, y tu siguiente `Sequence` normal será 104.

## Errores habituales

- **temINVALID_COUNT** — `TicketCount` es 0 o mayor que 250.
- **tecDIR_FULL** — la cuenta acabaría con más de 250 Tickets. Consume o cancela algunos antes (cualquier transacción enviada con `TicketSequence` lo elimina, aunque falle con `tec`).
- **tecINSUFFICIENT_RESERVE** — no tienes XRP suficiente para cubrir `TicketCount` unidades adicionales de owner reserve. En testnet son 0,2 XRP por Ticket.
- **terNO_ACCOUNT** — la cuenta emisora no existe en el ledger (todavía no ha recibido fondos).
- **tefPAST_SEQ / terPRE_SEQ** — no son del transactor sino de la maquinaria común: la `Sequence` de la propia `TicketCreate` sigue teniendo que ser la correcta.

## Ejemplo

```json
{
  "TransactionType": "TicketCreate",
  "Account": "rXXXX_TU_CUENTA",
  "TicketCount": 2
}
```

## Pruébalo en testnet

1. Consulta `account_info` de tu cuenta y anota `Sequence` y `OwnerCount`.
2. En el builder, envía el ejemplo con `TicketCount: 2`.
3. Vuelve a `account_info`: `Sequence` ha subido en 3 (1 por la transacción + 2 Tickets), `OwnerCount` en 2 y aparece el campo `TicketCount: 2`.
4. Ejecuta `account_objects` con `type: "ticket"`: verás dos objetos `Ticket` con `TicketSequence` consecutivos.
5. Envía cualquier otra transacción (por ejemplo un [Payment](/tx/Payment)) con `Sequence: 0` y `TicketSequence` igual a uno de ellos. Al validarse, el Ticket desaparece y `OwnerCount` baja en 1; tu `Sequence` normal no cambia.
6. Prueba a pedir `TicketCount: 251`: obtendrás `temINVALID_COUNT` antes siquiera de llegar al ledger.

## Relacionado

- [Ticket](/objects/Ticket) — el objeto que crea.
- [SignerListSet](/tx/SignerListSet) — multifirma, el caso de uso principal de los Tickets.
- [AccountSet](/tx/AccountSet) y [SetRegularKey](/tx/SetRegularKey) — transacciones que conviene poder enviar "fuera de turno".
- [TicketBatch](/amendments/TicketBatch) — amendment que introdujo el tipo.
- [Batch](/tx/Batch) — las transacciones internas de un Batch pueden usar `TicketSequence`.
