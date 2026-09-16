---
title: fixUniversalNumber
summary: Corrige la pérdida de precisión del tipo interno Number usado en los cálculos de la AMM y otras operaciones aritméticas del ledger.
xrplDocs: https://xrpl.org/resources/known-amendments#fixuniversalnumber
---

## Qué cambia

`Number` es el tipo interno que rippled usa para hacer aritmética de alta precisión (mantisa + exponente) en operaciones que no encajan bien en `STAmount`, como el cálculo de precios y proporciones de la AMM. Antes de este fix, ciertas operaciones de `Number` (multiplicaciones y divisiones encadenadas, conversiones entre representaciones) podían perder precisión o redondear de forma inconsistente, lo que se traducía en resultados ligeramente distintos según el camino de cálculo tomado.

Con fixUniversalNumber activo, la implementación de `Number` corrige esas rutas de cálculo para que el redondeo sea consistente y no se pierdan dígitos significativos en operaciones intermedias. El fix no cambia la interfaz pública del tipo, solo la exactitud de sus operaciones internas.

## Transacciones y objetos afectados

No introduce ni modifica transacciones u objetos directamente. Afecta a cualquier transacción cuyo cálculo pase por `Number`, principalmente las relacionadas con la [AMM](/amendments/AMM): [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMBid](/tx/AMMBid) y el cruce de ofertas contra un [AMM](/objects/AMM) dentro del motor [Flow](/amendments/Flow).

## Estado y contexto

Se propuso poco después de activarse la AMM, cuando el uso intensivo de `Number` en el cálculo de precios de pool reveló casos límite donde el redondeo no era el esperado. Al ser un fix de precisión interna, no cambia el formato de ninguna transacción: dos nodos con y sin el fix pueden llegar a resultados ligeramente distintos en los mismos cálculos de AMM, por eso necesita ser un amendment y no un simple parche de cliente.
