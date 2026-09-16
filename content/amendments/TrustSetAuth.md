---
title: TrustSetAuth
summary: Permite a un emisor exigir autorización explícita para cada trustline abierta hacia su token.
xrplDocs: https://xrpl.org/resources/known-amendments#trustsetauth
---

## Qué cambia

Introduce el flag `lsfRequireAuth` en `AccountRoot`, activable con `AccountSet` (`asfRequireAuth`). Cuando una cuenta emisora lo activa, cualquier trustline nueva que otra cuenta abra hacia su token nace sin autorizar por defecto: el emisor no puede recibir pagos en ese token a través de esa línea hasta que la autorice explícitamente. Para autorizarla, el propio emisor envía un `TrustSet` con el flag `tfSetAuth` sobre la trustline en cuestión, lo que marca la línea como autorizada (`lsfLowAuth`/`lsfHighAuth` según el lado) de forma permanente: una vez autorizada, no se puede desautorizar.

El código en `TrustSet::doApply` comprueba, cuando `bSetAuth` está presente, que la cuenta emisora tenga `lsfRequireAuth` activo antes de aceptar el flag; si no lo tiene, no tiene sentido autorizar nada porque las líneas ya nacen operativas. Esto le da a un emisor control total sobre quién puede sostener su token en el ledger, en vez de que cualquiera pueda simplemente crear una trustline y empezar a operar.

## Transacciones y objetos afectados

- [AccountSet](/tx/AccountSet): flag `asfRequireAuth` para activar `lsfRequireAuth`.
- [TrustSet](/tx/TrustSet): flag `tfSetAuth` para que el emisor autorice una línea concreta.
- [AccountRoot](/objects/AccountRoot): flag `lsfRequireAuth`.
- [RippleState](/objects/RippleState): flags `lsfLowAuth`/`lsfHighAuth` que marcan una línea como autorizada.

## Estado y contexto

Es uno de los amendments históricos del protocolo, pensado para emisores regulados o permisionados (por ejemplo, tokens que representan activos del mundo real) que necesitan aprobar individualmente a cada contraparte antes de que pueda mantener saldo en su token, en vez de operar en modo abierto donde cualquiera puede crear una trustline sin permiso previo. Es la base sobre la que amendments posteriores, como [DepositAuth](/amendments/DepositAuth) o [Credentials](/amendments/Credentials), construyen mecanismos de autorización más flexibles.
