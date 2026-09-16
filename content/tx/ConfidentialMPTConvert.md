---
title: ConfidentialMPTConvert
summary: Convierte saldo público de un MPT en saldo confidencial, cifrado con EC-ElGamal.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptconvert
amendment: ConfidentialTransfer
level: avanzado
---

## Qué hace

`ConfidentialMPTConvert` mueve una cantidad de tu saldo público de un Multi-Purpose Token a un saldo confidencial: un saldo cifrado bajo la clave EC-ElGamal del emisor (y, si existe, del auditor), de modo que ni el importe ni tu posición quedan visibles en el ledger, pero el supply total sigue siendo verificable. Es el punto de entrada al sistema de MPT confidenciales que introduce el amendment `ConfidentialTransfer`.

El importe convertido no llega directamente a tu saldo "gastable": entra primero en tu buzón (`ConfidentialBalanceInbox`) cifrado, y tienes que consolidarlo con [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) antes de poder enviarlo con [ConfidentialMPTSend](/tx/ConfidentialMPTSend). La transacción exige una prueba de conocimiento cero (`ZKProof`) que demuestra que el importe cifrado corresponde realmente al `MPTAmount` declarado, sin revelar ese importe a los validadores.

**Este tipo de transacción depende del amendment `ConfidentialTransfer`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Una institución mueve parte de su saldo de un MPT a modo confidencial antes de operar con contrapartes que no deben ver los importes.
- Un tenedor que quiere ocultar su posición de cara al resto de participantes, manteniendo auditable el total en circulación para el regulador designado.

## Cómo funciona por dentro

**`ConfidentialMPTConvert::preflight`** valida forma: `MPTAmount` no puede ser cero o negativo (`temBAD_AMOUNT`), y el resto de campos criptográficos (`ZKProof`, claves) deben tener el formato esperado (`temMALFORMED` si no).

**`ConfidentialMPTConvert::preclaim`** exige que la emisión permita saldo confidencial (`lsfMPTCanHoldConfidentialBalance`, `tecNO_PERMISSION` si no), que tengas fondos públicos suficientes (`tecINSUFFICIENT_FUNDS`), y verifica la prueba de conocimiento cero contra tu saldo cifrado actual (`tecBAD_PROOF` si no cuadra) y que la operación no sea una repetición de otra ya procesada (`tecDUPLICATE`).

**`ConfidentialMPTConvert::doApply`** descuenta `MPTAmount` de tu saldo público, añade el importe cifrado a tu `ConfidentialBalanceInbox` y actualiza el total cifrado en circulación de la emisión (`ConfidentialOutstandingAmount`).

## Campos clave

- **MPTAmount** — el importe público (en claro, visible en la transacción) que quieres convertir a confidencial.
- **HolderEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — el mismo importe, cifrado bajo cada una de las claves relevantes, para que cada parte pueda descifrarlo con su clave privada.
- **BlindingFactor** — el factor de ofuscación usado en el compromiso criptográfico del importe.
- **ZKProof** — prueba de que el importe cifrado coincide con `MPTAmount` sin revelarlo.

## Errores habituales

- **tecNO_PERMISSION** — la emisión no tiene habilitado `lsfMPTCanHoldConfidentialBalance`.
- **tecINSUFFICIENT_FUNDS** — tu saldo público no cubre el `MPTAmount` a convertir.
- **tecBAD_PROOF** — la prueba de conocimiento cero no es válida para los valores enviados.
- **tecOBJECT_NOT_FOUND** — la emisión o tu `MPToken` no existen.
- **temBAD_AMOUNT** — `MPTAmount` es cero o inválido.

## Pruébalo en testnet

El amendment `ConfidentialTransfer` no está activo hoy en testnet, así que cualquier envío de `ConfidentialMPTConvert` desde el builder devolverá un error de tipo `temDISABLED`. Puedes comprobarlo con el ejemplo de abajo (los campos de cifrado quedan vacíos porque generarlos requiere herramientas criptográficas externas que esta web no implementa); cuando la red active el amendment, necesitarás calcular esos valores fuera de este builder.

## Ejemplo

```json
{
  "TransactionType": "ConfidentialMPTConvert",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100",
  "HolderElGamalPublicKey": "",
  "IssuerElGamalPublicKey": ""
}
```

Intentaría convertir 100 unidades del MPT indicado a saldo confidencial; los campos de clave/cifrado deben calcularse con herramientas externas y hoy fallará con `temDISABLED`.

## Relacionado

- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — consolida el importe recibido en tu buzón.
- [ConfidentialMPTSend](/tx/ConfidentialMPTSend) — envía saldo confidencial a otra cuenta.
- [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — revierte a saldo público.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [MPTokensV1](/amendments/MPTokensV1).
