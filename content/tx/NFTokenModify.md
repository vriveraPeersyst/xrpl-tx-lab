---
title: NFTokenModify
summary: Cambia o borra la URI de un NFT acuñado con tfMutable; solo puede hacerlo su emisor o el minter autorizado.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenmodify
xls: XLS-0046
amendment: DynamicNFT
level: intermedio
---

## Qué hace

`NFTokenModify` actualiza el campo `URI` de un token que ya existe dentro de una [NFTokenPage](/objects/NFTokenPage). Es la única propiedad de un NFT que puede cambiar después de acuñarlo: el `NFTokenID` (y con él los flags, el emisor, el taxon y el `TransferFee`) es inmutable.

Solo funciona con tokens acuñados con el flag `tfMutable` (16), y solo puede enviarla el emisor codificado en el ID o la cuenta que ese emisor tenga en `NFTokenMinter`. El propietario actual del token no interviene ni firma nada; si no es el emisor, se le indica en `Owner`.

Lo introduce el amendment [DynamicNFT](/amendments/DynamicNFT), activo en testnet.

## Cuándo usarlo

- Metadatos que evolucionan: un personaje de juego que sube de nivel, un certificado que se renueva, una obra "viva".
- Migrar los metadatos de un servidor a otro (por ejemplo, de https a ipfs) sin reacuñar.
- Eliminar la URI por completo (omitiendo el campo) si los metadatos pasan a resolverse fuera de la cadena.

## Cómo funciona por dentro

**`NFTokenModify::preflight`**:
- `Owner` igual a `Account` → `temMALFORMED` (si el token es tuyo, omite `Owner`).
- `URI` presente pero vacía o de más de 256 bytes → `temMALFORMED`.

**`NFTokenModify::preclaim`**:
1. Determina el propietario: `Owner` si está, si no `Account`. Busca el token en sus páginas; si no está → `tecNO_ENTRY`.
2. El ID debe llevar `kFlagMutable` (`tfMutable`); si no → `tecNO_PERMISSION`.
3. Si el emisor codificado en el ID no es tu cuenta, lee el `AccountRoot` del emisor y exige que su `NFTokenMinter` sea tu cuenta; si no → `tecNO_PERMISSION`.

**`NFTokenModify::doApply`** llama a `nft::changeTokenURI` sobre las páginas del propietario con la `URI` de la tx. Si omites `URI`, el campo se elimina del token. No hay cambio de reserva ni de `OwnerCount`.

## Campos clave

- **NFTokenID** — el token a modificar. Debe tener el bit `tfMutable` en sus 16 bits de flags (el primer grupo de 4 hex del ID acabará en 1 en el nibble correspondiente).
- **Owner** — dueño actual si no eres tú. Obligatorio cuando el token ya se ha vendido o regalado.
- **URI** — nueva URI en hex (1-256 bytes). Si la omites, se borra la URI actual.

## Errores habituales

- **tecNO_PERMISSION** — el NFT no es mutable, o tú no eres su emisor ni el `NFTokenMinter` del emisor. Los tokens acuñados sin `tfMutable` nunca podrán modificarse.
- **tecNO_ENTRY** — el token no está en las páginas del `Owner` indicado (o has omitido `Owner` y ya no es tuyo).
- **temMALFORMED** — `URI` vacía o demasiado larga, o `Owner` igual a tu cuenta.
- **temDISABLED** — no ocurre en testnet, `DynamicNFT` está activo.

## Ejemplo

```json
{
  "TransactionType": "NFTokenModify",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenID": "0000000000000000000000000000000000000000000000000000000000000000",
  "URI": "68747470733A2F2F6578616D706C652E636F6D2F76322E6A736F6E"
}
```

La URI de ejemplo es `https://example.com/v2.json`. Si el token está en otra cuenta, añade `"Owner": "rYYYY_OTRA_CUENTA"`.

## Pruébalo en testnet

1. Acuña un NFT con [NFTokenMint](/tx/NFTokenMint) usando `Flags: 24` (`tfTransferable` + `tfMutable`) y una `URI` cualquiera.
2. Consulta `account_nfts` y copia el `NFTokenID`. Fíjate en la `URI` actual.
3. Carga el ejemplo con ese ID y envía. Vuelve a `account_nfts`: la `URI` ha cambiado y el `NFTokenID` es el mismo.
4. Envía de nuevo sin el campo `URI`: en `account_nfts` el token ya no tiene `URI`.
5. Acuña otro token con `Flags: 8` (sin `tfMutable`) e intenta modificarlo: obtendrás `tecNO_PERMISSION`.
6. Regala el token mutable a la otra cuenta (oferta de venta a 0 + aceptación) y modifícalo desde tu cuenta añadiendo `Owner`: sigue funcionando porque eres el emisor.

## Relacionado

- [NFTokenMint](/tx/NFTokenMint), [NFTokenBurn](/tx/NFTokenBurn)
- [NFTokenPage](/objects/NFTokenPage)
- [DynamicNFT](/amendments/DynamicNFT), [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1)
