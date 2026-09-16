---
title: XChainBridge
summary: Introduce el puente entre cadenas (sidechains), gestionado por un conjunto de witness servers que atestiguan eventos en la cadena de origen.
xls: XLS-0038
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0038-XChainBridge
xrplDocs: https://xrpl.org/resources/known-amendments#xchainbridge
---

## Qué cambia

Añade el objeto `Bridge` (`ltBRIDGE`), que define un puente entre dos cadenas (por ejemplo XRPL mainnet y una sidechain), con una `SignatureReward` que se reparte entre los witness servers y un `MinAccountCreateAmount` opcional para crear cuentas nuevas del otro lado. `XChainCreateBridge` crea el objeto; `XChainModifyBridge` cambia sus parámetros.

El flujo de un cruce normal usa `XChainCreateClaimID`, que crea un `XChainOwnedClaimID` en la cadena de destino para reclamar un depósito concreto, y `XChainCommit`, que bloquea los fondos en la cadena de origen referenciando ese `XChainClaimID`. Un conjunto de witness servers observa la cadena de origen y firma atestiguados con `XChainAddClaimAttestation`, que se van acumulando en el `XChainOwnedClaimID` hasta reunir suficientes firmas según el quórum del puente; entonces `XChainClaim` libera los fondos en destino. Para crear una cuenta nueva directamente vía puente (sin que exista todavía en destino) se usa `XChainAccountCreateCommit` junto con `XChainAddAccountCreateAttestation`, acumulados en un `XChainOwnedCreateAccountClaimID`.

Los witness servers no son parte del consenso de XRPL: son un componente externo que cada operador de puente ejecuta, y su firma colectiva es lo que autoriza el movimiento de fondos entre las dos cadenas. El amendment solo define el mecanismo en el ledger (objetos y transacciones); la seguridad del puente depende de la honestidad del conjunto de witnesses configurado.

## Transacciones y objetos afectados

- Nuevas: [XChainCreateBridge](/tx/XChainCreateBridge), [XChainModifyBridge](/tx/XChainModifyBridge), [XChainCreateClaimID](/tx/XChainCreateClaimID), [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim), [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation), [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit) y [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation).
- Objetos nuevos: [Bridge](/objects/Bridge), [XChainOwnedClaimID](/objects/XChainOwnedClaimID) y [XChainOwnedCreateAccountClaimID](/objects/XChainOwnedCreateAccountClaimID).

## Estado y contexto

XChainBridge da a XRPL un mecanismo nativo para mover XRP o tokens emitidos entre XRPL mainnet y una sidechain (o entre dos sidechains), sin depender de un puente externo genérico. Es la base de proyectos como las sidechains EVM de XRPL, donde los witness servers vigilan ambas cadenas y coordinan el bloqueo en una y la liberación en la otra.
