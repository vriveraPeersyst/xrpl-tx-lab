---
title: SetFee
summary: Pseudo-transacción con la que los validadores cambian la fee base y las reservas de XRP de la red.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/pseudo-transaction-types/setfee
amendment: XRPFees
level: avanzado
---

## Qué hace

`SetFee` fija los tres parámetros económicos globales del XRPL: la fee base de una transacción (`BaseFeeDrops`), la reserva mínima que debe tener toda cuenta (`ReserveBaseDrops`) y la reserva adicional por cada objeto que posee (`ReserveIncrementDrops`). En testnet valen hoy 10 drops, 1 XRP y 0,2 XRP respectivamente; puedes verlos en `server_info` (`validated_ledger`) o en el objeto [FeeSettings](/objects/FeeSettings).

Igual que [EnableAmendment](/tx/EnableAmendment), no la envía nadie: la emiten los validadores en un flag ledger (cada 256 ledgers) cuando la mayoría de ellos vota por unos valores distintos de los actuales. Cada validador configura sus preferencias (`[voting]` en `rippled.cfg`) y la red converge en la mediana. Aparece con `Account` igual a la cuenta nula, `Fee: "0"` y sin firma.

## Cuándo usarlo

No se puede enviar. Es relevante para:

- Explicar por qué las reservas pueden cambiar con el tiempo sin que haya un amendment (en mainnet bajaron de 20/5 XRP a 10/2 XRP y después a 1/0,2 XRP por este mecanismo).
- Saber de dónde salen los valores `reserve_base_xrp`, `reserve_inc_xrp` y `base_fee_xrp` que devuelve `server_info`.
- Diseñar aplicaciones que no den por fijas las reservas: léelas siempre del ledger.

## Cómo funciona por dentro

`SetFee` usa el transactor compartido `Change` (`src/libxrpl/tx/transactors/system/Change.cpp`), con las mismas reglas estructurales que las demás pseudo-transacciones: cuenta cero, fee 0, sin firma y `Sequence` 0 (`temBAD_SRC_ACCOUNT`, `temBAD_FEE`, `temBAD_SIGNATURE`, `temBAD_SEQUENCE` en `Transactor::invokePreflight<Change>`).

`Change::preclaim` devuelve `temINVALID` si la transacción se intenta aplicar contra el ledger abierto, y para `ttFEE` valida qué campos deben estar según el amendment [XRPFees](/amendments/XRPFees):

- Con `XRPFees` activo (el caso de testnet): `BaseFeeDrops`, `ReserveBaseDrops` y `ReserveIncrementDrops` son obligatorios (`temMALFORMED` si falta alguno) y los campos antiguos `BaseFee`, `ReferenceFeeUnits`, `ReserveBase` y `ReserveIncrement` están prohibidos (`temMALFORMED`).
- Sin `XRPFees`: justo al revés; los campos antiguos son obligatorios y los nuevos dan `temDISABLED`.
- `GasLimit`, `BytecodeSizeLimit` y `GasPrice` existen en el formato pero están prohibidos incondicionalmente (`temDISABLED`) "hasta que FeeVoteImpl los rellene", según el comentario del código. Son un anticipo del Smart Escrow.

`Change::doApply` llama a `Change::applyFee`: lee (o crea) el objeto `FeeSettings`, copia los tres valores en drops y, con `XRPFees`, borra explícitamente los cuatro campos antiguos. Siempre devuelve `tesSUCCESS` y deja un aviso "Fees have been changed" en el log. Los nuevos valores rigen desde el ledger siguiente.

## Campos clave

- **BaseFeeDrops** — fee mínima de una transacción de referencia, en drops. Es el "coste 1" que multiplican las fees especiales (multifirma, [Batch](/tx/Batch)) y el load factor.
- **ReserveBaseDrops** — XRP que una cuenta no puede gastar solo por existir. También es lo mínimo que hay que enviar para crear una cuenta con un [Payment](/tx/Payment).
- **ReserveIncrementDrops** — reserva extra por cada unidad de `OwnerCount` (trust lines, ofertas, escrows, tickets…). Es también la fee de [AccountDelete](/tx/AccountDelete) y [LedgerStateFix](/tx/LedgerStateFix).
- **LedgerSequence** — flag ledger en el que se aplica.
- **BaseFee, ReferenceFeeUnits, ReserveBase, ReserveIncrement** — formato antiguo (unidades de fee y hex); solo válido si `XRPFees` no está activo.

## Errores habituales

Solo visibles en los logs de un validador:

- **temMALFORMED** — mezcla de campos nuevos y antiguos, o falta alguno de los obligatorios para el modo activo.
- **temDISABLED** — campos en drops sin `XRPFees`, o cualquiera de `GasLimit`/`BytecodeSizeLimit`/`GasPrice`.
- **temINVALID** — se intentó aplicar contra el ledger abierto.
- **temBAD_SRC_ACCOUNT, temBAD_FEE, temBAD_SIGNATURE, temBAD_SEQUENCE** — alguien intentó enviarla desde una cuenta normal.

## Ejemplo

Así aparece en el ledger con `XRPFees` activo:

```json
{
  "TransactionType": "SetFee",
  "Account": "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
  "BaseFeeDrops": "10",
  "ReserveBaseDrops": "1000000",
  "ReserveIncrementDrops": "200000",
  "LedgerSequence": 20800000,
  "Fee": "0",
  "Sequence": 0,
  "SigningPubKey": ""
}
```

No se puede enviar. Para ver los valores vigentes usa `server_info` o `ledger_entry` con `fee: true`; el objeto `FeeSettings` guarda además el `PreviousTxnID` del último `SetFee` que lo cambió.

## Relacionado

- [FeeSettings](/objects/FeeSettings) — el objeto que modifica.
- [EnableAmendment](/tx/EnableAmendment) y [UNLModify](/tx/UNLModify) — las otras pseudo-transacciones.
- [XRPFees](/amendments/XRPFees) — cambió el formato a drops.
- [AccountDelete](/tx/AccountDelete), [TicketCreate](/tx/TicketCreate) — transacciones cuyo coste depende directamente de estas reservas.
