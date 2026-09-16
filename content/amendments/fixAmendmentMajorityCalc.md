---
title: fixAmendmentMajorityCalc
summary: Corrige el cálculo de la mayoría del 80 % en la votación de amendments, que podía aceptarse con algo menos del 80 %.
xrplDocs: https://xrpl.org/resources/known-amendments#fixamendmentmajoritycalc
introducedIn: 1.7.0
---

## Qué cambia

Un amendment se activa cuando al menos el 80 % de los validadores de confianza lo apoyan de forma continuada durante dos semanas. El código que decidía si se había alcanzado esa mayoría hacía la comparación con una división entera que redondeaba mal: con ciertos tamaños de UNL, bastaba un apoyo ligeramente inferior al 80 % (por ejemplo 79,9 %) para que el amendment obtuviera mayoría y, dos semanas después, se activara.

fixAmendmentMajorityCalc cambia la fórmula para que el umbral sea exactamente "al menos 80 %", sin margen por redondeo.

## Transacciones y objetos afectados

- [EnableAmendment](/tx/EnableAmendment): la pseudo-transacción que registra `tfGotMajority`, `tfLostMajority` y la activación final la emite el sistema en función de este cálculo.
- [Amendments](/objects/Amendments): el objeto singleton del ledger donde se apuntan las mayorías en curso (`Majorities`) y los amendments activos.

## Estado y contexto

Se introdujo en rippled 1.7.0 y está retirado en el código actual (`XRPL_RETIRE_FIX(AmendmentMajorityCalc)`). Es un fix de gobernanza: no toca transacciones de usuario, pero al alterar cuándo se activa cualquier otro amendment tenía que activarse él mismo por el mismo procedimiento para que todos los validadores usaran la misma regla a la vez. En la UI de esta web, el estado de votación que ves para cada amendment se calcula con esta regla corregida.
