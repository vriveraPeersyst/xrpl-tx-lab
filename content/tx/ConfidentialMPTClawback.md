---
title: ConfidentialMPTClawback
summary: El emisor recupera (clawback) saldo confidencial de un tenedor de MPT, sin necesidad de conocer el importe exacto.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptclawback
amendment: ConfidentialTransfer
level: avanzado
---

## Qué hace

`ConfidentialMPTClawback` es la versión confidencial de [Clawback](/tx/Clawback): permite al emisor de un MPT recuperar el saldo (o parte de él) que un tenedor mantiene en modo confidencial, siempre que la emisión se creara con la capacidad `lsfMPTCanClawback`. Al igual que el resto de operaciones sobre saldos confidenciales, viaja con una prueba de conocimiento cero (`ZKProof`) que demuestra que la operación es consistente con el estado cifrado del tenedor, sin que el emisor necesite conocer de antemano el saldo exacto que tiene.

Este mecanismo es imprescindible para emisores regulados: la privacidad de los saldos no puede ser una vía para evadir una orden de embargo o una corrección de un error operativo, así que el amendment conserva esta puerta trasera controlada exclusivamente por el emisor.

**Este tipo de transacción depende del amendment `ConfidentialTransfer`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Cumplir una orden judicial o regulatoria de embargo sobre los activos confidenciales de un tenedor concreto.
- Corregir una emisión errónea de MPT confidencial sin depender de la colaboración del tenedor.
- Cualquier escenario donde ya usarías `Clawback` sobre saldo público, pero el tenedor mantiene su posición en modo confidencial.

## Cómo funciona por dentro

**`ConfidentialMPTClawback::preflight`** valida forma: `MPTAmount` distinto de cero (`temBAD_AMOUNT`) y campos criptográficos con formato válido (`temMALFORMED`).

**`ConfidentialMPTClawback::preclaim`** exige que la emisión tenga habilitado `lsfMPTCanClawback` (`tecNO_PERMISSION` si no) y `lsfMPTCanHoldConfidentialBalance`, que el tenedor (`Holder`) tenga saldo confidencial suficiente para cubrir el `MPTAmount` reclamado (`tecINSUFFICIENT_FUNDS`), y que tanto la emisión como el `MPToken` del tenedor existan (`tecOBJECT_NOT_FOUND`, `tecNO_TARGET`).

**`ConfidentialMPTClawback::doApply`** descuenta el compromiso correspondiente del saldo confidencial del tenedor y reduce el total cifrado en circulación de la emisión (`ConfidentialOutstandingAmount`); el importe recuperado no vuelve a ti como saldo visible, sino que se elimina de la circulación cifrada, igual que un `Clawback` normal reduce el `OutstandingAmount` público.

## Campos clave

- **Holder** — la cuenta a la que se le retira saldo confidencial. Nunca puede ser el propio emisor.
- **MPTAmount** — el importe, en claro dentro de la transacción del emisor, que se reclama del saldo cifrado del tenedor.
- **ZKProof** — prueba de que la operación es consistente con el saldo cifrado del tenedor, sin que el emisor necesite conocer ese saldo de antemano.

## Errores habituales

- **tecNO_PERMISSION** — la emisión no tiene habilitado `lsfMPTCanClawback`, o quien envía la transacción no es el emisor.
- **tecINSUFFICIENT_FUNDS** — el saldo confidencial del tenedor no cubre el `MPTAmount` reclamado.
- **tecNO_TARGET** — el `Holder` indicado no existe o no tiene `MPToken` para esa emisión.
- **tecOBJECT_NOT_FOUND** — la emisión no existe.
- **temBAD_AMOUNT** — `MPTAmount` es cero o inválido.

## Pruébalo en testnet

El amendment `ConfidentialTransfer` no está activo hoy en testnet, así que cualquier envío de `ConfidentialMPTClawback` desde el builder devolverá un error de tipo `temDISABLED`. El campo `ZKProof` del ejemplo queda vacío porque generarlo requiere herramientas criptográficas externas que esta web no implementa.

## Ejemplo

```json
{
  "TransactionType": "ConfidentialMPTClawback",
  "Account": "rXXXX_TU_CUENTA",
  "Holder": "rYYYY_OTRA_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100"
}
```

Como emisor, intentaría recuperar 100 unidades del saldo confidencial de `rYYYY_OTRA_CUENTA`; hoy falla con `temDISABLED`.

## Relacionado

- [Clawback](/tx/Clawback) — el equivalente para saldo público (IOU y MPT).
- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — cómo se genera el saldo confidencial que aquí se recupera.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [MPTokensV1](/amendments/MPTokensV1).
