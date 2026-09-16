---
title: TicketBatch
summary: Introduce los Tickets, que reservan un número de secuencia para usarlo más adelante fuera del orden estricto del Sequence de la cuenta.
xrplDocs: https://xrpl.org/resources/known-amendments#ticketbatch
---

## Qué cambia

Normalmente, cada transacción de una cuenta debe llevar el valor exacto de `Sequence` que le toca, uno más que la última transacción aplicada, así que solo se puede firmar y enviar la siguiente en orden estricto. TicketBatch añade la transacción `TicketCreate`, que consume uno o varios números de secuencia consecutivos de la cuenta (entre 1 y 250 por llamada, limitado por `kMinValidCount`/`kMaxValidCount`) y crea un objeto `Ticket` por cada uno, identificado por su propio `TicketSequence`.

Una vez creado, un Ticket puede usarse en cualquier transacción posterior en lugar del `Sequence` normal: la transacción pone `TicketSequence` en vez de incrementar `Sequence`, y el Ticket se consume (se borra del ledger) al aplicarse. Esto desacopla el momento de "reservar hueco" del momento de "firmar y enviar la transacción concreta", permitiendo por ejemplo pre-firmar varias transacciones para ejecutarlas en un orden distinto al que tenían al firmarlas, o coordinar transacciones entre varias partes (como un `SignerListSet` multi-firma) sin bloquearse por la secuencia estricta de la cuenta.

## Transacciones y objetos afectados

- Nueva: [TicketCreate](/tx/TicketCreate).
- Objeto nuevo: [Ticket](/objects/Ticket), con el campo `TicketSequence`.
- Todas las transacciones pueden usar `TicketSequence` en lugar de `Sequence` para ejecutarse fuera de orden.

## Estado y contexto

Antes de TicketBatch, cualquier flujo que necesitara ejecutar transacciones en un orden distinto al de su creación (transacciones diferidas, cambios de lista de firmantes coordinados entre varias cuentas, o simplemente reservar un hueco para usarlo más tarde) tenía que gestionar manualmente el `Sequence` y arriesgarse a que una transacción intermedia rompiera el orden. Los Tickets resuelven esto separando "reservar el turno" de "usar el turno", y son especialmente útiles junto con listas de firmantes y transacciones multi-firma donde coordinar un `Sequence` exacto entre varios firmantes es poco práctico.
