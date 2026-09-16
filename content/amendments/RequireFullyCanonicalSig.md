---
title: RequireFullyCanonicalSig
summary: Exige que las firmas ECDSA secp256k1 sean estrictamente canónicas, cerrando una vía de maleabilidad de transacciones.
xrplDocs: https://xrpl.org/resources/known-amendments#requirefullycanonicalsig
introducedIn: 0.30.1
---

## Qué cambia

Las firmas ECDSA sobre la curva secp256k1 (el esquema usado por defecto en XRPL antes de que Ed25519 estuviera disponible) tienen una propiedad de maleabilidad: para una misma firma válida `(r, s)`, el valor `(r, n - s)` (donde `n` es el orden de la curva) también es una firma válida sobre el mismo mensaje y la misma clave. Eso significa que un tercero, sin conocer la clave privada, puede tomar una transacción ya firmada y producir una variante con una firma distinta pero igualmente válida, cambiando el hash de la transacción sin invalidarla.

RequireFullyCanonicalSig obliga a que las firmas ECDSA presentadas sean "fully canonical": de las dos variantes matemáticamente válidas de cada firma, solo se acepta la que cumple `s <= n/2` (la de menor valor). El transactor rechaza en la validación de la transacción cualquier firma que no cumpla esta forma, aunque sea criptográficamente correcta. Las firmas Ed25519 no tienen este problema y no se ven afectadas.

## Transacciones y objetos afectados

- Afecta a la validación de firma de cualquier transacción firmada con una clave secp256k1 (prácticamente todos los tipos de transacción, ya que la comprobación ocurre en la capa común de verificación de firmas del motor de transacciones, no en un transactor concreto).
- No introduce ni modifica objetos del ledger.

## Estado y contexto

La maleabilidad de firmas fue un problema conocido en varios protocolos basados en ECDSA (Bitcoin lo resolvió con BIP-62/SegWit de forma análoga). En XRPL, aunque el identificador de secuencia y otros mecanismos ya mitigaban el doble gasto, una transacción con hash mutable complicaba a las aplicaciones que dependían de rastrear una transacción por su hash antes de que fuera validada (por ejemplo, para detectar si había sido incluida en un ledger). RequireFullyCanonicalSig elimina esa ambigüedad forzando una única representación válida por firma, de modo que el hash de una transacción firmada no pueda alterarse por un tercero sin invalidar la firma.
