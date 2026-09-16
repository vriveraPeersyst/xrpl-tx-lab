---
title: VaultCreate
summary: Crea una bóveda de un solo activo (XRP, IOU o MPT) con su pseudo-cuenta y sus participaciones (shares) emitidas como MPT.
category: vault
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/vaultcreate
xls: XLS-0065
amendment: SingleAssetVault
level: avanzado
---

## Qué hace

**Aviso: el amendment [SingleAssetVault](/amendments/SingleAssetVault) NO está activo en la testnet.** El tipo existe en las definiciones del servidor (rippled 3.4.0-rc6), pero cualquier `VaultCreate` que envíes hoy se rechaza con `temDISABLED`. Lo que sigue describe el comportamiento del código que se activará cuando el amendment se vote.

`VaultCreate` crea un [Vault](/objects/Vault): un contenedor on-chain que guarda un único activo (XRP, un token emitido o un MPT) y reparte su valor entre depositantes mediante *shares*. Piensa en un fondo de inversión: tú aportas activos y recibes participaciones proporcionales; cuando retiras, entregas participaciones y recibes activos al tipo de cambio actual del fondo.

La transacción crea tres cosas a la vez. Primero, el objeto `Vault` en el directorio de tu cuenta. Segundo, una **pseudo-cuenta** (un `AccountRoot` sin claves, con el campo `VaultID` apuntando a la bóveda) que es quien custodia realmente los activos. Tercero, una [MPTokenIssuance](/objects/MPTokenIssuance) emitida por esa pseudo-cuenta: son las shares. Además, el owner recibe un `MPToken` vacío de esas shares para que pueda depositar sin pasos previos.

## Cuándo usarlo

- Ofrecer un producto de rendimiento: los depositantes ponen un activo y un [LoanBroker](/objects/LoanBroker) del protocolo de préstamos (XLS-66) lo presta.
- Agrupar fondos de varios participantes bajo un mismo activo con contabilidad proporcional y sin custodio humano.
- Fondos privados: con `tfVaultPrivate` y un `DomainID` solo pueden participar cuentas con credenciales del [PermissionedDomain](/objects/PermissionedDomain).

## Cómo funciona por dentro

`VaultCreate::checkExtraFeatures` exige [MPTokensV1](/amendments/MPTokensV1) (las shares son MPT), [PermissionedDomains](/amendments/PermissionedDomains) si usas `DomainID`, y [LendingProtocolV1_1](/amendments/LendingProtocolV1_1) si usas `VaultKind`, `SubscriptionDate` o `RedemptionDate`.

`VaultCreate::preflight` (validación estática) devuelve `temMALFORMED` si: `Data` supera 256 bytes; `WithdrawalPolicy` no es `1` (la única estrategia existente, `vaultStrategyFirstComeFirstServe`); `DomainID` es cero o se indica sin `tfVaultPrivate`; `AssetsMaximum` es negativo; `MPTokenMetadata` está vacío o supera 1024 bytes; `Scale` se indica para XRP o MPT (solo vale para IOU) o supera 18; o la combinación de `VaultKind` con fechas es inconsistente (una bóveda *closed-ended* necesita ambas fechas separadas al menos 180 segundos; una abierta no admite ninguna).

`VaultCreate::preclaim` (contra el ledger): comprueba con `canAddHolding` que la pseudo-cuenta podrá tener el activo; rechaza con `tecWRONG_ASSET` activos emitidos por otra pseudo-cuenta (shares de otro vault o LP tokens de un AMM), porque nunca podrían recuperarse con clawback; devuelve `tecFROZEN` (IOU) o `tecLOCKED` (MPT) si el activo está congelado para ti; `tecOBJECT_NOT_FOUND` si el `DomainID` no existe; `terADDRESS_COLLISION` si no se puede derivar una dirección de pseudo-cuenta libre; y `tecEXPIRED` si las fechas de una bóveda cerrada ya pasaron.

`VaultCreate::doApply`: enlaza el `Vault` en tu directorio, **sube tu OwnerCount en 2** (Vault + pseudo-cuenta) y comprueba la reserva (`tecINSUFFICIENT_RESERVE`). Crea la pseudo-cuenta y le añade un holding vacío del activo (trust line si es IOU, MPToken si es MPT). Después crea la emisión de shares con `MPTokenIssuanceCreate::create`: flags `lsfMPTCanEscrow | lsfMPTCanTrade | lsfMPTCanTransfer` salvo que uses `tfVaultShareNonTransferable`, y `lsfMPTRequireAuth` si la bóveda es privada; `AssetScale` es 0 para XRP/MPT y `Scale` (por defecto 6) para IOU; el `DomainID` se guarda en la emisión de shares, no en el Vault. Con [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) la emisión referencia el holding de la pseudo-cuenta vía `ReferenceHolding`. Finalmente rellena el Vault (`AssetsTotal`, `AssetsAvailable` y `LossUnrealized` a 0, `Owner`, `Account` = pseudo-cuenta, `ShareMPTID`), autoriza un `MPToken` de shares para ti y, si es privada, te marca como holder autorizado.

## Campos clave

- **Asset** — el único activo que acepta la bóveda: `{currency: "XRP"}`, `{currency, issuer}` o `{mpt_issuance_id}`. No puede ser emitido por una pseudo-cuenta.
- **AssetsMaximum** — tope de `AssetsTotal`. `0` (por defecto) significa sin límite; los depósitos que lo superen fallan con `tecLIMIT_EXCEEDED`.
- **Scale** — solo para IOU: decimales con los que se calculan las shares (por defecto 6, máximo 18). Al primer depósito, shares = activos × 10^Scale truncado.
- **DomainID** — dominio permisionado cuyas credenciales necesitan los depositantes. Exige `tfVaultPrivate`.
- **WithdrawalPolicy** — solo admite `1` (primero en llegar, primero servido). Si lo omites se guarda ese valor.
- **MPTokenMetadata** — metadatos (hex) de la emisión de shares.
- **Data** — hasta 256 bytes arbitrarios (hex) que se guardan en el Vault.
- **VaultKind / SubscriptionDate / RedemptionDate** — bóvedas cerradas del protocolo de préstamos v1.1; requieren ese amendment.

## Flags

- **tfVaultPrivate** (0x00010000) — la bóveda es privada: las shares se emiten con `lsfMPTRequireAuth` y solo depositan el owner y las cuentas que cumplan el `DomainID`. No se puede volver pública después.
- **tfVaultShareNonTransferable** (0x00020000) — las shares no llevan `lsfMPTCanTransfer` ni `CanTrade`/`CanEscrow`: solo se pueden depositar y retirar.

## Errores habituales

- **temDISABLED** — el amendment no está activo en la red. Hoy es el único resultado posible en testnet.
- **temMALFORMED** — `DomainID` sin `tfVaultPrivate`, `Scale` en un vault de XRP/MPT, `WithdrawalPolicy` distinto de 1 o `Data` demasiado largo.
- **tecWRONG_ASSET** — el activo lo emite una pseudo-cuenta (shares de otro vault, LP tokens de AMM).
- **tecFROZEN / tecLOCKED** — el emisor te ha congelado (IOU) o bloqueado (MPT) ese activo.
- **tecOBJECT_NOT_FOUND** — el `DomainID` no existe en el ledger.
- **tecINSUFFICIENT_RESERVE** — necesitas reserva para dos objetos nuevos (2 × 0,2 XRP en testnet) además de la base.

## Ejemplo

```json
{
  "TransactionType": "VaultCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Asset": { "currency": "XRP" },
  "AssetsMaximum": "1000000000",
  "Data": "7B7D",
  "Flags": 0
}
```

`AssetsMaximum` va en drops porque el activo es XRP (1.000 XRP). `Data` es `{}` en hex.

## Pruébalo en testnet

1. Abre el builder con el ejemplo anterior y fírmalo con tu cuenta.
2. Hoy el resultado será `temDISABLED`: `SingleAssetVault` aparece como `supported` pero no `enabled` en testnet. La transacción no se incluye en ningún ledger ni consume fee.
3. Cuando el amendment se active, el flujo esperado es: `tesSUCCESS`; en `account_objects` con `type: "vault"` verás el objeto con `Owner` = tu cuenta y `Account` = la pseudo-cuenta; en los metadatos de la tx aparecen tres nodos creados (`Vault`, `AccountRoot` y `MPTokenIssuance`) más tu `MPToken` de shares; y tu `OwnerCount` habrá subido en 2.
4. Guarda el `index` del Vault: es el `VaultID` que necesitan [VaultDeposit](/tx/VaultDeposit), [VaultSet](/tx/VaultSet) y [VaultDelete](/tx/VaultDelete).

## Relacionado

- [Vault](/objects/Vault), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
- [VaultSet](/tx/VaultSet), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [LoanBrokerSet](/tx/LoanBrokerSet) (usa la bóveda como fuente de liquidez)
- [SingleAssetVault](/amendments/SingleAssetVault), [MPTokensV1](/amendments/MPTokensV1), [PermissionedDomains](/amendments/PermissionedDomains), [LendingProtocolV1_1](/amendments/LendingProtocolV1_1)
