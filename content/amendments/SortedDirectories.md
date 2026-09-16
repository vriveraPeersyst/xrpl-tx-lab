---
title: SortedDirectories
summary: Ordena de forma determinista las entradas dentro de cada página de una owner directory al insertarlas.
xrplDocs: https://xrpl.org/resources/known-amendments#sorteddirectories
---

## Qué cambia

Las owner directories (y otros directorios del ledger, como los de ofertas) se dividen en páginas cuando crecen; cada página es una lista de índices a otros objetos que pertenecen al mismo dueño. Antes de este amendment, una nueva entrada se insertaba simplemente al final de la página con espacio libre, sin ningún orden particular entre entradas. SortedDirectories cambia la lógica de inserción para que las entradas dentro de cada página queden ordenadas de forma determinista según su clave, en vez de por orden de llegada.

El cambio no toca el formato de los objetos ni introduce nuevos campos: es puramente un cambio en el algoritmo de inserción y búsqueda de `SLE::pointer` dentro de una `Directory`. No afecta a qué objetos puede poseer una cuenta ni a las reglas de negocio de ninguna transacción; solo determina en qué posición concreta de qué página acaba cada entrada del directorio, lo que hace el recorrido de directorios reproducible entre implementaciones.

## Transacciones y objetos afectados

- No introduce transacciones nuevas: afecta a cualquier transacción que añade o quita una entrada de un directorio de propietario, como [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet), [EscrowCreate](/tx/EscrowCreate), [CheckCreate](/tx/CheckCreate) o [NFTokenMint](/tx/NFTokenMint).
- Objetos: [DirectoryNode](/objects/DirectoryNode), la estructura de páginas donde se guardan los índices de los objetos que posee una cuenta.

## Estado y contexto

Al no depender del orden de inserción, el ordenamiento determinista hace que dos nodos que reconstruyan el mismo estado a partir de las mismas transacciones lleguen exactamente a la misma disposición interna de páginas, lo que simplifica la verificación de estado y evita divergencias sutiles causadas por el historial concreto de inserciones y borrados, en vez de por el contenido final del directorio.
