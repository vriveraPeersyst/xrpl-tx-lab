---
title: LendingProtocolV1_1
summary: Activa las transacciones concretas del protocolo de préstamos de XRPL, LoanBroker y Loan, sobre la base sentada por LendingProtocol y SingleAssetVault.
xrplDocs: https://xrpl.org/resources/known-amendments#lendingprotocolv1_1
---

## Qué cambia

Mientras que [LendingProtocol](/amendments/LendingProtocol) solo preparaba el terreno interno (redondeo e invariantes), LendingProtocolV1_1 es el amendment que realmente habilita las transacciones de préstamo. Con él, cualquier cuenta puede crear un `LoanBroker` sobre una [Vault](/objects/Vault) existente: el LoanBroker es la entidad que gestiona los préstamos concedidos con la liquidez de esa vault y necesita un colchón de capital propio, el "First Loss Capital", que su operador deposita y del que responde primero si un préstamo entra en impago.

Sobre un LoanBroker ya creado, la transacción `LoanSet` crea (o actualiza) un `Loan` concreto: un préstamo con su principal, condiciones de interés y calendario de repago contra la liquidez de la vault subyacente. `LoanDelete` cierra un préstamo saldado. El operador del broker gestiona su colchón de capital con `LoanBrokerCoverDeposit`, `LoanBrokerCoverWithdraw` y `LoanBrokerCoverClawback` (esta última permite al emisor del activo recuperar capital del colchón, igual que un [Clawback](/tx/Clawback) normal), y puede retirar el broker entero con `LoanBrokerDelete` cuando ya no tiene préstamos ni capital pendientes.

## Transacciones y objetos afectados

- Nuevas: `LoanBrokerSet`, `LoanBrokerDelete`, `LoanBrokerCoverDeposit`, `LoanBrokerCoverWithdraw`, `LoanBrokerCoverClawback`, `LoanSet` y `LoanDelete`.
- Objetos nuevos: `LoanBroker` y `Loan`.
- Relacionadas: [VaultCreate](/tx/VaultCreate), [VaultDeposit](/tx/VaultDeposit) y [VaultWithdraw](/tx/VaultWithdraw), que proveen la liquidez que el LoanBroker presta; también puede usar [Credential](/objects/Credential) y [PermissionedDomains](/amendments/PermissionedDomains) para restringir quién puede pedir un préstamo.

## Estado y contexto

Es la primera versión funcional del protocolo de préstamos nativo de XRPL: lleva a la capa base del ledger un mecanismo de crédito con colateral y gestión de impagos, algo hasta ahora reservado a protocolos de préstamo construidos sobre EVM o sidechains. `LendingProtocolV1_2`, aún en desarrollo, es la siguiente iteración prevista sobre este diseño.
