---
title: fixAMMv1_1
summary: Corrige varios problemas de precisión y consistencia del AMM: redondeo del último proveedor de liquidez, importes negativos en accountSendIOU y calidad de las ofertas sintéticas frente al libro central.
xrplDocs: https://xrpl.org/resources/known-amendments#fixammv1_1
---

## Qué cambia

Agrupa varias correcciones sobre el AMM introducido por [AMM](/amendments/AMM). En [AMMWithdraw](/tx/AMMWithdraw), por redondeo acumulado el `LPTokenBalance` del objeto `AMM` podía no coincidir exactamente con el saldo real en la trustline del último proveedor de liquidez; con el fix activo, `verifyAndAdjustLPTokenBalance` compara ambos valores y ajusta el `LPTokenBalance` almacenado cuando la diferencia es pequeña, o rechaza el retiro con `tecAMM_INVALID_TOKENS` si es demasiado grande. También añade una comprobación defensiva que evita retirar más LP tokens de los que el pool tiene registrados (`tecINTERNAL` si ocurriera, algo que no debería suceder salvo error interno).

Además, `accountSendIOU` empieza a rechazar explícitamente con `tecINTERNAL` cualquier intento de mover un importe negativo o un MPT por esta vía pensada solo para IOU, cerrando una vía de estados inconsistentes. Por último, ajusta cómo se compara la calidad de la oferta sintética de un AMM frente a la mejor oferta del libro central en `BookStep`, para que la elección entre AMM y CLOB sea coherente en casos límite de `Quality` muy próxima.

## Transacciones y objetos afectados

- [AMMWithdraw](/tx/AMMWithdraw): ajuste del `LPTokenBalance` del último proveedor de liquidez.
- [Payment](/tx/Payment) y [OfferCreate](/tx/OfferCreate): comparación de calidad entre ofertas de AMM y del libro central durante el enrutamiento.
- [AMM](/objects/AMM): consistencia de su `LPTokenBalance`.

## Estado y contexto

Es un paquete de correcciones de precisión numérica sobre el AMM, detectadas tras el despliegue inicial del amendment [AMM](/amendments/AMM): sin ellas, operaciones de retiro en condiciones límite podían dejar el pool con un saldo de LP tokens ligeramente inconsistente o provocar decisiones de enrutamiento subóptimas frente al libro de órdenes.
