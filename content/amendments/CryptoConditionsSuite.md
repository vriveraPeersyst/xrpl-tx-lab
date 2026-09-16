---
title: CryptoConditionsSuite
summary: Amendment incompleto que iba a añadir más tipos de crypto-conditions a Escrow; el ID quedó reservado y no hace nada.
xrplDocs: https://xrpl.org/resources/known-amendments#cryptoconditionssuite
introducedIn: 0.60.0
---

## Qué cambia

Nada útil. La intención era soportar en `EscrowCreate` y `EscrowFinish` el resto de tipos de condición de la especificación de crypto-conditions (PREFIX-SHA-256, THRESHOLD-SHA-256, RSA-SHA-256, ED25519-SHA-256), además del PREIMAGE-SHA-256 que ya admite [Escrow](/amendments/Escrow). Sin embargo, el amendment se incluyó en rippled 0.60.0 antes de terminar la implementación, así que el código bajo su ID hace prácticamente nada.

Modificar ese código habría creado una divergencia con los nodos que ya llevaban la versión publicada, de modo que se decidió no tocarlo: si en el futuro se añaden más tipos de condición, tendrá que ser con un amendment nuevo y un ID distinto.

## Transacciones y objetos afectados

- Ninguna. Las condiciones criptográficas siguen limitadas a PREIMAGE-SHA-256 en [EscrowCreate](/tx/EscrowCreate) y [EscrowFinish](/tx/EscrowFinish) sobre el objeto [Escrow](/objects/Escrow).

## Estado y contexto

Es el ejemplo clásico de por qué un amendment debe estar terminado antes de publicarse: el ID de un amendment es el hash de su nombre, y el comportamiento que activa queda fijado en cuanto una versión de rippled lo distribuye. Está marcado como obsoleto en la documentación oficial y retirado en el código (`XRPL_RETIRE_FEATURE`). Véase también [CryptoConditions](/amendments/CryptoConditions).
