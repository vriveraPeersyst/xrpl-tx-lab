---
title: ConfidentialMPTSend
summary: Envía saldo confidencial de un MPT a otra cuenta, sin revelar el importe en el ledger.
category: confidencial
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/confidentialmptsend
amendment: ConfidentialTransfer
level: avanzado
---

## Qué hace

`ConfidentialMPTSend` es el equivalente confidencial de un `Payment` de MPT: mueve valor de tu saldo confidencial gastable al buzón (`ConfidentialBalanceInbox`) del destinatario, cifrado en todo momento. Nadie que consulte el ledger puede ver cuánto has enviado —ni siquiera el destinatario, hasta que descifra el importe con su propia clave—, pero el emisor y, si existe, el auditor designado pueden verificarlo con sus claves.

La transacción viaja con compromisos criptográficos (`AmountCommitment`, `BalanceCommitment`) y versiones del importe cifradas bajo la clave de cada parte relevante (remitente, destinatario, emisor de la MPT, auditor), más una prueba de conocimiento cero que certifica que todo es consistente sin revelar el valor real.

**Este tipo de transacción depende del amendment `ConfidentialTransfer`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Liquidar una operación entre dos instituciones sin exponer el importe a terceros que consulten el ledger.
- Pagar nóminas o transferencias internas de una organización en un MPT, manteniendo la confidencialidad de cada importe individual.
- Cualquier flujo donde el supply total deba ser auditable pero los movimientos individuales no.

## Cómo funciona por dentro

**`ConfidentialMPTSend::checkExtraFeatures`** exige [Credentials](/amendments/Credentials) si incluyes `CredentialIDs` para acceder a un destino con `DepositAuth` por credencial.

**`ConfidentialMPTSend::preflight`** valida que los textos cifrados (`SenderEncryptedAmount`, `DestinationEncryptedAmount`, `IssuerEncryptedAmount`, `AuditorEncryptedAmount`, `AmountCommitment`, `BalanceCommitment`, `ZKProof`) tengan el formato criptográfico esperado (`temBAD_CIPHERTEXT` si no) y que la estructura general sea correcta (`temMALFORMED`).

**`ConfidentialMPTSend::calculateBaseFee`** también participa en la verificación de la prueba criptográfica como parte del cálculo de fee.

**`ConfidentialMPTSend::preclaim`** exige que el destino exista (`terNO_ACCOUNT` si no) y no requiera `DestinationTag` sin que lo hayas indicado (`tecDST_TAG_NEEDED`), que la emisión permita saldo confidencial y transferencias (`lsfMPTCanHoldConfidentialBalance`, `lsfMPTCanTransfer`), y que no falte autorización si la emisión la requiere (`tecNO_AUTH`). Aplica el `TransferFee` de la emisión cuando corresponde, igual que un `Payment` directo de MPT.

**`ConfidentialMPTSend::doApply`** descuenta el compromiso de tu saldo confidencial gastable y añade el correspondiente al buzón (`ConfidentialBalanceInbox`) del destinatario, quien deberá fusionarlo con [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) para poder gastarlo.

## Campos clave

- **Destination** — la cuenta que recibe el envío confidencial.
- **DestinationTag** — igual que en un `Payment`, identifica al beneficiario final en cuentas compartidas.
- **SenderEncryptedAmount** / **DestinationEncryptedAmount** / **IssuerEncryptedAmount** / **AuditorEncryptedAmount** — el mismo importe cifrado bajo la clave de cada parte que necesita poder verlo.
- **AmountCommitment** / **BalanceCommitment** — compromisos criptográficos del importe enviado y de tu saldo resultante.
- **ZKProof** — prueba de que todo lo anterior es consistente, sin revelar el importe real.
- **CredentialIDs** — opcional, para acceder a un destino con preautorización de depósito basada en credenciales.

## Errores habituales

- **tecDST_TAG_NEEDED** — el destino exige `DestinationTag` y no lo incluiste.
- **tecNO_AUTH** — la emisión requiere autorización explícita y no la tienes.
- **tecNO_PERMISSION** — la emisión no permite saldo confidencial o transferencias.
- **tecNO_TARGET** / **terNO_ACCOUNT** — el destino no existe.
- **temBAD_CIPHERTEXT** — algún campo cifrado tiene un formato inválido.

## Pruébalo en testnet

El amendment `ConfidentialTransfer` no está activo hoy en testnet, así que cualquier envío de `ConfidentialMPTSend` desde el builder devolverá un error de tipo `temDISABLED`. Los campos criptográficos del ejemplo quedan vacíos porque generarlos requiere herramientas externas que esta web no implementa.

## Ejemplo

```json
{
  "TransactionType": "ConfidentialMPTSend",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000",
  "HolderEncryptedAmount": "",
  "DestinationEncryptedAmount": "",
  "IssuerEncryptedAmount": "",
  "AuditorEncryptedAmount": "",
  "ZKProof": ""
}
```

Intentaría enviar saldo confidencial de esa emisión a `rYYYY_OTRA_CUENTA`; hoy falla con `temDISABLED`.

## Relacionado

- [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox) — el destinatario consolida lo recibido.
- [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert) y [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack) — entrada y salida del modo confidencial.
- [Payment](/tx/Payment) — el equivalente en claro para MPT.
- Amendments: [ConfidentialTransfer](/amendments/ConfidentialTransfer), [Credentials](/amendments/Credentials).
