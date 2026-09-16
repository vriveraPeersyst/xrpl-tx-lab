---
title: fixAMMClawbackRounding
summary: Corrige el redondeo del retiro proporcional de un pool AMM al hacer clawback de los LP tokens de un holder congelado.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammclawbackrounding
---

## Qué cambia

[AMMClawback](/tx/AMMClawback) permite a un emisor con `lsfAllowTrustLineClawback` recuperar los LP tokens de un holder y retirarle su parte proporcional del pool. Antes de este fix, el cálculo de esa parte proporcional podía arrastrar errores de redondeo que dejaban al `AMM` con un `LPTokenBalance` inconsistente respecto a la suma real de los saldos de los LP restantes, sobre todo cuando el holder afectado era el único proveedor de liquidez o quedaba con un saldo residual mínimo.

Con el amendment activo, `AMMClawback::preclaim` calcula el `lpTokenBalance` real del holder dentro de la propia rama del amendment y llama a `verifyAndAdjustLPTokenBalance`, que compara ese saldo con el `LPTokenBalance` del objeto `AMM` y lo ajusta si la diferencia es pequeña (dentro de una distancia relativa de `10^-3`), o rechaza con `tecAMM_INVALID_TOKENS` si la discrepancia es demasiado grande. En el retiro final, `getRoundedLPTokens` redondea explícitamente los tokens a retirar y ajusta la fracción retirada (`adjustFracByTokens`) antes de calcular los importes de cada activo.

## Transacciones y objetos afectados

- [AMMClawback](/tx/AMMClawback): recalcula y ajusta el `LPTokenBalance` antes de ejecutar el retiro.
- [AMM](/objects/AMM): su `LPTokenBalance` queda corregido para reflejar el saldo real tras el clawback.

## Estado y contexto

Es una corrección puntual de precisión numérica en el motor de AMM: sin ella, un clawback repetido o con saldos residuales muy pequeños podía dejar el pool con un `LPTokenBalance` que no cuadraba con los tokens realmente en circulación, un estado que las invariant checks del AMM podían llegar a rechazar.
