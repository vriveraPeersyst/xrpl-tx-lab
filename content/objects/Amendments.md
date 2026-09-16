---
title: Amendments
summary: Objeto único que lista los amendments activados en la red y los que están acumulando mayoría de validadores.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/amendments
createdBy: EnableAmendment
modifiedBy: EnableAmendment
reserve: 0
---

## Qué representa

`Amendments` es un *singleton*: solo existe un objeto de este tipo en todo el ledger y nadie es su propietario. Es el registro oficial de qué cambios de protocolo están activos. Cuando el código de rippled pregunta `view.rules().enabled(featureX)` está mirando aquí.

Contiene dos listas: `Amendments`, los identificadores de 256 bits de los amendments ya activados de forma permanente, y `Majorities`, los que tienen al menos el 80 % de los votos de la UNL pero aún no han completado las dos semanas de mayoría sostenida.

## Ciclo de vida

Lo mantiene la red, no los usuarios. No se puede enviar una transacción que lo modifique: el pseudo-tipo [EnableAmendment](/tx/EnableAmendment) lo generan los validadores dentro de los *flag ledgers* (uno de cada 256) y se aplica sin firma ni comisión.

- Con el flag `tfGotMajority`, `Change::applyAmendment` añade una entrada a `Majorities` con `CloseTime` del momento en que se alcanzó la mayoría.
- Con `tfLostMajority`, la elimina.
- Sin flags, cuando la mayoría lleva 14 días ininterrumpidos, mueve el amendment a `Amendments` y lo activa. A partir de ese ledger, los nodos que no lo soporten quedan *amendment blocked*.

El objeto se crea en el primer `EnableAmendment` de la historia de la red y nunca se borra. Los amendments ya activados no se pueden desactivar; solo se pueden retirar del código en versiones futuras (las líneas `XRPL_RETIRE_FEATURE` de `features.macro`), momento en que su comportamiento pasa a ser el estándar.

## Campos clave

- **Amendments** — array de hashes (el ID de cada amendment es el SHA-512Half de su nombre). En testnet hoy incluye, entre otros, `AMM`, `Credentials`, `MPTokensV1`, `PermissionedDomains`, `PriceOracle`, `TokenEscrow` y `XRPFees`.
- **Majorities** — array de objetos `Majority` con `Amendment` (hash) y `CloseTime` (segundos desde el Ripple Epoch, 2000-01-01). Si un amendment lleva aquí más de 14 días y sigue sin activarse, es que perdió y recuperó mayoría.
- **PreviousTxnID / PreviousTxnLgrSeq** — último `EnableAmendment` aplicado. Son opcionales porque ledgers antiguos no los guardaban ([fixPreviousTxnID](/amendments/fixPreviousTxnID)).

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

La forma cómoda es el comando `feature`, que devuelve los nombres. Para ver el objeto crudo usa `ledger_entry` con `amendments: true`; la clave es fija, `SHA512Half(0x0066)` (`keylet::amendments`), y siempre vale `7DB0788C020F02780A673DC74757F23823FA3014C1866E72CC4CD8B226CD6EF4`:

```json
{ "method": "ledger_entry", "params": [{ "amendments": true, "ledger_index": "validated" }] }
```

Respuesta típica (recortada):

```json
{
  "index": "7DB0788C020F02780A673DC74757F23823FA3014C1866E72CC4CD8B226CD6EF4",
  "node": {
    "LedgerEntryType": "Amendments",
    "Amendments": [
      "8CC0774A3BF66D1D22E76BBDA8E8A232E6B6313834301B3B23E8601196AE6455",
      "726F944886BCDF7433203787E93DD9AA87FAB74DFE3AF4785BA03BEFC97ADA1F"
    ],
    "Majorities": [
      { "Majority": { "Amendment": "A1B2C3D4E5F60718293A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E", "CloseTime": 811410000 } }
    ],
    "Flags": 0,
    "PreviousTxnID": "3C2B1A0F9E8D7C6B5A4F3E2D1C0B9A8F7E6D5C4B3A2F1E0D9C8B7A6F5E4D3C2B",
    "PreviousTxnLgrSeq": 20799744
  }
}
```

No aparece en `account_objects` de ninguna cuenta.

## Reserva

Ninguna: no tiene propietario.

## Relacionado

- [EnableAmendment](/tx/EnableAmendment), [SetFee](/tx/SetFee), [UNLModify](/tx/UNLModify)
- [FeeSettings](/objects/FeeSettings), [NegativeUNL](/objects/NegativeUNL), [LedgerHashes](/objects/LedgerHashes)
- [fixAmendmentMajorityCalc](/amendments/fixAmendmentMajorityCalc)
