---
title: DynamicMPT
summary: Hace mutables por defecto los metadatos, la comisión de transferencia y los flags de capacidad de un MPT, salvo los que el emisor declare inmutables.
xls: XLS-0094
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0094-dynamic-MPT
xrplDocs: https://xrpl.org/resources/known-amendments#dynamicmpt
introducedIn: 3.3.0
---

## Qué cambia

Con [MPTokensV1](/amendments/MPTokensV1) una emisión de MPT quedaba fijada en el momento de crearla: `MPTokenMetadata`, `TransferFee` y los flags de capacidad (`CanLock`, `RequireAuth`, `CanEscrow`, `CanTrade`, `CanTransfer`, `CanClawback`) no se podían cambiar. DynamicMPT invierte el criterio: todo eso pasa a ser modificable con `MPTokenIssuanceSet`, salvo lo que el emisor bloquee explícitamente en el nuevo campo `ImmutableFlags` al crear la emisión.

`MPTokenIssuanceSet` gana los flags `tfMPTSetCanLock`/`tfMPTClearCanLock` y equivalentes para cada capacidad, más la posibilidad de enviar `MPTokenMetadata` y `TransferFee` nuevos. Reglas de `preflight`: una transacción no puede mezclar mutación con lock/unlock, no puede llevar `Holder` cuando muta la emisión, y sin el amendment cualquier mutación devuelve `temDISABLED`. Intentar cambiar un campo declarado inmutable falla con `tecNO_PERMISSION`. Sin el amendment, `ImmutableFlags` en `MPTokenIssuanceCreate` es un campo desconocido y la transacción no pasa.

## Transacciones y objetos afectados

- Modificadas: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) (campo `ImmutableFlags`) y [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) (flags de mutación y campos editables).
- Objetos: [MPTokenIssuance](/objects/MPTokenIssuance).

## Estado y contexto

Los emisores institucionales pedían poder corregir metadatos (por ejemplo, un enlace a documentación legal) o ajustar comisiones sin destruir y reemitir el token, algo imposible cuando ya circula. Al mismo tiempo, los titulares necesitan garantías de que ciertas propiedades no cambiarán. La XLS-94 combina ambas cosas: mutable por defecto, con un compromiso irreversible por propiedad. Convive con [ConfidentialTransfer](/amendments/ConfidentialTransfer), cuyo flag `CanHoldConfidentialBalance` también puede fijarse como inmutable.
