---
title: fixInnerObjTemplate
summary: Corrige la creación de objetos internos (STObject anidados) para que apliquen correctamente su plantilla de campos, en concreto en el slot de subasta de AMM.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinnerobjtemplate
---

## Qué cambia

Varios objetos del ledger contienen objetos internos anidados (`STObject` dentro de otro `STObject`), como `AuctionSlot` o `VoteEntry` en un [AMM](/objects/AMM), o `SignerEntry`, `Majority` y `DisabledValidator` en otros contextos. Cada uno de estos objetos internos tiene una plantilla (`SOTemplate`) que define qué campos son obligatorios, opcionales o llevan un valor por defecto.

Antes del fix, al construirse un objeto interno nuevo no siempre se le aplicaba su plantilla, lo que podía dejar sin fijar campos con valor por defecto — por ejemplo `sfTradingFee` o `sfDiscountedFee` en el slot de subasta de un AMM — y provocar errores al intentar leerlos. `fixInnerObjTemplate` añade un constructor de `STObject` que aplica la plantilla correspondiente (`STObject::makeInnerObject`) al crear estos objetos internos, asegurando que los campos con valor por defecto queden inicializados desde el principio.

Fue el primero de dos fixes sobre el mismo problema: `fixInnerObjTemplate2`, posterior, extiende la aplicación de plantillas al resto de objetos internos que quedaban fuera de este primer arreglo.

## Transacciones y objetos afectados

- [AMM](/objects/AMM): campos internos `AuctionSlot` y `VoteEntry`.
- Indirectamente cualquier transactor que construya o lea estos objetos internos, como las relacionadas con AMM.

## Estado y contexto

Es un fix puntual sobre `STObject`/`InnerObjectFormats`: no añade funcionalidad nueva, corrige que los objetos internos se comporten como su plantilla exige desde su creación, evitando estados inconsistentes o excepciones al acceder a campos con valor por defecto no inicializados. El amendment ya está retirado en el código (`XRPL_RETIRE_FIX`): el comportamiento corregido es hoy el único que existe, sin rama alternativa.
