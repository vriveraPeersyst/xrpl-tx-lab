---
title: MPTokensV1
summary: Introduce los Multi-Purpose Tokens (MPT), un tipo de activo emitido nativo más simple y barato que las trustlines de IOU clásicas.
xls: XLS-0033
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0033-multi-purpose-tokens
xrplDocs: https://xrpl.org/resources/known-amendments#mptokensv1
---

## Qué cambia

Hasta este amendment, emitir un token en XRPL significaba usar el sistema de IOUs sobre trustlines: cada holder necesita una [RippleState](/objects/RippleState) por cada emisor y moneda, con su propia reserva, y el emisor no tiene forma nativa de imponer límites de circulación o metadatos estructurados. MPTokensV1 añade un modelo de activo distinto y más simple: el emisor crea una emisión con `MPTokenIssuanceCreate`, que produce un objeto `MPTokenIssuance` con un `AssetScale` (decimales), un `MaximumAmount` opcional de circulación y flags como `lsfMPTCanTransfer`, `lsfMPTCanEscrow`, `lsfMPTCanLock` o `lsfMPTRequireAuth` que definen qué puede hacer un holder con el token. El emisor puede destruirla con `MPTokenIssuanceDestroy` si no queda circulación, y ajustar ciertos flags después con `MPTokenIssuanceSet`.

Un holder que quiere tener el token necesita una línea de opt-in propia, el objeto `MPToken`, que crea o cierra con `MPTokenAuthorize`; si la emisión exige autorización (`lsfMPTRequireAuth`), el emisor debe aprobar esa línea explícitamente, igual que ocurre con `RequireAuth` en trustlines. A diferencia de una trustline, un `MPToken` no tiene saldo negativo ni concepto de "quality": es un simple saldo con tope.

`MPTokenMetadata`, un campo binario libre en la emisión, permite adjuntar información legible por aplicaciones (nombre, ícono, enlaces) sin depender de un registro externo.

## Transacciones y objetos afectados

- Nuevas: `MPTokenIssuanceCreate`, `MPTokenIssuanceDestroy`, `MPTokenIssuanceSet`, `MPTokenAuthorize`.
- Objetos nuevos: `MPTokenIssuance` y `MPToken`.
- Modificada: [Payment](/tx/Payment), que puede mover MPT indicando el `MPTokenIssuanceID` en el `Amount`.

## Estado y contexto

MPTokensV1 nace como alternativa ligera a las trustlines de IOU para casos de uso que no necesitan toda su flexibilidad (rutas de pago cruzadas, múltiples emisores del "mismo" código de moneda): tokens de puntos, acciones tokenizadas, stablecoins simples. Sienta la base de mejoras posteriores como `fixMPTDeliveredAmount`, `DynamicMPT` (cambiar parámetros tras la emisión) y la todavía no soportada `MPTokensV2`; también es un requisito de infraestructura para [SingleAssetVault](/amendments/SingleAssetVault) y el [protocolo de préstamos](/amendments/LendingProtocol), que usan MPT como representación de las participaciones en una vault.
