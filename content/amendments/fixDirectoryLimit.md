---
title: fixDirectoryLimit
summary: Elimina el límite artificial de 262144 páginas en los directorios del ledger.
xrplDocs: https://xrpl.org/resources/known-amendments#fixdirectorylimit
---

## Qué cambia

Cada [DirectoryNode](/objects/DirectoryNode) (owner directory o book directory) enlaza sus páginas mediante `sfIndexNext`/`sfIndexPrevious`, usando un contador de página de 64 bits. Antes de este fix, `dirAdd` comprobaba además una constante independiente, `kDirNodeMaxPages` (262144), y se negaba a crear una página nueva por encima de ese número aunque el tipo de dato pudiera representar muchas más. Con `fixDirectoryLimit` activo, esa comprobación adicional desaparece: el único límite real pasa a ser el desbordamiento del propio contador de página (`page == 0` tras incrementar), muy por encima del límite anterior.

## Transacciones y objetos afectados

- [DirectoryNode](/objects/DirectoryNode): elimina el tope artificial de páginas encadenadas.
- Indirectamente, cualquier transacción que añade entradas a un directorio de propietario u order book, como [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet) o [NFTokenMint](/tx/NFTokenMint), que antes podían fallar con `tecDIR_FULL` al alcanzar el límite de páginas de una cuenta o un book con muchísimas entradas.

## Estado y contexto

El límite de 262144 páginas (con 32 entradas por página, unos 8,4 millones de objetos por directorio) era un valor conservador fijado hace años que en la práctica nunca debería alcanzarse por una sola cuenta, pero sí podía convertirse en un problema para libros de órdenes o directorios de owner con un volumen de entradas muy elevado, provocando fallos `tecDIR_FULL` evitables. El fix retira esa cota defensiva obsoleta y deja que el propio tipo de dato del contador de página sea el límite.
