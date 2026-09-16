---
title: PermissionedDomainDelete
summary: Elimina un dominio permisionado y libera la reserva de propietario que consumía.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/permissioneddomaindelete
amendment: PermissionedDomains
level: intermedio
---

## Qué hace

`PermissionedDomainDelete` borra un objeto [PermissionedDomain](/objects/PermissionedDomain) del ledger. Solo el propietario (`Owner`, quien lo creó con [PermissionedDomainSet](/tx/PermissionedDomainSet)) puede borrarlo. Al eliminarlo, cualquier oferta o pago que dependiera de ese `DomainID` deja de poder validarse contra él: cualquier `Offer` que quedara activa en ese dominio pierde su ámbito de acceso.

## Cuándo usarlo

- Retirar un dominio de acceso restringido que ya no necesitas mantener (por ejemplo, se cerró el programa que lo usaba).
- Limpiar dominios de prueba en testnet.
- Liberar la reserva de propietario que el objeto consumía.
- Sustituir un dominio por otro desde cero cuando cambian por completo los criterios de acceso, en vez de reescribir su `AcceptedCredentials` con [PermissionedDomainSet](/tx/PermissionedDomainSet).

## Cómo funciona por dentro

**`PermissionedDomainDelete::preflight`** exige que `DomainID` no sea el hash cero (`temMALFORMED` si lo es).

**`PermissionedDomainDelete::preclaim`** comprueba que el dominio existe (`tecNO_ENTRY` si no) y que tu cuenta coincide con el `Owner` guardado en el objeto (`tecNO_PERMISSION` si no eres tú).

**`PermissionedDomainDelete::doApply`** elimina el objeto del directorio de propietario, reduce tu `OwnerCount` en 1 y borra el objeto del ledger. Puede fallar con `tefBAD_LEDGER` si el directorio está en un estado interno inconsistente, algo que no debería ocurrir en condiciones normales.

## Campos clave

- **DomainID** — el hash de 256 bits que identifica el dominio, el mismo que devolvió `account_objects` al crearlo con `PermissionedDomainSet`.

## Errores habituales

- **tecNO_ENTRY** — no existe ningún dominio con ese `DomainID`.
- **tecNO_PERMISSION** — el dominio existe, pero no te pertenece.
- **temMALFORMED** — `DomainID` es el hash cero.

No hay comprobación de "dominio en uso": puedes borrar un `PermissionedDomain` aunque haya ofertas del DEX permisionado que lo referencien; esas ofertas simplemente dejan de encontrar un dominio válido al evaluarse.

## Ejemplo

```json
{
  "TransactionType": "PermissionedDomainDelete",
  "Account": "rXXXX_TU_CUENTA",
  "DomainID": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

Sustituye el `DomainID` por el de un dominio real que tu cuenta haya creado; el valor de ejemplo es solo un marcador de posición.

## Pruébalo en testnet

1. Crea un dominio con [PermissionedDomainSet](/tx/PermissionedDomainSet) si no tienes uno.
2. Copia el `DomainID` que devuelve `account_objects` (`type: "permissioned_domain"`).
3. Firma y envía `PermissionedDomainDelete` con ese `DomainID`.
4. Repite `account_objects`: el dominio ya no aparece y tu `OwnerCount` en `account_info` ha bajado en uno.
5. Intenta borrarlo de nuevo: recibirás `tecNO_ENTRY`.

## Relacionado

- [PermissionedDomainSet](/tx/PermissionedDomainSet) — lo crea o modifica.
- [CredentialDelete](/tx/CredentialDelete) — retira las credenciales que daban acceso.
- Objetos: [PermissionedDomain](/objects/PermissionedDomain).
- Amendments: [PermissionedDomains](/amendments/PermissionedDomains).
