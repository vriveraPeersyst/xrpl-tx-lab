---
title: LedgerStateFix
summary: Transacción de mantenimiento que repara estructuras dañadas del ledger (páginas NFT o directorios de libro) a cambio de una fee de un owner reserve.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ledgerstatefix
amendment: fixNFTokenPageLinks
level: avanzado
---

## Qué hace

`LedgerStateFix` es una herramienta de reparación, no una operación de negocio. Cuando un bug histórico deja una estructura del ledger en un estado inconsistente, esta transacción permite que cualquier cuenta pague por repararla. No mueve fondos ni crea objetos: corrige enlaces o campos ya existentes.

Hoy admite dos tipos de arreglo (`LedgerFixType`):

- **1 – NfTokenPageLink**: repara los enlaces entre las páginas [NFTokenPage](/objects/NFTokenPage) de una cuenta (`Owner`). Lo introdujo [fixNFTokenPageLinks](/amendments/fixNFTokenPageLinks) para corregir directorios de NFT rotos por un fallo antiguo en la división de páginas.
- **2 – BookExchangeRate**: recalcula el campo `ExchangeRate` de la primera página de un directorio de libro de ofertas (`BookDirectory`) cuando no coincide con la calidad codificada en su propia clave. Lo añadió [fixCleanup3_2_0](/amendments/fixCleanup3_2_0).

Cualquiera puede enviarla: no hace falta ser el dueño de la estructura.

## Cuándo usarlo

- Una cuenta no puede acuñar, transferir o quemar NFT porque sus páginas están mal enlazadas (errores `tecINTERNAL` o `tefBAD_LEDGER` inexplicables en operaciones NFT).
- Un libro de ofertas devuelve resultados incoherentes por un `ExchangeRate` mal grabado.
- Como operador o desarrollador de herramientas, para dejar el ledger de testnet en un estado sano tras reproducir un bug.

En la práctica es muy raro necesitarla; en una testnet con los fixes activos, lo normal es que no haya nada que reparar.

## Cómo funciona por dentro

`LedgerStateFix::preflight` mira `LedgerFixType`: el tipo 1 siempre se admite; el tipo 2 exige que [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) esté activo (si no, `temDISABLED`, aunque en testnet sí lo está); cualquier otro valor devuelve `tefINVALID_LEDGER_FIX_TYPE`. Después comprueba que la transacción lleva exactamente el campo que corresponde a su tipo (`Owner` para el 1, `BookDirectory` para el 2) y ninguno del otro; si no, `temINVALID`. La tabla `kLedgerFixFields` es la que asocia cada tipo con su campo. Fíjate en que el código actual ya no consulta `fixNFTokenPageLinks`: el amendment está integrado.

`LedgerStateFix::calculateBaseFee` devuelve `calculateOwnerReserveFee`: la fee mínima es un owner reserve completo (0,2 XRP en testnet), igual que en [AccountDelete](/tx/AccountDelete). Es deliberado: desincentiva el spam de una transacción que recorre estructuras potencialmente grandes.

`LedgerStateFix::preclaim` valida contra el ledger. Para el tipo 1, el `Owner` debe existir como cuenta (`tecOBJECT_NOT_FOUND`). Para el tipo 2, `BookDirectory` debe ser un `DirectoryNode` existente (`tecOBJECT_NOT_FOUND`), debe ser la primera página del libro (la que tiene `ExchangeRate`; si no, `tecNO_PERMISSION`) y su `ExchangeRate` debe estar realmente mal: si ya coincide con `getQuality(key)`, también `tecNO_PERMISSION`. Es decir, no puedes pagar por "reparar" algo sano.

`LedgerStateFix::doApply` ejecuta el arreglo. Tipo 1: llama a `nft::repairNFTokenDirectoryLinks` sobre el `Owner`; si no logra reparar nada devuelve `tecFAILED_PROCESSING` (y cobra la fee). Tipo 2: escribe `ExchangeRate = getQuality(key)` en la página y la actualiza.

La transacción es delegable (`delegable: true` en protocol.json).

## Campos clave

- **LedgerFixType** — 1 (`NfTokenPageLink`) o 2 (`BookExchangeRate`). Determina qué otro campo es obligatorio.
- **Owner** — solo con tipo 1: la cuenta cuyas páginas NFT quieres reparar. No tiene que ser la tuya.
- **BookDirectory** — solo con tipo 2: clave (64 hex) de la primera página del directorio de libro. La obtienes en `book_offers` o `ledger_data`.
- **Fee** — mínimo un owner reserve (200000 drops en testnet), no la fee base de 10 drops.

## Errores habituales

- **tefINVALID_LEDGER_FIX_TYPE** — `LedgerFixType` no es 1 ni 2.
- **temINVALID** — falta `Owner` (tipo 1) o `BookDirectory` (tipo 2), o has puesto el campo del otro tipo.
- **telINSUF_FEE_P** — la `Fee` es menor que el owner reserve; no es del transactor sino de la comprobación común de fees.
- **tecOBJECT_NOT_FOUND** — la cuenta `Owner` o el directorio `BookDirectory` no existen.
- **tecNO_PERMISSION** — el directorio no es una primera página de libro, o su `ExchangeRate` ya es correcto (no hay nada que arreglar).
- **tecFAILED_PROCESSING** — la reparación de páginas NFT no pudo completarse; la fee se cobra igualmente.

## Ejemplo

```json
{
  "TransactionType": "LedgerStateFix",
  "Account": "rXXXX_TU_CUENTA",
  "LedgerFixType": 1,
  "Owner": "rYYYY_OTRA_CUENTA",
  "Fee": "200000"
}
```

## Pruébalo en testnet

1. Ajusta la `Fee` del builder a 200000 drops (0,2 XRP, el owner reserve de testnet). Con 10 drops la red la rechaza por fee insuficiente.
2. Envía el ejemplo con `LedgerFixType: 1` y un `Owner` que exista. Lo más probable es `tesSUCCESS` (o `tecFAILED_PROCESSING` si el Owner no tiene páginas NFT que reparar) y, en cualquier caso, ningún cambio visible: consulta `account_objects` del Owner con `type: "nft_page"` antes y después y compara.
3. Prueba con un `Owner` sin fondos (cuenta inexistente): `tecOBJECT_NOT_FOUND`.
4. Prueba `LedgerFixType: 3`: `tefINVALID_LEDGER_FIX_TYPE`. Prueba tipo 1 con `BookDirectory` en vez de `Owner`: `temINVALID`.
5. Para el tipo 2, toma un `BookDirectory` real de `book_offers` (campo `BookDirectory` de cualquier oferta) y envíalo: en un ledger sano obtendrás `tecNO_PERMISSION`, porque el `ExchangeRate` ya coincide.

## Relacionado

- [NFTokenPage](/objects/NFTokenPage) y [DirectoryNode](/objects/DirectoryNode) — las estructuras que repara.
- [NFTokenMint](/tx/NFTokenMint), [OfferCreate](/tx/OfferCreate) — las operaciones que dependen de ellas.
- [AccountDelete](/tx/AccountDelete) — la otra transacción con fee de un owner reserve.
- [fixNFTokenPageLinks](/amendments/fixNFTokenPageLinks), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0).
