---
title: NFTokenMint
summary: Acuña un NFToken nuevo en la cuenta que firma (o en nombre de un emisor que la haya autorizado) y, opcionalmente, publica en el mismo paso una oferta de venta.
category: nft
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/nftokenmint
xls: XLS-0020
amendment: NonFungibleTokensV1_1
level: básico
---

## Qué hace

`NFTokenMint` crea un token no fungible y lo guarda en una [NFTokenPage](/objects/NFTokenPage) del acuñador. El NFT no es un objeto del ledger independiente: es una entrada de 32 bytes de identificador (más la `URI` opcional) dentro de una página que agrupa hasta 32 tokens. Por eso la reserva se paga por página, no por token: solo cuando la acuñación obliga a abrir una página nueva sube el `OwnerCount`.

El `NFTokenID` que se genera codifica, en este orden: los flags (16 bits), el `TransferFee`, la cuenta emisora, el `NFTokenTaxon` cifrado con la secuencia y el número de secuencia del token del emisor. Eso hace que los flags y la comisión de reventa sean **inmutables** desde el momento de la acuñación.

Si la tx incluye `Amount` (y opcionalmente `Destination` y `Expiration`), además del token crea una [NFTokenOffer](/objects/NFTokenOffer) de venta en la misma transacción. Esto lo permite el amendment [NFTokenMintOffer](/amendments/NFTokenMintOffer), activo en testnet.

## Cuándo usarlo

- Emitir coleccionables, entradas, certificados o cualquier activo único.
- Acuñar en nombre de un tercero: el emisor te nombra `NFTokenMinter` con AccountSet y tú pones su cuenta en `Issuer`.
- Poner a la venta en el mismo paso con `Amount` para ahorrar una transacción.

## Cómo funciona por dentro

**`NFTokenMint::checkExtraFeatures`**: si envías `Amount`, `Destination` o `Expiration` y el amendment `NFTokenMintOffer` no estuviera activo, la tx se rechaza con `temDISABLED`. En testnet está activo.

**`NFTokenMint::getFlagsMask`**: el conjunto de flags admitido depende de dos amendments. Con [fixRemoveNFTokenAutoTrustLine](/amendments/fixRemoveNFTokenAutoTrustLine) activo (como en testnet) el flag `tfTrustLine` (4) queda prohibido; con [DynamicNFT](/amendments/DynamicNFT) activo se admite `tfMutable` (16). Un flag fuera de la máscara devuelve `temINVALID_FLAG`.

**`NFTokenMint::preflight`** (estático):
- `TransferFee` mayor que 50000 → `temBAD_NFTOKEN_TRANSFER_FEE`. Si es mayor que 0 sin `tfTransferable` → `temMALFORMED`.
- `Issuer` igual a `Account` → `temMALFORMED` (si acuñas para ti, simplemente omítelo).
- `URI` vacía o de más de 256 bytes → `temMALFORMED`.
- Si hay campos de oferta, `Amount` es obligatorio y se aplican las reglas de `nft::tokenOfferCreatePreflight`: importe no negativo, `Destination` distinta de tu cuenta, `Expiration` distinta de 0, y si el NFT lleva `tfOnlyXRP` el importe debe ser XRP.

**`NFTokenMint::preclaim`** (contra el ledger):
- Con `Issuer`: la cuenta emisora debe existir (`tecNO_ISSUER`) y su campo `NFTokenMinter` debe ser exactamente tu cuenta (`tecNO_PERMISSION`).
- Con `Amount`: una `Expiration` ya pasada devuelve `tecEXPIRED`; `nft::tokenOfferCreatePreclaim` comprueba además que el `Destination` exista y no tenga `lsfDisallowIncomingNFTokenOffer`, y que, si el precio es un token emitido con `TransferFee` > 0, el emisor del NFT tenga trust line con esa moneda.

**`NFTokenMint::doApply`**:
1. Toma el `AccountRoot` del emisor (tú o `Issuer`), inicializa `FirstNFTokenSequence` si es la primera acuñación y aumenta `MintedNFTokens`. Si el contador da la vuelta → `tecMAX_SEQUENCE_REACHED`.
2. Calcula el `NFTokenID` con `createNFTokenID` e inserta el token en tus páginas (`nft::insertToken`). Nota: el token siempre va a la cuenta que firma, aunque `Issuer` sea otra.
3. Si hay `Amount`, crea la oferta de venta con `nft::tokenOfferCreateApply` (exige reserva para un objeto más).
4. Si tu `OwnerCount` ha subido (nueva página), comprueba que el saldo previo a la fee cubra la reserva; si no, `tecINSUFFICIENT_RESERVE`.

## Campos clave

- **NFTokenTaxon** — número entero que agrupa tokens de una misma colección. Se guarda cifrado dentro del ID, pero `account_nfts` lo devuelve en claro.
- **TransferFee** — comisión de reventa en unidades de 0,001 % (500 = 0,5 %, máximo 50000 = 50 %). Solo tiene sentido con `tfTransferable` y solo se cobra en ventas con precio distinto de cero entre cuentas que no sean el emisor.
- **Issuer** — cuenta en cuyo nombre acuñas. Ella debe haberte designado con `NFTokenMinter`. El ID llevará su dirección, no la tuya.
- **URI** — hasta 256 bytes en hex. Suele apuntar a los metadatos (ipfs://, https://).
- **Amount / Destination / Expiration** — si los pones, la tx también crea una oferta de venta de ese token (ver [NFTokenCreateOffer](/tx/NFTokenCreateOffer)).

## Flags

- **tfBurnable** (1) — permite al emisor (o a su `NFTokenMinter`) quemar el token aunque ya no lo posea.
- **tfOnlyXRP** (2) — el token solo puede venderse por XRP, nunca por tokens emitidos.
- **tfTrustLine** (4) — obsoleto; con `fixRemoveNFTokenAutoTrustLine` activo devuelve `temINVALID_FLAG`.
- **tfTransferable** (8) — sin él, el token solo puede transferirse entre emisor y terceros, no entre terceros (ver `tefNFTOKEN_IS_NOT_TRANSFERABLE` en las ofertas).
- **tfMutable** (16) — la `URI` puede cambiarse después con [NFTokenModify](/tx/NFTokenModify). Requiere `DynamicNFT`.

## Errores habituales

- **temBAD_NFTOKEN_TRANSFER_FEE** — `TransferFee` > 50000.
- **temMALFORMED** — `TransferFee` sin `tfTransferable`, `Issuer` igual a `Account`, `URI` vacía o demasiado larga, o campos de oferta sin `Amount`.
- **temINVALID_FLAG** — has usado `tfTrustLine` o un bit fuera de la máscara.
- **tecNO_ISSUER** — la cuenta de `Issuer` no existe.
- **tecNO_PERMISSION** — `Issuer` existe pero no te ha nombrado `NFTokenMinter`.
- **tecINSUFFICIENT_RESERVE** — la acuñación abre una página nueva (o crea la oferta) y no te llega el saldo para la reserva.
- **tecEXPIRED** — has incluido `Amount` con una `Expiration` ya pasada.

## Ejemplo

```json
{
  "TransactionType": "NFTokenMint",
  "Account": "rXXXX_TU_CUENTA",
  "NFTokenTaxon": 0,
  "Flags": 8,
  "TransferFee": 500,
  "URI": "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E"
}
```

`Flags: 8` es `tfTransferable`; añade `+1` si quieres `tfBurnable` y `+16` si quieres poder cambiar la URI después.

## Pruébalo en testnet

1. Conecta tu cuenta y carga el ejemplo. Deja `TransferFee` en 500 y `Flags` en 8.
2. Firma y envía. El resultado debe ser `tesSUCCESS`.
3. Consulta `account_nfts` con tu cuenta: verás el token con su `NFTokenID`, `Issuer`, `NFTokenTaxon` en claro y la `URI`.
4. Consulta `account_objects` con `type: "nft_page"`: aparece la [NFTokenPage](/objects/NFTokenPage) que lo contiene. Fíjate en que `OwnerCount` en `account_info` ha subido en 1 solo si es tu primera página.
5. Repite el envío cambiando `Flags` a 12 (incluye `tfTrustLine`) y comprueba que el nodo rechaza con `temINVALID_FLAG`.
6. Prueba la variante con oferta: añade `"Amount": "1000000"` y consulta luego `nft_sell_offers` con el nuevo `NFTokenID`.

## Relacionado

- [NFTokenBurn](/tx/NFTokenBurn), [NFTokenCreateOffer](/tx/NFTokenCreateOffer), [NFTokenAcceptOffer](/tx/NFTokenAcceptOffer), [NFTokenModify](/tx/NFTokenModify)
- [AccountSet](/tx/AccountSet) para fijar `NFTokenMinter`
- [NFTokenPage](/objects/NFTokenPage), [NFTokenOffer](/objects/NFTokenOffer)
- [NonFungibleTokensV1_1](/amendments/NonFungibleTokensV1_1), [DynamicNFT](/amendments/DynamicNFT), [NFTokenMintOffer](/amendments/NFTokenMintOffer), [fixRemoveNFTokenAutoTrustLine](/amendments/fixRemoveNFTokenAutoTrustLine)
