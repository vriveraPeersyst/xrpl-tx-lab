---
title: Credentials
summary: Añade credenciales verificables on-chain (CredentialCreate/Accept/Delete) y su uso en DepositPreauth y pagos.
xls: XLS-0070
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials
xrplDocs: https://xrpl.org/resources/known-amendments#credentials
introducedIn: 2.3.0
---

## Qué cambia

Introduce el objeto `Credential`: una afirmación firmada por un emisor sobre un sujeto, identificada por `Issuer`, `Subject` y `CredentialType`. El emisor la crea con `CredentialCreate`; hasta que el sujeto la acepta con `CredentialAccept` no cuenta como válida (flag `lsfAccepted`), y cualquiera de los dos puede borrarla con `CredentialDelete`. Puede llevar `Expiration` y una `URI` con la evidencia fuera de cadena.

La autorización de depósito deja de ser solo por cuenta: `DepositPreauth` admite `AuthorizeCredentials`, una lista de pares emisor/tipo, de modo que cualquier cuenta que presente ese conjunto de credenciales puede depositar. Para ello, `Payment`, `EscrowFinish`, `PaymentChannelClaim` y `AccountDelete` ganan el campo `CredentialIDs`; la función `credentials::valid` comprueba en `preclaim` que existen, están aceptadas, no han caducado y pertenecen al remitente. Una credencial caducada que se presenta se borra del ledger en la misma transacción.

## Transacciones y objetos afectados

- Nuevas: [CredentialCreate](/tx/CredentialCreate), [CredentialAccept](/tx/CredentialAccept) y [CredentialDelete](/tx/CredentialDelete).
- Modificadas: [DepositPreauth](/tx/DepositPreauth), [Payment](/tx/Payment), [EscrowFinish](/tx/EscrowFinish), [PaymentChannelClaim](/tx/PaymentChannelClaim) y [AccountDelete](/tx/AccountDelete). Amendments posteriores reutilizan el mecanismo en [PermissionedDomainSet](/tx/PermissionedDomainSet), [VaultWithdraw](/tx/VaultWithdraw), [LoanBrokerCoverWithdraw](/tx/LoanBrokerCoverWithdraw) y [ConfidentialMPTSend](/tx/ConfidentialMPTSend).
- Objetos: nuevo [Credential](/objects/Credential); [DepositPreauth](/objects/DepositPreauth) puede almacenar credenciales en lugar de una cuenta.

## Estado y contexto

[DepositAuth](/amendments/DepositAuth) obligaba a preautorizar cuenta por cuenta, algo inviable para un negocio con miles de clientes verificados. La XLS-70 separa "quién te ha verificado" de "quién te paga": un proveedor KYC emite la credencial una vez y cualquier receptor que confíe en ese proveedor la acepta. Es la base de los [PermissionedDomains](/amendments/PermissionedDomains) y, por tanto, del [PermissionedDEX](/amendments/PermissionedDEX) y del protocolo de préstamos.
