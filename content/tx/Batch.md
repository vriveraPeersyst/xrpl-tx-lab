---
title: Batch
summary: Empaqueta de 2 a 8 transacciones en una sola, con cuatro modos de atomicidad y firmas de varias cuentas.
category: batch
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/batch
xls: XLS-0056
amendment: Batch
level: avanzado
---

## Qué hace

`Batch` es un "sobre" que contiene varias transacciones internas (`RawTransactions`) y define cómo se aplican en conjunto. La transacción externa la firma tu cuenta como siempre; las internas van sin firma, con `Fee: "0"` y el flag `tfInnerBatchTxn`. Si las internas pertenecen a otras cuentas, esas cuentas firman el lote entero mediante `BatchSigners`, de modo que dos partes pueden hacer un intercambio en el que nadie tiene que confiar en el otro.

Un flag obligatorio (exactamente uno) fija el modo:

- `tfAllOrNothing` (65536): o se aplican todas o ninguna.
- `tfOnlyOne` (131072): se aplica la primera que tenga éxito y se para.
- `tfUntilFailure` (262144): se aplican en orden hasta la primera que falle.
- `tfIndependent` (524288): se intentan todas, cada una por su cuenta.

El lote en sí no crea objetos del ledger: los efectos son los de sus transacciones internas.

## Cuándo usarlo

- Intercambios atómicos entre dos cuentas (por ejemplo, un NFT por XRP) sin intermediarios.
- Crear una cuenta y configurarla en el mismo ledger: [Payment](/tx/Payment) de fondos + [TrustSet](/tx/TrustSet) + [AccountSet](/tx/AccountSet).
- Varios pagos de nómina que deben llegar todos o ninguno.
- Reintentos ordenados con `tfUntilFailure` o alternativas con `tfOnlyOne`.

## Cómo funciona por dentro

Antes de llegar al transactor, la propia deserialización (`STTx`) limita `RawTransactions` a `kMaxBatchTxCount` (8) y prohíbe anidar un `Batch` dentro de otro.

`Batch::preflight` valida el sobre y cada transacción interna:

- Debe haber exactamente uno de los cuatro flags de modo (`temINVALID_FLAG`, comprobado con `popcount`).
- Al menos 2 transacciones internas (`temARRAY_EMPTY` si hay 0 o 1) y como máximo `kMaxBatchSigners` (24) entradas en `BatchSigners` (`temARRAY_TOO_LARGE`).
- Cada interna: hash único (`temREDUNDANT`), tipo no prohibido (los de Vault y Lending están en `kDisabledTxTypes` y dan `temINVALID_INNER_BATCH`), flag `tfInnerBatchTxn` presente (`temINVALID_FLAG`), sin `TxnSignature` (`temBAD_SIGNATURE`), sin `Signers` (`temBAD_SIGNER`), `SigningPubKey` vacío (`temBAD_REGKEY`), `Fee` exactamente 0 XRP (`temBAD_FEE`), y debe pasar su propio `preflight` en modo `TapBatch` (si no, `temINVALID_INNER_BATCH`).
- Cada interna lleva `Sequence` o `TicketSequence`, pero no ambos (`temSEQ_AND_TICKET`). En los modos `tfAllOrNothing` y `tfUntilFailure`, dos internas de la misma cuenta no pueden repetir secuencia o ticket (`temREDUNDANT`).

`Batch::preflightSigValidated` calcula qué cuentas deben firmar el lote: el iniciador de cada interna (o su delegado) y, si existe, su `Counterparty` o `Sponsor`, excluyendo siempre la cuenta externa. `BatchSigners` debe contener exactamente esas cuentas, ordenadas de forma estrictamente ascendente y sin repetir; cualquier desviación es `temBAD_SIGNER`. Después `Batch::checkBatchSign` verifica la firma de cada `BatchSigner` (firma simple o multifirma anidada) sobre el conjunto de hashes internos.

La fee la calcula `Batch::calculateBaseFeeImpl`: fee base × 2 por el sobre, más la suma de las fees base de cada interna, más una fee base por cada firma de `BatchSigners` (contando las firmas anidadas de una multifirma). Con base de 10 drops, un lote de dos pagos de una sola cuenta cuesta 40 drops. `Batch::preclaim` solo responde `tecINSUFF_FEE` si ese cálculo desborda.

`Batch::doApply` devuelve `tesSUCCESS` sin tocar nada: la lógica de aplicación vive en `applyBatchTransactions` (`src/libxrpl/tx/apply.cpp`). Solo si el sobre se aplica con `tesSUCCESS` se ejecutan las internas, una a una, cada una en una vista propia que se vuelca a la del lote si termina en `tes` o `tec`. Con `tfAllOrNothing`, el primer resultado distinto de `tesSUCCESS` (incluido un `tec`) descarta todo; con `tfUntilFailure` se para ahí pero se conserva lo anterior; con `tfOnlyOne` se para tras el primer `tesSUCCESS`; con `tfIndependent` se sigue siempre. Cada interna aparece en el ledger como una transacción propia con `ParentBatchID` apuntando al sobre.

Dos matices de amendments: el sobre no puede llevar `spfSponsorReserve` y las internas no pueden tener fee patrocinada (`temINVALID_FLAG`), y [BatchV1_1](/amendments/BatchV1_1) (no activo en testnet) introduce correcciones en el tratamiento de las transacciones internas (lo consulta, por ejemplo, `Payment::preclaim`). `Batch` no es delegable.

## Campos clave

- **RawTransactions** — array de objetos `RawTransaction`, cada uno una transacción completa con `Flags` incluyendo `tfInnerBatchTxn` (1073741824), `Fee: "0"`, `SigningPubKey: ""` y su propio `Sequence` (o `TicketSequence`). Las secuencias de tu cuenta empiezan en la del sobre + 1.
- **BatchSigners** — solo si hay internas de otras cuentas: array de `BatchSigner` con `Account`, `SigningPubKey` y `TxnSignature` (o `Signers` para multifirma), ordenado por cuenta.
- **Flags** — exactamente un modo de los cuatro.

## Errores habituales

- **temINVALID_FLAG** — falta el flag de modo, hay más de uno, o una interna no lleva `tfInnerBatchTxn`.
- **temARRAY_EMPTY** — menos de dos transacciones internas.
- **temBAD_FEE** — alguna interna tiene `Fee` distinto de `"0"`.
- **temBAD_REGKEY / temBAD_SIGNATURE** — una interna lleva `SigningPubKey` no vacío o `TxnSignature`.
- **temSEQ_AND_TICKET** — una interna sin `Sequence` (o con 0) y sin `TicketSequence`, o con ambos.
- **temREDUNDANT** — dos internas idénticas, o la misma `Sequence` repetida en modos atómicos.
- **temBAD_SIGNER** — `BatchSigners` no coincide exactamente con las cuentas requeridas o está desordenado.
- **temINVALID_INNER_BATCH** — una interna no pasa su propio `preflight` o es de un tipo prohibido.

## Ejemplo

```json
{
  "TransactionType": "Batch",
  "Account": "rXXXX_TU_CUENTA",
  "Flags": 65536,
  "RawTransactions": [
    {
      "RawTransaction": {
        "TransactionType": "Payment",
        "Flags": 1073741824,
        "Account": "rXXXX_TU_CUENTA",
        "Destination": "rYYYY_OTRA_CUENTA",
        "Amount": "1000000",
        "Sequence": 12346,
        "Fee": "0",
        "SigningPubKey": ""
      }
    },
    {
      "RawTransaction": {
        "TransactionType": "Payment",
        "Flags": 1073741824,
        "Account": "rXXXX_TU_CUENTA",
        "Destination": "rZZZZ_EMISOR",
        "Amount": "1000000",
        "Sequence": 12347,
        "Fee": "0",
        "SigningPubKey": ""
      }
    }
  ]
}
```

## Pruébalo en testnet

1. Consulta `account_info` y anota tu `Sequence` (llámalo S). El builder rellena el sobre con S y las internas con S+1 y S+2.
2. Envía el ejemplo con `Flags: 65536` (`tfAllOrNothing`). Observa que la fee calculada es 40 drops: 20 por el sobre y 10 por cada pago interno.
3. Busca el sobre con `tx`: su metadata solo refleja el cobro de la fee y el avance de `Sequence`. Busca cada interna por su propio hash (o consulta `account_tx`): verás las dos como transacciones separadas con `ParentBatchID`.
4. Consulta `account_info` de los dos destinos: cada uno ha recibido 1 XRP.
5. Repite el lote cambiando el segundo `Amount` por una cifra superior a tu saldo. Con `tfAllOrNothing` ninguno de los dos pagos se aplica (el sobre sigue en `tesSUCCESS` y cobra su fee). Cambia a `tfUntilFailure` (262144): el primero sí se aplica y el segundo no.
6. Quita el flag de modo o pon `Fee: "10"` en una interna para ver `temINVALID_FLAG` y `temBAD_FEE` antes de llegar al ledger.

## Relacionado

- [Payment](/tx/Payment), [TrustSet](/tx/TrustSet), [AccountSet](/tx/AccountSet) — internas habituales.
- [TicketCreate](/tx/TicketCreate) — las internas pueden usar `TicketSequence`.
- [SignerListSet](/tx/SignerListSet) — un `BatchSigner` puede ser una multifirma.
- [BatchV1_1](/amendments/BatchV1_1) — correcciones pendientes de activar en testnet.
- [DelegateSet](/tx/DelegateSet) — una interna delegada la firma el delegado en `BatchSigners`.
