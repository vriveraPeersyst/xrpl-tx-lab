---
title: AMM
summary: Añade creadores de mercado automáticos (XLS-30) integrados con el DEX, con LP tokens, votación de comisión y subasta de descuento.
xls: XLS-0030
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0030-automated-market-maker
xrplDocs: https://xrpl.org/resources/known-amendments#amm
introducedIn: 1.12.0
---

## Qué cambia

Introduce los *Automated Market Makers* en el ledger. Cada par de activos (XRP o tokens emitidos) puede tener como máximo una instancia de AMM, que vive en una cuenta especial (pseudocuenta) sin claves y que custodia el pool. Quien deposita liquidez recibe *LP tokens* proporcionales a su aportación; con ellos participa en las comisiones de intercambio, vota la comisión del pool (`TradingFee`) y puede pujar por el *auction slot*, que da derecho a operar con comisión reducida durante un tiempo limitado.

El motor de pagos y el cruce de ofertas pasan a combinar ofertas del libro de órdenes y AMMs para obtener el mejor tipo de cambio, sin que el usuario tenga que elegir. Además, algunas transacciones no pueden tener como destino la cuenta de un AMM (por ejemplo, no se le puede enviar un cheque porque nunca podría cobrarlo).

## Transacciones y objetos afectados

- Nuevas: [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid) y [AMMDelete](/tx/AMMDelete).
- Modificadas: [Payment](/tx/Payment) y [OfferCreate](/tx/OfferCreate) usan los pools como fuente de liquidez; [CheckCreate](/tx/CheckCreate), [EscrowCreate](/tx/EscrowCreate) y [PaymentChannelCreate](/tx/PaymentChannelCreate) rechazan la cuenta del AMM como destino.
- Nuevo objeto [AMM](/objects/AMM) y nuevo campo `AMMID` en [AccountRoot](/objects/AccountRoot) que enlaza la pseudocuenta con su pool.
- Los LP tokens son tokens emitidos normales, así que aparecen como [RippleState](/objects/RippleState).

## Estado y contexto

El DEX original del XRPL solo tenía libro de órdenes, que exige creadores de mercado activos y deja pares con poca liquidez sin precio. La XLS-30 propuso un AMM de producto constante estilo Uniswap, pero integrado de forma nativa: el motor de pagos evalúa ofertas y AMM en cada paso y elige la mejor combinación. La subasta del *auction slot* y la votación de comisión son particularidades del diseño del XRPL pensadas para reducir la pérdida impermanente y devolver parte del arbitraje a los proveedores de liquidez.

Tras su activación se descubrieron varios problemas de redondeo y de casos límite que se corrigieron con los amendments `fixAMMv1_1`, `fixAMMv1_2`, `fixAMMv1_3` y `fixAMMOverflowOffer`. La compatibilidad con tokens con clawback llegó después con [AMMClawback](/amendments/AMMClawback).
