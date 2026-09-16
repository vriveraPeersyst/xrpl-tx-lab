---
title: fixAMMv1_3
summary: Cambia el redondeo de los cálculos internos del AMM a "siempre hacia abajo", para que depósitos y retiros nunca beneficien al usuario a costa del pool.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_3
---

## Qué cambia

Los cálculos de LP tokens y de importes de activos en el AMM usan aritmética de precisión con un modo de redondeo configurable (`Number::RoundingMode`). Antes de este fix, ese redondeo podía seguir el modo global por defecto del proceso, lo que en ciertos cálculos de [AMMDeposit](/tx/AMMDeposit) y [AMMWithdraw](/tx/AMMWithdraw) podía redondear a favor del usuario y en contra del pool, permitiendo, con suficientes operaciones repetidas, extraer valor del AMM por acumulación de redondeos favorables.

Con fixAMMv1_3 activo, `AMMHelpers` fuerza `Number::RoundingMode::Downward` en los cálculos afectados: los LP tokens que se acreditan en un depósito y los importes de activos que se entregan en un retiro se redondean siempre hacia abajo. Si tras el ajuste un depósito o retiro resultaría en cero tokens o cero importe, la transacción se rechaza (por ejemplo con `tecAMM_INVALID_TOKENS`) en vez de completarse con un resultado nulo o negativo para el pool.

## Transacciones y objetos afectados

- [AMMDeposit](/tx/AMMDeposit) y [AMMWithdraw](/tx/AMMWithdraw): redondeo consistente hacia abajo de LP tokens e importes de activos.
- [AMM](/objects/AMM): su `LPTokenBalance` y los balances de los dos activos del pool quedan protegidos frente al drenaje por redondeo.

## Estado y contexto

Es una corrección de solidez económica del AMM: garantiza que el redondeo nunca trabaja a favor del usuario individual y en contra de los demás proveedores de liquidez del pool, cerrando una vía teórica de extracción de valor mediante operaciones repetidas de pequeño importe.
