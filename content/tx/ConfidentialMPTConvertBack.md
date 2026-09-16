---
title: ConfidentialMPTConvertBack
summary: Convierte saldo confidencial de un MPT de vuelta a saldo público, visible en el ledger.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptconvertback
amendment: ConfidentialTransfer
level: avanzado
---

## Qué hace

`ConfidentialMPTConvertBack` es la operación inversa de [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert): toma una cantidad de tu saldo confidencial gastable (`ConfidentialBalanceSpending`) y la revela como saldo público en tu `MPToken`, dejando de estar cifrada. Es el paso necesario cuando quieres, por ejemplo, retirar fondos a un exchange o a una contraparte que no opera con saldos confidenciales.

Como en el resto de operaciones confidenciales, la transacción viaja con un compromiso criptográfico (`BalanceCommitment`) y una prueba de conocimiento cero (`ZKProof`) que demuestran que el importe descifrado corresponde realmente a tu saldo cifrado previo, sin que los validadores necesiten ver ese saldo en ningún momento del proceso.

**Este tipo de transacción depende del amendment `ConfidentialTransfer`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Retirar fondos de tu posición confidencial hacia un saldo público que puedas enviar a cualquier tenedor, aunque no soporte saldos confidenciales.
- Cerrar una posición confidencial antes de un evento que exige transparencia (una liquidación, una auditoría puntual).
- Combinarlo con [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) para mover fondos dentro y fuera del modo confidencial según necesites privacidad puntual.

## Cómo funciona por dentro

**`ConfidentialMPTConvertBack::preflight`** valida forma: `MPTAmount` distinto de cero (`temBAD_AMOUNT`) y los campos criptográficos (`ZKProof`, `BalanceCommitment`) con el formato esperado (`temMALFORMED` si no).

**`ConfidentialMPTConvertBack::calculateBaseFee`** verifica la prueba de conocimiento cero como parte del cálculo de la fee de la transacción (`tecBAD_PROOF` si no es válida) — un patrón distinto al resto de transactores, donde esa verificación suele vivir en `preclaim`.

**`ConfidentialMPTConvertBack::preclaim`** exige que la emisión permita saldo confidencial (`lsfMPTCanHoldConfidentialBalance`), que tengas saldo confidencial gastable suficiente (`tecINSUFFICIENT_FUNDS`) y que tu `MPToken` y la emisión existan (`tecOBJECT_NOT_FOUND`).

**`ConfidentialMPTConvertBack::doApply`** descuenta el compromiso correspondiente de tu `ConfidentialBalanceSpending`, añade `MPTAmount` a tu saldo público y reduce el total cifrado en circulación de la emisión (`ConfidentialOutstandingAmount`).

## Campos clave

- **MPTAmount** — el importe, en claro, que sale del saldo confidencial y aparece como saldo público.
- **HolderEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — versiones cifradas del importe bajo cada clave relevante, usadas para verificar la consistencia con tu saldo cifrado previo.
- **BalanceCommitment** — compromiso criptográfico de tu saldo confidencial resultante tras la operación.
- **BlindingFactor** — factor de ofuscación del compromiso.
- **ZKProof** — prueba de que el importe revelado es consistente con tu saldo cifrado.

## Errores habituales

- **tecBAD_PROOF** — la prueba de conocimiento cero no es válida.
- **tecINSUFFICIENT_FUNDS** — tu saldo confidencial gastable no cubre el `MPTAmount` solicitado.
- **tecNO_PERMISSION** — la emisión no permite saldo confidencial.
- **tecOBJECT_NOT_FOUND** — la emisión o tu `MPToken` no existen.
- **temBAD_AMOUNT** — `MPTAmount` es cero o inválido.

## Pruébalo en testnet

El amendment `ConfidentialTransfer` no está activo hoy en testnet, así que cualquier envío de `ConfidentialMPTConvertBack` desde el builder devolverá un error de tipo `temDISABLED`. Los campos criptográficos del ejemplo quedan vacíos porque generarlos requiere herramientas externas que esta web no implementa.

## Ejemplo

```json
{
  "TransactionType": "ConfidentialMPTConvertBack",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "MPTAmount": "100",
  "ZKProof": ""
}
```

Intentaría revelar 100 unidades de saldo confidencial como saldo público; hoy falla con `temDISABLED`.

## Relacionado

- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — la operación inversa.
- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — consolida el saldo que luego puedes revertir.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer).
