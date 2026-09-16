---
title: fixMasterKeyAsRegularKey
summary: Prohíbe fijar la regular key de una cuenta igual a su propia master key, para evitar que la cuenta quede bloqueada.
xrplDocs: https://xrpl.org/resources/known-amendments#fixmasterkeyasregularkey
---

## Qué cambia

[SetRegularKey](/tx/SetRegularKey) permite asociar a una cuenta un par de claves alternativo (`RegularKey`) con el que firmar transacciones sin exponer la master key. Antes del fix, nada impedía que el valor de `RegularKey` coincidiera con el `AccountID` derivado de la propia master key de la cuenta. Si después esa cuenta desactivaba la master key con `AccountSet` (`lsfDisableMaster`) y no tenía una `SignerList` configurada, se quedaba sin ninguna clave utilizable: la master key estaba desactivada y la regular key "alternativa" era, en realidad, la misma clave inservible.

Con `fixMasterKeyAsRegularKey` activo, `SetRegularKey::preflight` rechaza con `temBAD_REGKEY` cualquier transacción cuyo campo `RegularKey` sea igual al `Account` (comparando el `AccountID`, que es como se deriva de la master key). Así se evita configurar de entrada una situación que podía bloquear (blackhole) la cuenta de forma no intencionada.

## Transacciones y objetos afectados

- [SetRegularKey](/tx/SetRegularKey): validación añadida en `preflight`.
- [AccountRoot](/objects/AccountRoot): protege indirectamente el campo `RegularKey` frente a esta configuración inválida.

## Estado y contexto

Cierra una vía de auto-bloqueo de cuenta no deseado: antes de este fix, un usuario podía inutilizar por error su propia cuenta combinando `SetRegularKey` con `RegularKey` igual a su dirección y un posterior `AccountSet` con `lsfDisableMaster`. El amendment está retirado en el código: la comprobación forma hoy parte permanente de `SetRegularKey`.
