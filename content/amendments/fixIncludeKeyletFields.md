---
title: fixIncludeKeyletFields
summary: Guarda el Sequence de la transacción creadora dentro de varios objetos del ledger, para poder recalcular su keylet sin datos externos.
xrplDocs: https://xrpl.org/resources/known-amendments#fixincludekeyletfields
---

## Qué cambia

Objetos como [PayChannel](/objects/PayChannel), [Escrow](/objects/Escrow), [SignerList](/objects/SignerList) o los resultados de [OracleSet](/tx/OracleSet) se identifican mediante un keylet derivado, entre otros datos, de la cuenta y del `Sequence` (o `Ticket`) de la transacción que los creó. Antes de este fix, ese `Sequence` no quedaba almacenado en el propio objeto: para volver a derivar su keylet había que conocer aparte el número de secuencia original, algo que no siempre está disponible solo con el objeto en mano (por ejemplo al reconstruirlo desde un snapshot o desde metadata). Con `fixIncludeKeyletFields` activo, [PaymentChannelCreate](/tx/PaymentChannelCreate), [EscrowCreate](/tx/EscrowCreate), [SignerListSet](/tx/SignerListSet) y [OracleSet](/tx/OracleSet) escriben el campo `Sequence` dentro del objeto creado.

## Transacciones y objetos afectados

- [PayChannel](/objects/PayChannel), [Escrow](/objects/Escrow), [SignerList](/objects/SignerList) y el objeto Oracle: ganan el campo `Sequence`.
- [PaymentChannelCreate](/tx/PaymentChannelCreate), [EscrowCreate](/tx/EscrowCreate), [SignerListSet](/tx/SignerListSet), [OracleSet](/tx/OracleSet): escriben ese campo al crear el objeto.

## Estado y contexto

Sin el `Sequence` guardado en el objeto, cualquier herramienta o servicio que necesite reconstruir el keylet de uno de estos objetos a partir únicamente de su representación en el ledger (sin acceso al historial de transacciones) no podía hacerlo. Este fix hace que los objetos sean autocontenidos respecto a su propio keylet, simplificando indexadores, clientes ligeros y herramientas de auditoría que trabajan solo con el estado del ledger.
