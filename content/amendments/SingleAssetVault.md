---
title: SingleAssetVault
summary: Introduce el objeto Vault, un contenedor de un único activo (XRP, IOU o MPT) que emite shares tokenizadas a sus depositantes.
xls: XLS-0065
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0065-Vault
xrplDocs: https://xrpl.org/resources/known-amendments#singleassetvault
---

## Qué cambia

Añade el objeto `Vault` (`ltVAULT`), gestionado por seis transacciones nuevas: `VaultCreate`, `VaultSet`, `VaultDelete`, `VaultDeposit`, `VaultWithdraw` y `VaultClawback`. Un Vault guarda un único `Asset` (XRP, un IOU emitido o un MPT) y lleva la contabilidad en `AssetsTotal`, `AssetsAvailable`, `AssetsMaximum` y `LossUnrealized`. A cambio de depositar en el Vault, el depositante recibe "shares" representadas como un MPToken sobre el `ShareMPTID` del propio Vault: la fracción del pool que le corresponde, no una promesa contable aparte.

`VaultCreate` fija el activo subyacente, el `WithdrawalPolicy` (por ejemplo FIFO estricto o proporcional) y opcionalmente un `PermissionedDomainID` que restringe quién puede entrar como depositante. `VaultDeposit` acuña shares al depositar activos; `VaultWithdraw` las quema para retirar el activo proporcional, y puede requerir `CredentialIDs` si el Vault vive dentro de un dominio permisionado. `VaultClawback` deja al emisor del activo subyacente recuperar fondos de un depositante concreto, igual que `Clawback` sobre un IOU normal, pero descontando de sus shares. `VaultDelete` solo funciona cuando el Vault está vacío (`AssetsTotal` en cero).

El objeto no tiene `SharesTotal` propio: ese dato vive en `OutstandingAmount` de la propia MPTIssuance de las shares, evitando duplicar contabilidad entre dos objetos del ledger.

## Transacciones y objetos afectados

- Nuevas: [VaultCreate](/tx/VaultCreate), [VaultSet](/tx/VaultSet), [VaultDelete](/tx/VaultDelete), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw) y [VaultClawback](/tx/VaultClawback).
- Objeto nuevo: [Vault](/objects/Vault).
- Relacionadas: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate) y [MPTokenAuthorize](/tx/MPTokenAuthorize) para las shares; [TrustSet](/tx/TrustSet) y [Clawback](/tx/Clawback) comparten código con las trustlines del activo subyacente cuando es un IOU.

## Estado y contexto

SingleAssetVault es la pieza base sobre la que se construye el [LendingProtocol](/amendments/LendingProtocol): un Vault agrupa la liquidez que luego un LoanBroker presta, y las shares del Vault sirven de recibo tokenizado y transferible de la posición del depositante. Fuera del contexto de préstamos, también sirve como primitiva genérica de "pool de un solo activo con shares" para cualquier caso de tesorería compartida en el propio ledger, sin necesidad de un contrato externo.
