---
title: fixEmptyDID
summary: Impide crear un objeto DID completamente vacío, sin URI, DIDDocument ni Data.
xrplDocs: https://xrpl.org/resources/known-amendments#fixemptydid
---

## Qué cambia

[DIDSet](/tx/DIDSet) crea o actualiza un objeto [DID](/objects/DID) copiando los campos opcionales `URI`, `DIDDocument` y `Data` que vengan presentes y no vacíos en la transacción. Antes de este fix, era posible enviar un `DIDSet` sin ninguno de esos tres campos (o con todos vacíos) para una cuenta que aún no tuviera DID, y el transactor creaba igualmente el objeto en el ledger, sin ningún dato útil dentro. Con `fixEmptyDID` activo, si tras aplicar los campos el `DID` resultante no tiene ni `URI`, ni `DIDDocument`, ni `Data`, la transacción falla con `tecEMPTY_DID` en lugar de crear el objeto vacío.

## Transacciones y objetos afectados

- [DIDSet](/tx/DIDSet): valida que el DID resultante tenga al menos uno de `URI`, `DIDDocument` o `Data`.
- [DID](/objects/DID): ya no puede existir como objeto vacío en el ledger.

## Estado y contexto

Un `DID` sin ningún campo de datos no tiene utilidad: el objeto existe solo para referenciar identidad o credenciales fuera de cadena, y sin `URI`/`DIDDocument`/`Data` no apunta a nada. Permitir crearlo vacío consumía reserva de owner sin aportar información y podía confundir a quien consultara el objeto esperando encontrar al menos un puntero a los datos. El fix cierra ese caso de borde devolviendo un código de error explícito, `tecEMPTY_DID`, en vez de aceptar la transacción silenciosamente.
