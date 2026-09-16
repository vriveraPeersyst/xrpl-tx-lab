---
title: EnableAmendment
summary: Pseudo-transacción con la que la red registra que un amendment ha ganado o perdido la mayoría, o que queda activado.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/pseudo-transaction-types/enableamendment
level: avanzado
---

## Qué hace

`EnableAmendment` no la envía ninguna cuenta: la generan los validadores durante el consenso y aparece en el ledger como si viniera de la cuenta nula `rrrrrrrrrrrrrrrrrrrrrhoLvTp`, sin fee, sin firma y con `Sequence: 0`. Es el mecanismo con el que el XRPL cambia sus propias reglas.

El proceso de votación vive fuera del transactor (en `AmendmentTable`), pero el resultado se escribe en el ledger con esta pseudo-transacción, siempre en un *flag ledger* (uno de cada `kFlagLedgerInterval` = 256 ledgers). Tiene tres variantes según los flags:

- `tfGotMajority` (65536): el amendment acaba de superar el umbral de apoyo (`kAmendmentMajorityCalcThreshold`, 80 % de los validadores de confianza). Se anota en `Majorities` del objeto [Amendments](/objects/Amendments) con la hora de cierre del ledger padre.
- `tfLostMajority` (131072): el apoyo ha caído por debajo del umbral; se elimina de `Majorities`.
- Sin flags: el amendment ha mantenido la mayoría durante `kDefaultAmendmentMajorityTime` (2 semanas) y se activa definitivamente: pasa a la lista `Amendments` del objeto y las nuevas reglas rigen desde el ledger siguiente.

Una vez activado, un amendment no se puede desactivar. Y un servidor que no conozca (no "soporte") un amendment activado se declara *amendment blocked* y deja de procesar transacciones hasta que se actualice.

## Cuándo usarlo

No puedes usarla: cualquier intento de enviarla se rechaza. Te interesa entenderla para:

- Seguir el estado de un amendment en testnet (`feature` RPC o el objeto `Amendments`) y saber cuándo entrarán en vigor nuevas reglas.
- Interpretar el historial de un flag ledger cuando aparecen transacciones sin cuenta emisora.
- Entender por qué un nodo se queda *amendment blocked* tras una activación.

## Cómo funciona por dentro

Las tres pseudo-transacciones (`EnableAmendment`, [SetFee](/tx/SetFee), [UNLModify](/tx/UNLModify)) comparten el transactor `Change` (`src/libxrpl/tx/transactors/system/Change.cpp`).

`Transactor::invokePreflight<Change>` exige que `Account` sea la cuenta cero (`temBAD_SRC_ACCOUNT`), que `Fee` sea exactamente 0 XRP (`temBAD_FEE`), que no haya `SigningPubKey`, `TxnSignature` ni `Signers` (`temBAD_SIGNATURE`) y que `Sequence` sea 0 y no exista `PreviousTxnID` (`temBAD_SEQUENCE`). Con [LendingProtocol](/amendments/LendingProtocol) activo, además valida los flags contra `tfEnableAmendmentMask`.

`Change::preclaim` rechaza con `temINVALID` cualquier intento de aplicarla contra el ledger abierto: solo puede entrar como parte del cierre por consenso. Es la barrera que impide que un usuario la inyecte. Para `ttAMENDMENT` no hay más comprobaciones.

`Change::doApply` despacha a `Change::applyAmendment`:

1. Lee (o crea, si no existe) el objeto `Amendments`. Si el hash ya está en la lista de activos, `tefALREADY`.
2. Si lleva `tfGotMajority` y `tfLostMajority` a la vez, `temINVALID_FLAG`.
3. Reconstruye el array `Majorities` sin la entrada de este amendment. Si venía con `tfGotMajority` y ya estaba, `tefALREADY`; si venía con `tfLostMajority` y no estaba, también `tefALREADY`.
4. Con `tfGotMajority` añade una entrada `Majority` con `Amendment` y `CloseTime` (hora de cierre del ledger padre). Con ningún flag, añade el hash a `Amendments`, avisa a `AmendmentTable::enable` y, si el servidor no soporta ese amendment, llama a `setAmendmentBlocked`.
5. Guarda el objeto (elimina `Majorities` si queda vacío).

El cómputo del 80 % y las dos semanas no está aquí: lo hace cada validador al votar en el flag ledger, y `fixAmendmentMajorityCalc` (ya integrado en el código) corrigió el cálculo para que sea "más del 80 %" sobre los validadores de la UNL.

## Campos clave

- **Amendment** — hash de 256 bits que identifica el amendment (el mismo `id` que ves en `feature` o en testnet.json).
- **LedgerSequence** — índice del flag ledger en el que se aplica.
- **Flags** — `tfGotMajority`, `tfLostMajority` o ninguno (activación).

## Flags

- **tfGotMajority** (65536) — el amendment ha alcanzado la mayoría; arranca la cuenta atrás de dos semanas.
- **tfLostMajority** (131072) — ha perdido la mayoría; se borra de `Majorities` y la cuenta atrás se reinicia si vuelve a ganarla.

## Errores habituales

Estos códigos solo aparecen en los logs de un validador; el usuario nunca los ve.

- **temBAD_SRC_ACCOUNT / temBAD_FEE / temBAD_SIGNATURE / temBAD_SEQUENCE** — alguien intentó enviar una pseudo-transacción desde una cuenta real, con fee, firmada o con secuencia.
- **temINVALID** — la pseudo-transacción llegó al ledger abierto en lugar de al cierre por consenso.
- **tefALREADY** — el amendment ya estaba activado, ya tenía mayoría o ya la había perdido.
- **temINVALID_FLAG** — `tfGotMajority` y `tfLostMajority` a la vez.

## Ejemplo

Así aparece en el ledger una activación (sin flags):

```json
{
  "TransactionType": "EnableAmendment",
  "Account": "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
  "Amendment": "9F287AED3CDB50A7BD1ACEC24296A30C9B5230CCD136219317AC790E3B884377",
  "LedgerSequence": 20800000,
  "Fee": "0",
  "Sequence": 0,
  "SigningPubKey": ""
}
```

No se puede enviar: la construye el sistema. Para observarla, busca un flag ledger (múltiplo de 256) con `ledger` y `transactions: true` en un momento en que un amendment cambie de estado, o consulta el objeto [Amendments](/objects/Amendments) con `ledger_entry` (`amendments: true`).

## Relacionado

- [Amendments](/objects/Amendments) — el objeto singleton que modifica.
- [SetFee](/tx/SetFee) y [UNLModify](/tx/UNLModify) — las otras dos pseudo-transacciones del transactor `Change`.
- [BatchV1_1](/amendments/BatchV1_1) — ejemplo de amendment pendiente de votación en testnet.
- [LendingProtocol](/amendments/LendingProtocol) — introduce la validación de flags de esta pseudo-transacción.
