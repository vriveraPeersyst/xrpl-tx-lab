---
title: ConfidentialMPTMergeInbox
summary: Consolida el saldo confidencial recibido en tu buzón (inbox) con tu saldo confidencial gastable.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptmergeinbox
amendment: ConfidentialTransfer
level: avanzado
---

## Qué hace

Cuando conviertes saldo a confidencial con [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) o recibes un envío confidencial con [ConfidentialMPTSend](/tx/ConfidentialMPTSend), el importe cifrado no aterriza directamente en tu saldo utilizable: se acumula en un buzón (`ConfidentialBalanceInbox`), separado del saldo "gastable" (`ConfidentialBalanceSpending`). Esta separación evita que cada ingreso obligue a recalcular inmediatamente el estado cifrado completo de tu cuenta en la misma transacción que lo genera.

`ConfidentialMPTMergeInbox` es la transacción que tú mismo envías para fusionar ese buzón con tu saldo gastable: suma criptográficamente ambos compromisos (sin revelar los importes) y vacía el buzón. Es una operación de mantenimiento que necesitas ejecutar de vez en cuando —o antes de cualquier envío que necesite disponer del saldo recién recibido.

**Este tipo de transacción depende del amendment `ConfidentialTransfer`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Después de recibir uno o varios `ConfidentialMPTSend`, antes de poder gastar ese saldo.
- Después de convertir saldo público a confidencial con `ConfidentialMPTConvert`.
- Como mantenimiento periódico, para no acumular entradas sin consolidar en el buzón.

## Cómo funciona por dentro

**`ConfidentialMPTMergeInbox::preflight`** solo valida forma: que `MPTokenIssuanceID` esté presente y bien formado (`temMALFORMED` si no).

**`ConfidentialMPTMergeInbox::preclaim`** exige que la emisión permita saldo confidencial (`lsfMPTCanHoldConfidentialBalance`, `tecNO_PERMISSION` si no) y que tu `MPToken` para esa emisión exista (`tecOBJECT_NOT_FOUND` si no).

**`ConfidentialMPTMergeInbox::doApply`** suma el compromiso criptográfico de `ConfidentialBalanceInbox` al de `ConfidentialBalanceSpending`, deja el buzón a cero y actualiza tu clave de cifrado (`HolderEncryptionKey`) si aplica. La operación en sí no cambia el total en circulación de la emisión: solo reorganiza tu propio saldo cifrado.

## Campos clave

- **MPTokenIssuanceID** — la emisión sobre la que fusionas tu buzón con tu saldo gastable. No hace falta indicar importes: la transacción opera sobre todo lo pendiente en el buzón.

## Errores habituales

- **tecNO_PERMISSION** — la emisión no tiene habilitado el saldo confidencial.
- **tecOBJECT_NOT_FOUND** — no tienes un `MPToken` para esa emisión.
- **temMALFORMED** — falta o es inválido `MPTokenIssuanceID`.

## Pruébalo en testnet

El amendment `ConfidentialTransfer` no está activo hoy en testnet, así que cualquier envío de `ConfidentialMPTMergeInbox` desde el builder devolverá un error de tipo `temDISABLED`. El ejemplo de abajo es el mínimo necesario cuando el amendment se active; a diferencia de otras transacciones confidenciales, no requiere generar pruebas criptográficas externas.

## Ejemplo

```json
{
  "TransactionType": "ConfidentialMPTMergeInbox",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

Fusionaría tu buzón confidencial con tu saldo gastable de esa emisión; hoy falla con `temDISABLED`.

## Relacionado

- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) — origina entradas en el buzón.
- [ConfidentialMPTSend](/tx/ConfidentialMPTSend) — también deposita en el buzón del destinatario.
- [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — consume el saldo gastable para volver a público.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer).
