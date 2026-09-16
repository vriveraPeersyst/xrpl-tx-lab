---
title: MPTokenIssuanceCreate
summary: Crea una emisión de Multi-Purpose Token (MPT) con sus reglas fijas: escala, máximo, comisión de transferencia, metadatos y permisos.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuancecreate
xls: XLS-0033
amendment: MPTokensV1
level: intermedio
---

## Qué hace

`MPTokenIssuanceCreate` da de alta un objeto [MPTokenIssuance](/objects/MPTokenIssuance) en el ledger. Es la "definición" de un token fungible de nueva generación: a diferencia de los IOU clásicos, no necesita trust lines ni moneda de tres letras. El identificador de la emisión (`MPTokenIssuanceID`, 48 hex) se deriva de tu `Sequence` y tu cuenta, así que es determinista.

En el momento de crearla fijas casi todo: `AssetScale`, `MaximumAmount`, `TransferFee`, metadatos y los flags de capacidad (¿se puede bloquear? ¿transferir? ¿hacer clawback?). En testnet, con solo [MPTokensV1](/amendments/MPTokensV1) activo, esos flags y campos son inmutables. El amendment [DynamicMPT](/amendments/DynamicMPT) (no activo en testnet) permitiría cambiarlos después con [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) e introduce `ImmutableFlags`.

Los tenedores reciben unidades cuando les envías un [Payment](/tx/Payment) con `Amount` en formato MPT. Cada tenedor debe tener antes un objeto [MPToken](/objects/MPToken), creado con [MPTokenAuthorize](/tx/MPTokenAuthorize).

## Cuándo usarlo

- Stablecoins, puntos de fidelidad, bonos o cualquier activo fungible que quieras controlar con reglas explícitas.
- Tokens que requieren KYC: `tfMPTRequireAuth` obliga a que tú autorices a cada tenedor.
- Activos con comisión por transferencia entre terceros (`TransferFee`).

## Cómo funciona por dentro

**`MPTokenIssuanceCreate::checkExtraFeatures`** rechaza con `temDISABLED` lo que dependa de amendments no activos en testnet: `DomainID` (requiere `PermissionedDomains` + `SingleAssetVault`), `ImmutableFlags` (requiere `DynamicMPT`) y `tfMPTCanHoldConfidentialBalance` (requiere `ConfidentialTransfer`).

**`MPTokenIssuanceCreate::preflight`**:
- `ReferenceHolding` en la tx → `temMALFORMED` (es un campo interno que solo escribe el protocolo de vaults).
- `ImmutableFlags` a 0 o con bits fuera de la máscara → `temINVALID_FLAG`.
- `TransferFee` > 50000 → `temBAD_TRANSFER_FEE`; mayor que 0 sin `tfMPTCanTransfer` → `temMALFORMED`; mayor que 0 con `tfMPTCanHoldConfidentialBalance` → `temBAD_TRANSFER_FEE`.
- `DomainID` a cero, o presente sin `tfMPTRequireAuth` → `temMALFORMED`.
- `MPTokenMetadata` vacío o de más de 1024 bytes → `temMALFORMED`.
- `MaximumAmount` igual a 0 o mayor que 2^63−1 → `temMALFORMED`.

**`MPTokenIssuanceCreate::doApply`** llama a `MPTokenIssuanceCreate::create`, que:
1. Comprueba la reserva para un objeto más con tu saldo previo a la fee (`tecINSUFFICIENT_RESERVE`).
2. Calcula el ID con `makeMptID(Sequence, Account)`.
3. Inserta la emisión en tu directorio de propietario y crea el objeto con `Issuer`, `OutstandingAmount = 0`, `Sequence`, los flags de la tx (sin `tfUniversal`) y los campos opcionales que hayas dado.
4. Sube tu `OwnerCount` en 1.

## Campos clave

- **AssetScale** — número de decimales para mostrar. El ledger guarda enteros; con `AssetScale: 2`, 100 unidades se muestran como 1,00.
- **MaximumAmount** — tope de unidades en circulación (string decimal, máximo 9223372036854775807). Si lo omites, el máximo es ese mismo valor.
- **TransferFee** — comisión al transferir entre dos tenedores que no son el emisor, en unidades de 0,001 % (100 = 0,1 %). Exige `tfMPTCanTransfer`.
- **MPTokenMetadata** — hasta 1024 bytes en hex. XLS-89 propone un esquema JSON (nombre, ticker, icono...).
- **DomainID** — restringe los tenedores a un dominio permisionado. No usable en testnet (`temDISABLED`).
- **ImmutableFlags** — qué propiedades no podrán cambiarse nunca con `MPTokenIssuanceSet`. Solo con `DynamicMPT`.

## Flags

- **tfMPTCanLock** (2) — el emisor podrá bloquear la emisión entera o a un tenedor con `MPTokenIssuanceSet`.
- **tfMPTRequireAuth** (4) — los tenedores necesitan que el emisor los autorice antes de recibir fondos.
- **tfMPTCanEscrow** (8) — el token puede depositarse en escrows.
- **tfMPTCanTrade** (16) — el token puede negociarse en el DEX (todavía sin uso en el código de ofertas).
- **tfMPTCanTransfer** (32) — los tenedores pueden enviarse el token entre sí. Sin él, solo se mueve entre emisor y tenedor.
- **tfMPTCanClawback** (64) — el emisor puede recuperar unidades con [Clawback](/tx/Clawback).
- **tfMPTCanHoldConfidentialBalance** (128) — saldos cifrados; requiere `ConfidentialTransfer`, no activo en testnet.

Los flags se guardan en el objeto como `lsfMPT*` con los mismos valores.

## Errores habituales

- **temMALFORMED** — `TransferFee` sin `tfMPTCanTransfer`, metadatos vacíos o demasiado largos, `MaximumAmount` 0.
- **temBAD_TRANSFER_FEE** — comisión mayor que 50000.
- **temDISABLED** — has usado `DomainID`, `ImmutableFlags` o el flag 128 en testnet.
- **tecINSUFFICIENT_RESERVE** — no tienes 0,2 XRP libres para el nuevo objeto.

## Ejemplo

```json
{
  "TransactionType": "MPTokenIssuanceCreate",
  "Account": "rXXXX_TU_CUENTA",
  "AssetScale": 2,
  "MaximumAmount": "100000000",
  "TransferFee": 100,
  "Flags": 32,
  "MPTokenMetadata": "7B226E616D65223A2244656D6F227D"
}
```

Los metadatos son `{"name":"Demo"}`. Suma `64` a `Flags` si quieres poder hacer clawback, o `4` para exigir autorización.

## Pruébalo en testnet

1. Carga el ejemplo y envía. En el resultado busca `mpt_issuance_id` (el nodo lo añade a los metadatos) o el `CreatedNode` de tipo `MPTokenIssuance`.
2. Consulta `account_objects` con `type: "mpt_issuance"`: verás la emisión con `OutstandingAmount: "0"`, `Flags: 32` y tus campos. `OwnerCount` ha subido en 1.
3. Desde la otra cuenta, envía [MPTokenAuthorize](/tx/MPTokenAuthorize) con ese `MPTokenIssuanceID` para crear su `MPToken`.
4. Desde tu cuenta, envía un [Payment](/tx/Payment) con `Amount: { "mpt_issuance_id": "…", "value": "1000" }` a la otra cuenta. `OutstandingAmount` pasa a 1000.
5. Prueba a añadir `"DomainID"` o `Flags: 160`: el nodo responde `temDISABLED`.

## Relacionado

- [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy), [MPTokenAuthorize](/tx/MPTokenAuthorize), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken)
- [MPTokensV1](/amendments/MPTokensV1), [DynamicMPT](/amendments/DynamicMPT), [ConfidentialTransfer](/amendments/ConfidentialTransfer), [SingleAssetVault](/amendments/SingleAssetVault)
