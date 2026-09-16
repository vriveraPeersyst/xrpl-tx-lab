---
title: MultiSign
summary: Introduce la firma múltiple de transacciones mediante SignerListSet, el objeto SignerList y el campo Signers.
xrplDocs: https://xrpl.org/resources/known-amendments#multisign
---

## Qué cambia

Antes de MultiSign, una cuenta de XRPL solo podía autorizar transacciones con su master key o su regular key: una única firma, de una única clave. MultiSign añade una alternativa: una cuenta puede definir una lista de firmantes autorizados con `SignerListSet`, que crea un objeto `SignerList` con hasta 8 entradas (`SignerEntries`), cada una con la dirección de un firmante y un peso (`SignerWeight`), más un `SignerQuorum` mínimo que hay que alcanzar sumando pesos para que el conjunto de firmas sea válido.

Con una `SignerList` configurada, cualquier transacción puede omitir la firma única habitual y en su lugar rellenar el campo `Signers`: un array de pares clave/firma, uno por cada firmante que participa, ordenados por dirección. rippled sólo acepta la transacción si la suma de los pesos de las claves que firmaron correctamente alcanza el `SignerQuorum`. Esto permite exigir "2 de 3" administradores, dar más peso a unas claves que a otras, o delegar la operación diaria en claves de menor confianza sin exponer la master key.

## Transacciones y objetos afectados

- Nueva: [SignerListSet](/tx/SignerListSet), para crear, modificar o borrar la lista de firmantes de una cuenta.
- Objeto nuevo: [SignerList](/objects/SignerList).
- Campo `Signers` disponible en el common fields de cualquier transacción, como alternativa a la firma única.

## Estado y contexto

Fue uno de los primeros amendments de rippled y resuelve un problema básico de custodia: sin firma múltiple, cualquier operación (por ejemplo, la tesorería de un exchange) depende de una sola clave privada como punto único de fallo. MultiSign es el amendment precursor sobre el que se construyeron mejoras posteriores como `ExpandedSignerList` (subir el límite de 8 a 32 firmantes) y `MultiSignReserve` (eliminar la reserva por entrada de la lista), ambas ya retiradas por antigüedad igual que MultiSign.
