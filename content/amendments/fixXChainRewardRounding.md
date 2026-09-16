---
title: fixXChainRewardRounding
summary: Corrige el redondeo al repartir la SignatureReward de un XChainBridge entre los witness que firman las attestations.
xrplDocs: https://xrpl.org/resources/known-amendments#fixxchainrewardrounding
---

## Qué cambia

Un [XChainBridge](/objects/Bridge) reparte su `SignatureReward` entre las cuentas witness que aportan attestations válidas para completar un cruce. El reparto se calcula dividiendo la recompensa total entre el número de firmantes que participaron; antes de este fix, esa división podía dejar restos sin asignar o distribuir cantidades ligeramente distintas de las esperadas debido a redondeos hacia abajo en aritmética entera.

Con fixXChainRewardRounding activo, el cálculo de la parte que corresponde a cada witness se corrige para que el redondeo sea consistente y la suma de las partes repartidas no se desvíe del total disponible en la cuenta del bridge (ni deje polvo residual bloqueado indefinidamente).

## Transacciones y objetos afectados

- [XChainCreateBridge](/tx/XChainCreateBridge) y [XChainModifyBridge](/tx/XChainModifyBridge): definen la `SignatureReward` a repartir.
- [XChainAddClaimAttestation](/tx/XChainAddClaimAttestation) y [XChainAddAccountCreateAttestation](/tx/XChainAddAccountCreateAttestation): disparan el reparto cuando se alcanza el quórum.
- [XChainCommit](/tx/XChainCommit), [XChainClaim](/tx/XChainClaim) y [XChainCreateClaimID](/tx/XChainCreateClaimID): parte del flujo de cruce cuyo pago final incluye este reparto.
- Objeto [Bridge](/objects/Bridge).

## Estado y contexto

Es un fix de precisión sobre el mecanismo de recompensas introducido por [XChainBridge](/amendments/XChainBridge). Sin el redondeo correcto, los witness podían recibir en conjunto algo menos de lo previsto por la `SignatureReward`, lo cual es un problema económico para quienes operan la infraestructura de puente entre XRPL y una cadena lateral o sidechain compatible con EVM.
