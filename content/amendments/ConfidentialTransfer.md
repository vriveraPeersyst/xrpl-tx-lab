---
title: ConfidentialTransfer
summary: Transferencias confidenciales de MPT con cifrado EC-ElGamal y pruebas de conocimiento cero; saldos e importes ocultos, supply auditable.
xls: XLS-0096
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0096-confidential-mpt
xrplDocs: https://xrpl.org/resources/known-amendments#confidentialtransfer
introducedIn: 3.3.0
---

## Qué cambia

Permite que un Multi-Purpose Token tenga, además del saldo público, un saldo cifrado por titular. El emisor habilita la capacidad en la emisión con el flag `tfMPTCanHoldConfidentialBalance` y publica una clave EC-ElGamal (`IssuerElGamalKey`); opcionalmente designa un auditor con su propia clave (`AuditorElGamalKey`). Ambas cosas se gestionan en `MPTokenIssuanceCreate` y `MPTokenIssuanceSet`, y sin el amendment se rechazan con `temDISABLED`.

Los titulares convierten saldo público en confidencial (`ConfidentialMPTConvert`), lo envían cifrado (`ConfidentialMPTSend`), consolidan lo recibido en su bandeja de entrada (`ConfidentialMPTMergeInbox`) y lo devuelven a claro (`ConfidentialMPTConvertBack`). Cada operación adjunta pruebas de conocimiento cero que los validadores verifican sin conocer los importes. El emisor conserva la posibilidad de reclamar con `ConfidentialMPTClawback`.

La emisión lleva la cuenta del total cifrado en circulación (`ConfidentialOutstandingAmount`); mientras no sea cero, `MPTokenAuthorize` no permite al emisor dar de baja determinadas relaciones.

## Transacciones y objetos afectados

- Nuevas: [ConfidentialMPTConvert](/tx/ConfidentialMPTConvert), [ConfidentialMPTMergeInbox](/tx/ConfidentialMPTMergeInbox), [ConfidentialMPTConvertBack](/tx/ConfidentialMPTConvertBack), [ConfidentialMPTSend](/tx/ConfidentialMPTSend) y [ConfidentialMPTClawback](/tx/ConfidentialMPTClawback).
- Modificadas: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) y [MPTokenAuthorize](/tx/MPTokenAuthorize).
- Objetos: [MPTokenIssuance](/objects/MPTokenIssuance) y [MPToken](/objects/MPToken) ganan campos cifrados.

## Estado y contexto

Las instituciones que tokenizan activos no pueden exponer públicamente los saldos de sus clientes ni el tamaño de cada operación, pero sí necesitan que reguladores y auditores puedan verificar el supply total y, en su caso, descifrar operaciones concretas. La XLS-96 aporta esa privacidad "con puerta de auditoría" sobre MPT, sin tocar los tokens de trust line. Se apoya en [MPTokensV1](/amendments/MPTokensV1) y convive con [DynamicMPT](/amendments/DynamicMPT) (el flag confidencial puede declararse inmutable en `ImmutableFlags`). La rotación de claves se propone aparte en XLS-99 (`ConfidentialMPTKeyRotation`, aún no soportado).
