---
title: fixCleanup3_2_0
summary: Agrupa en un único amendment el conjunto de correcciones de comportamiento acumuladas para la versión 3.2.0 de rippled.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_2_0
introducedIn: 3.2.0
---

## Qué cambia

En lugar de introducir un amendment independiente por cada corrección menor, rippled agrupa periódicamente varios arreglos no relacionados entre sí bajo un único amendment "de limpieza" por versión. `fixCleanup3_2_0` es la primera de esta serie y activa a la vez, entre otros: el nuevo límite de páginas de directorio ([DirectoryNode](/objects/DirectoryNode)), reglas de precisión en `Number` para vaults y préstamos (`MantissaScale::Large320`), el requisito de trustline con autorización para el emisor en [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), validaciones de `Channel`/`Amount` no nulos en [PaymentChannelClaim](/tx/PaymentChannelClaim) y [PaymentChannelFund](/tx/PaymentChannelFund), el rechazo de importes con formato inválido en `preflightUniversal` (`temBAD_AMOUNT`), y ajustes en el redondeo de calidad de [OfferCreate](/tx/OfferCreate), entre varios otros cambios en Vault, Lending, AMM y MPT.

## Transacciones y objetos afectados

Toca de forma transversal [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PaymentChannel](/objects/PaymentChannel), [Escrow](/objects/Escrow), [DirectoryNode](/objects/DirectoryNode), [OfferCreate](/tx/OfferCreate), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenCancelOffer](/tx/NFTokenCancelOffer), y los transactors de `LoanBroker*`, `VaultWithdraw`, `VaultDeposit` y `VaultCreate`.

## Estado y contexto

No corresponde a una única propuesta funcional sino a la práctica de rippled de empaquetar decenas de correcciones pequeñas, dispersas por muchos subsistemas, en un solo amendment por release para no saturar la lista de amendments votables. El código sigue comprobando `rules.enabled(fixCleanup3_2_0)` en cada punto concreto que corrige, por lo que el amendment funciona como paraguas: activarlo activa a la vez todas las correcciones incluidas en la versión 3.2.0.
