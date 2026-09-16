---
title: XRPFees
summary: Cambia el objeto FeeSettings y la transacción ttFEE para expresar la comisión base y la reserva directamente en drops, sin el nivel de indirección de "unidades de fee".
xrplDocs: https://xrpl.org/resources/known-amendments#xrpfees
---

## Qué cambia

Antes de este amendment, el objeto `FeeSettings` guardaba `BaseFee` (en drops) junto con `ReferenceFeeUnits`, y el coste real de una transacción se calculaba multiplicando unas "unidades de fee" propias de cada transacción por ese `BaseFee`/`ReferenceFeeUnits`. XRPFees elimina esa capa de indirección: con la amendment activa, `FeeSettings` pasa a guardar `BaseFeeDrops`, `ReserveBaseDrops` y `ReserveIncrementDrops` directamente en drops, y los campos antiguos (`BaseFee`, `ReferenceFeeUnits`, `ReserveBase`, `ReserveIncrement`) se eliminan del objeto (`makeFieldAbsent` en `Change::applyFee`).

La transacción que ajusta estos parámetros de red (`ttFEE`, disparada por votación de validadores) exige, una vez `featureXRPFees` está habilitada, que `BaseFeeDrops`, `ReserveBaseDrops` y `ReserveIncrementDrops` estén presentes (antes eran opcionales) y rechaza con `temMALFORMED` si faltan; a la inversa, no permite poblar los campos nuevos antes de que el amendment esté activo. El génesis del ledger (`Ledger::Ledger`) también bifurca: si `featureXRPFees` está entre las amendments iniciales, arranca directamente con los campos en drops.

Este amendment cambia la representación del dato, no el mecanismo de escalado de comisiones bajo carga: eso lo gestiona FeeEscalation de forma independiente.

## Transacciones y objetos afectados

- Transacción de sistema `ttFEE` (votación de fee de red): campos nuevos `BaseFeeDrops`, `ReserveBaseDrops`, `ReserveIncrementDrops`, obligatorios una vez activa la amendment.
- [FeeSettings](/objects/FeeSettings): sustituye `BaseFee`/`ReferenceFeeUnits`/`ReserveBase`/`ReserveIncrement` por los campos en drops.

## Estado y contexto

Simplifica cómo la red expresa y actualiza sus parámetros económicos base (coste mínimo de transacción y reservas de cuenta/owner), quitando la necesidad de multiplicar por un factor de "unidades" heredado de una época en la que distintos tipos de transacción podían pesar distinto en unidades de fee. Con XRPFees, los validadores votan y el ledger almacena directamente cuántos drops cuesta cada concepto, sin aritmética intermedia.
