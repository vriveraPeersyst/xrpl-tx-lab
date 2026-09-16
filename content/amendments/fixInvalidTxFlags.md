---
title: fixInvalidTxFlags
summary: Obliga a validar los flags de las transacciones de Credential y de SignerListSet, rechazando combinaciones no definidas.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinvalidtxflags
---

## Qué cambia

Muchas transacciones de XRPL comprueban en `preflight` que el campo `Flags` no contenga bits fuera de los definidos para esa transacción, devolviendo `temINVALID_FLAG` si los hay. [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete) y [SignerListSet](/tx/SignerListSet) no aplicaban esa comprobación: su `getFlagsMask` devolvía `0` sin `fixInvalidTxFlags`, de modo que cualquier valor en `Flags` pasaba sin rechazo aunque no correspondiera a ningún flag válido de esas transacciones.

Con el amendment activo, `getFlagsMask` devuelve `tfUniversalMask` para esas cuatro transacciones, de forma que el motor de preflight común rechaza con `temINVALID_FLAG` cualquier bit de `Flags` que no esté entre los universales permitidos. Es una validación defensiva: cierra una vía por la que se podían enviar transacciones con flags mal formados o contradictorios sin que el servidor los detectara en la fase más temprana de comprobación.

## Transacciones y objetos afectados

- [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept), [CredentialDelete](/tx/CredentialDelete): validación de `Flags` en `preflight`.
- [SignerListSet](/tx/SignerListSet): misma validación de `Flags`.

## Estado y contexto

Se introdujo junto con el amendment [Credentials](/amendments/Credentials), del que corrige un descuido en la validación de flags de las nuevas transacciones de credenciales, aprovechando para cerrar el mismo hueco en `SignerListSet`. Sin este fix, un cliente podía construir una transacción con un `Flags` inválido y el nodo la aceptaría en lugar de rechazarla tempranamente con `temINVALID_FLAG`.
