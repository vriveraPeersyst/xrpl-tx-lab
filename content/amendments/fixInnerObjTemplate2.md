---
title: fixInnerObjTemplate2
summary: Extiende a todos los objetos internos restantes la aplicación de su plantilla de campos al crearse.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinnerobjtemplate2
---

## Qué cambia

`fixInnerObjTemplate` ya había corregido la aplicación de plantillas a los objetos internos del slot de subasta de AMM, pero dejaba fuera al resto de objetos internos con plantilla registrada en `InnerObjectFormats` (por ejemplo `SignerEntry`, `Signer`, `Majority`, `DisabledValidator` o `NFToken`). En `STObject::makeInnerObject`, el código solo forzaba la plantilla cuando no había reglas de amendment disponibles o cuando el objeto era el de AMM; en el resto de casos, un objeto interno recién creado podía quedar sin sus campos por defecto (`SoeDefault`) fijados hasta que se le asignaran explícitamente.

Con `fixInnerObjTemplate2` activo, `makeInnerObject` aplica la plantilla correspondiente a cualquier objeto interno con formato registrado, no solo a los de AMM. Esto estandariza el comportamiento: todo objeto interno nace ya con sus campos obligatorios y por defecto correctamente inicializados según su `SOTemplate`, evitando estados intermedios inconsistentes que podían provocar excepciones al leer campos no fijados.

## Transacciones y objetos afectados

- Objetos internos definidos en `InnerObjectFormats`: `SignerEntry` en [SignerListSet](/tx/SignerListSet) y [SignerList](/objects/SignerList), `Majority` y `DisabledValidator` en el [Amendments](/objects/Amendments), `NFToken` en las páginas de NFT, y las entradas de atestación en los puentes cross-chain.

## Estado y contexto

Es el segundo de dos fixes consecutivos sobre el mismo problema estructural en `STObject`. Corrige un descuido de cobertura del primer fix: no todos los objetos internos recibían el mismo tratamiento. El amendment ya está retirado en el código; la aplicación universal de plantillas a objetos internos es hoy el comportamiento único.
