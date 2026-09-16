---
title: DIDSet
summary: Crea o actualiza el identificador descentralizado (DID) de una cuenta.
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/didset
amendment: DID
level: básico
---

## Qué hace

`DIDSet` publica o actualiza el objeto [DID](/objects/DID) asociado a tu cuenta: como máximo uno por cuenta, con la forma `did:xrpl:1:<tu-dirección>`. Es la implementación en el XRPL del estándar W3C de identificadores descentralizados (DID): un identificador que tú controlas, sin depender de un registrador central, al que puedes anclar un documento DID, una URI a documentación externa o datos arbitrarios.

Piensa en él como una tarjeta de identidad mínima que vive en tu cuenta: no contiene por sí misma ninguna afirmación verificada (eso lo aportan las [Credential](/objects/Credential) del amendment [Credentials](/amendments/Credentials)), pero da una raíz estable a la que enlazar esa información. La primera vez que envías `DIDSet` crea el objeto; las siguientes lo actualizan campo a campo.

## Cuándo usarlo

- Publicar un documento DID completo (`DIDDocument`) siguiendo la especificación W3C, para que aplicaciones externas lo resuelvan.
- Apuntar con `URI` a un documento DID alojado fuera de cadena (IPFS, un servidor propio) en lugar de incrustarlo.
- Guardar `Data` arbitraria vinculada a tu identidad on-chain (atestaciones, metadatos de una organización).
- Sentar la base de identidad antes de emitir o recibir [Credential](/objects/Credential).

## Cómo funciona por dentro

**`DIDSet::preflight`** exige que al menos uno de `URI`, `DIDDocument` o `Data` esté presente; si ninguno lo está, `temEMPTY_DID`. Si los tres campos están presentes pero todos vacíos, también `temEMPTY_DID`. Cada campo tiene un límite de longitud propio; superarlo da `temMALFORMED`.

**`DIDSet::doApply`** distingue dos caminos. Si ya existe un `DID` para tu cuenta, lo actualiza: por cada campo (`URI`, `DIDDocument`, `Data`) que envíes vacío, lo elimina del objeto; si lo envías con contenido, lo sobrescribe; si no lo envías, lo deja tal cual estaba. Con [fixEmptyDID](/amendments/fixEmptyDID) activo, si la actualización resultante deja el objeto sin ningún campo, falla con `tecEMPTY_DID` en lugar de dejar un DID vacío en el ledger. Si no existía, crea el objeto: comprueba que tu cuenta tiene reserva suficiente para un objeto más (`tecINSUFFICIENT_RESERVE` si no), lo inserta en tu directorio de propietario y aumenta tu owner count en 1.

## Campos clave

- **DIDDocument** — hex del documento DID completo, siguiendo el formato W3C. Pensado para documentos pequeños; para documentos grandes usa `URI`.
- **URI** — hex de una dirección (IPFS, HTTPS...) donde se aloja el documento DID fuera de cadena.
- **Data** — hex libre para cualquier dato adicional que quieras asociar a tu identidad (atestaciones, metadatos).

Los tres son opcionales de forma individual, pero al menos uno debe tener contenido en cada `DIDSet` (ya sea al crear o, tras una actualización, en el resultado final).

## Errores habituales

- **temEMPTY_DID** — no incluiste ningún campo con contenido, o los tres van vacíos.
- **tecEMPTY_DID** — una actualización que borra todos los campos existentes dejaría el DID vacío; añade o mantén al menos uno.
- **temMALFORMED** — algún campo supera su longitud máxima.
- **tecINSUFFICIENT_RESERVE** — no te queda XRP por encima de la reserva para crear el objeto `DID` (solo aplica a la primera vez).
- **tecDIR_FULL** — tu directorio de propietario está al límite (muy raro en la práctica).

## Ejemplo

```json
{
  "TransactionType": "DIDSet",
  "Account": "rXXXX_TU_CUENTA",
  "URI": "697066733A2F2F6578616D706C65",
  "Data": "7B7D"
}
```

Crea (o actualiza) tu DID apuntando con `URI` a un recurso IPFS y con `Data` a un objeto JSON vacío de ejemplo.

## Pruébalo en testnet

1. Firma y envía el ejemplo tal cual.
2. Consulta `account_objects` con `type: "did"` en tu cuenta: verás el objeto `DID` con `URI` y `Data` decodificables desde hex.
3. Envía un segundo `DIDSet` cambiando solo `Data` (sin repetir `URI`): comprueba que `URI` se mantiene y `Data` se actualiza.
4. Envía un tercer `DIDSet` con `URI: ""` y sin los otros campos: si es el único campo presente en el objeto, fallará con `tecEMPTY_DID`.
5. Borra el objeto con [DIDDelete](/tx/DIDDelete) y confirma con `account_objects` que ya no aparece.

## Relacionado

- [DIDDelete](/tx/DIDDelete) — elimina el DID.
- [CredentialCreate](/tx/CredentialCreate) — añade afirmaciones verificables que pueden enlazarse a tu identidad.
- [AccountDelete](/tx/AccountDelete) — requiere borrar el DID antes de eliminar la cuenta.
- Objetos: [DID](/objects/DID).
- Amendments: [DID](/amendments/DID).
