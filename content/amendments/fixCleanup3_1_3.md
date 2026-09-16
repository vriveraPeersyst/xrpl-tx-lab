---
title: fixCleanup3_1_3
summary: Amendment "paraguas" que agrupa en una sola activación un lote de pequeñas correcciones de bugs repartidas por varios subsistemas del ledger.
xrplDocs: https://xrpl.org/resources/known-amendments#fixcleanup3_1_3
introducedIn: 3.1.3
---

## Qué cambia

A diferencia de otros `fix*` que corrigen un único bug puntual, fixCleanup3_1_3 agrupa bajo un solo amendment varias correcciones pequeñas e independientes acumuladas para la versión 3.1.3 de rippled, en lugar de publicar un amendment separado por cada una. Entre las correcciones que gatea (`ctx.view.rules().enabled(fixCleanup3_1_3)` en el código):

- [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer): antes, aceptar una oferta caducada fallaba en `preclaim` con `tecEXPIRED`; con el fix, la oferta caducada se detecta y se borra del ledger en la propia transacción en vez de solo rechazarla.
- MPToken: ajusta cómo se agrega el `MaximumAmount` y cómo se comprueba el `LockedAmount` en las transferencias.
- [PermissionedDEX](/objects/Offer) (ofertas híbridas): la comprobación de oferta malformada pasa a rechazar también un dominio con tamaño `0`, no solo el que falta o supera 1.
- Vault ([VaultClawback](/tx/VaultClawback)): elimina un retorno temprano incorrecto cuando el importe a recuperar es cero.
- Lending ([LoanPay](/tx/LoanPay)): limita el número de incrementos de fee aplicables (`kMaxFeeIncrements`) y devuelve `tecNO_PERMISSION` en vez de `temINVALID_FLAG` en el caso correspondiente.
- Credentials y PermissionedDomain: ajustan el tratamiento de credenciales caducadas y de dominios permitidos.
- Varias invariant checks (`InvariantCheck`, `PermissionedDEXInvariant`, `PermissionedDomainInvariant`) se endurecen para detectar estos mismos estados corregidos.

## Transacciones y objetos afectados

Toca a [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), transacciones de MPToken, [VaultClawback](/tx/VaultClawback), [LoanPay](/tx/LoanPay), [PermissionedDomainSet](/tx/PermissionedDomainSet) y las transacciones de Credentials, además de las invariant checks que validan objetos como `MPToken`, `Vault`, `Loan`, `PermissionedDomain` y ofertas híbridas del `PermissionedDEX`.

## Estado y contexto

Es un amendment de "limpieza de versión": en vez de coordinar la votación de media docena de amendments diminutos por separado, rippled los empaqueta en uno solo asociado a su número de release (3.1.3). Su `VoteBehavior::DefaultYes` en `features.macro` refleja que se trata de correcciones de bajo riesgo pensadas para activarse rápido una vez validado el release.
