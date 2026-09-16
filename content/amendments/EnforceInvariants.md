---
title: EnforceInvariants
summary: Activa las comprobaciones de invariantes del ledger tras aplicar cada transacción, rechazándola si deja el estado en un valor imposible.
xrplDocs: https://xrpl.org/resources/known-amendments#enforceinvariants
---

## Qué cambia

Rippled ejecuta, tras aplicar cada transacción, un conjunto de "invariant checks": reglas globales que nada debería poder violar, como que el XRP total no cambie salvo por quema de fees, que los balances de `AccountRoot` no se vuelvan negativos, o que las entradas de un directorio sigan siendo consistentes. Estas comprobaciones viven en `libxrpl/tx/invariants/` (por ejemplo `NFTInvariant`, `AMMInvariant`, `FreezeInvariant`) y se ejecutan desde `InvariantRunner`, que recorre cada entrada del ledger modificada y llama a `visitEntry` y `finalize` de cada checker registrado.

Antes de EnforceInvariants, un fallo de estas comprobaciones solo se registraba en el log del servidor sin bloquear la transacción. Con el amendment activo, si cualquier invariante falla, la transacción se rechaza con `tecINVARIANT_FAILED` (o `tefINVARIANT_FAILED` si el fallo ocurre en una comprobación que no debería depender del resultado de la transacción), y el ledger no aplica los cambios que la violaban. Es una red de seguridad a nivel de protocolo, independiente de la lógica de cada transactor.

## Transacciones y objetos afectados

Afecta transversalmente a toda transacción que modifique el ledger, no a una transacción concreta. Los checkers cubren objetos como [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [NFTokenPage](/objects/NFTokenPage), [AMM](/objects/AMM) y las estructuras de directorios que indexan esos objetos.

## Estado y contexto

Es la última línea de defensa contra bugs de implementación: aunque un transactor tenga un error de lógica, las invariant checks impiden que ese error se traduzca en un estado del ledger corrupto (XRP creado de la nada, balances negativos, referencias rotas). Al ser un amendment de tipo "feature" ya retirado (`XRPL_RETIRE_FEATURE` en `features.macro`), su comportamiento es hoy el único posible: las comprobaciones de invariantes están siempre activas en cualquier red XRPL moderna.
