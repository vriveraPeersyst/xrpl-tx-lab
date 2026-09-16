---
title: MPTokenIssuance
summary: Define un Multi-Purpose Token: quién lo emite, cuántas unidades hay en circulación y qué permisos tiene.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/mptokenissuance
createdBy: MPTokenIssuanceCreate
modifiedBy: MPTokenIssuanceSet
reserve: 1
---

## Qué representa

`MPTokenIssuance` es la "fábrica" de un tipo de MPT: un activo fungible más simple y barato que un token emitido clásico (no usa `Currency` de 3/20 caracteres ni líneas de confianza bidireccionales). Todo el comportamiento del token — si se puede transferir entre terceros, si requiere autorización, si el emisor puede congelarlo o hacer clawback — se decide de una vez al crearlo, mediante flags, y no puede cambiarse después salvo lo que explícitamente permita `MPTokenIssuanceSet`.

Cada titular que quiera tenerlo necesita su propio [MPToken](/objects/MPToken); la emisión en sí no guarda saldos individuales, solo el total en circulación.

## Ciclo de vida

- **Creación**: [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), por el emisor. Fija los flags inmutables (`lsfMPTCanTransfer`, `lsfMPTCanLock`, `lsfMPTCanEscrow`, `lsfMPTRequireAuth`, `lsfMPTCanTrade`, `lsfMPTCanClawback`), `AssetScale` (decimales), `MaximumAmount` (tope de emisión, opcional) y `MPTokenMetadata`. `Sequence` de la cuenta emisora en el momento de la creación forma parte de la clave.
- **Actualización limitada**: [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), solo para bloquear/desbloquear la emisión completa (si tiene `lsfMPTCanLock`) o autorizar/desautorizar titulares concretos si exige `lsfMPTRequireAuth`; no cambia los flags de capacidades ni `MaximumAmount`.
- **Emisión y quema**: cada `Payment` del emisor hacia un titular aumenta `OutstandingAmount`; un `Payment` de vuelta al emisor, o un `Clawback`, lo reduce.
- **Borrado**: [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy), solo si `OutstandingAmount` es cero (nadie tiene saldo pendiente).

## Campos clave

- **Issuer / Sequence** — quien emite y la secuencia de cuenta en la creación; juntos forman el `MPTokenIssuanceID` de 192 bits.
- **AssetScale** — número de decimales: `MPTAmount` se expresa en la unidad mínima, dividida por `10^AssetScale` para el valor "humano".
- **MaximumAmount** — tope de `OutstandingAmount` permitido; si no está, la emisión es ilimitada.
- **OutstandingAmount** — total en circulación ahora mismo, sumando todos los `MPToken` de todos los titulares.
- **TransferFee** — comisión en puntos básicos (0-50000, hasta 50 %) que cobra el emisor en transferencias entre terceros, si `lsfMPTCanTransfer` está activo.
- **DomainID** — si está presente, solo cuentas con acceso a ese [PermissionedDomain](/objects/PermissionedDomain) pueden operar con el MPT en el DEX.
- **MPTokenMetadata** — bytes libres (hasta 1024) para nombre, ticker, icono u otros metadatos que decida el emisor.

## Flags

- **lsfMPTLocked** — toda la emisión está congelada por el emisor; ningún titular puede mover saldo.
- **lsfMPTCanLock** — el emisor puede congelar la emisión completa o balances individuales.
- **lsfMPTRequireAuth** — los titulares necesitan autorización explícita del emisor antes de poder recibir saldo.
- **lsfMPTCanEscrow** — el MPT se puede usar en un `Escrow`.
- **lsfMPTCanTrade** — el MPT se puede colocar en el DEX (`OfferCreate`).
- **lsfMPTCanTransfer** — los titulares pueden transferirse el MPT entre sí, no solo con el emisor.
- **lsfMPTCanClawback** — el emisor puede recuperar saldo de un titular con `Clawback`.
- **lsfMPTCanHoldConfidentialBalance** — la emisión soporta balances cifrados (transferencias confidenciales).

## Cómo consultarlo

`account_objects` con `type: "mpt_issuance"` lo devuelve para el `Issuer`. Con `ledger_entry`, `mpt_issuance` acepta directamente el `MPTokenIssuanceID` como cadena hex:

```json
{ "method": "ledger_entry", "params": [{ "mpt_issuance": "00000C8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F", "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x007E || MPTokenIssuanceID)` (`keylet::mptokenIssuance`, namespace `'~'`); el propio `MPTokenIssuanceID` ya combina la secuencia de la cuenta y el `AccountID` del emisor (`makeMptID`). Respuesta típica:

```json
{
  "index": "9C1E3B5D7F9A1C3E5B7D9F1A3C5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F7A9C1E",
  "node": {
    "LedgerEntryType": "MPTokenIssuance",
    "Issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "AssetScale": 2,
    "MaximumAmount": "1000000000",
    "OutstandingAmount": "5000",
    "TransferFee": 250,
    "Flags": 48,
    "OwnerNode": "0"
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del emisor.

## Relacionado

- [MPTokenIssuanceCreate](/tx/MPTokenIssuanceCreate), [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy)
- [MPToken](/objects/MPToken), [PermissionedDomain](/objects/PermissionedDomain)
- [DynamicMPT](/amendments/DynamicMPT)
