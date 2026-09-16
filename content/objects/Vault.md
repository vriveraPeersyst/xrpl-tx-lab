---
title: Vault
summary: Un pool de un único activo (Single Asset Vault) que agrupa depósitos de varios usuarios y emite un MPT que representa la participación de cada uno.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/vault
createdBy: VaultCreate
modifiedBy: VaultSet, VaultDeposit, VaultWithdraw, VaultClawback
reserve: 2
---

## Qué representa

Un `Vault` es un cajón compartido de un solo activo (`Asset`: XRP, un token emitido o un MPT): los depositantes meten ese activo y a cambio reciben unidades de `ShareMPTID`, un [MPTokenIssuance](/objects/MPTokenIssuance) creado automáticamente junto al vault que representa su parte proporcional. El valor del activo depositado puede crecer (por ejemplo, prestado a través de un [LoanBroker](/objects/LoanBroker) que genera intereses) sin que haga falta mover el capital de cada depositante individualmente: basta con que suba `AssetsTotal` para que cada unidad de `ShareMPTID` valga más.

Puede ser público (`lsfVaultPrivate` ausente, cualquiera deposita) o privado (solo cuentas con acceso a un [PermissionedDomain](/objects/PermissionedDomain) concreto).

## Ciclo de vida

- **Creación**: [VaultCreate](/tx/VaultCreate), por el `Owner`. Fija `Asset`, `WithdrawalPolicy` (cómo se procesan las retiradas) y, si es privado, el `DomainID` que restringe quién puede participar. Crea automáticamente el `ShareMPTID` asociado.
- **Configuración**: [VaultSet](/tx/VaultSet) ajusta parámetros mutables como `AssetsMaximum` o el `DomainID` de un vault privado.
- **Depósito/retirada**: [VaultDeposit](/tx/VaultDeposit) mete activo y entrega `ShareMPTID`; [VaultWithdraw](/tx/VaultWithdraw) devuelve `ShareMPTID` y saca el activo proporcional, sujeto a `AssetsAvailable` (lo que no está prestado a un `LoanBroker`).
- **Clawback**: [VaultClawback](/tx/VaultClawback), solo si el activo subyacente permite clawback, deja al emisor recuperar activo de un depositante concreto.
- **Borrado**: [VaultDelete](/tx/VaultDelete), solo cuando `AssetsTotal` es cero (todo el mundo ha retirado).

## Campos clave

- **Owner / Account** — quien controla el vault (fija sus parámetros) y la cuenta interna que custodia los fondos, respectivamente; suelen coincidir en la práctica.
- **Asset** — el único activo que acepta este vault, fijado para siempre en la creación.
- **AssetsTotal / AssetsAvailable / AssetsMaximum** — el total teórico (incluyendo lo prestado), lo líquido disponible para retirar ahora mismo, y el tope de capital que acepta el vault.
- **ShareMPTID** — el `MPTokenIssuance` que representa la participación de cada depositante; su `OutstandingAmount` es el total de "acciones" del vault.
- **WithdrawalPolicy** — cómo se resuelven las retiradas cuando no hay liquidez inmediata (p. ej. cola de espera vs. rechazo).
- **LossUnrealized** — pérdidas detectadas pero aún no repercutidas en el valor por unidad de `ShareMPTID` (p. ej. por un préstamo impagado sin liquidar del todo).
- **Data** — bytes libres para metadatos del vault.

## Flags

- **lsfVaultPrivate** — el vault solo acepta depósitos de cuentas con credenciales aceptadas por su `DomainID`; sin este flag, es abierto a cualquiera.

## Cómo consultarlo

`account_objects` con `type: "vault"` lo devuelve para el `Owner`. Con `ledger_entry`, `vault` acepta `owner` y `seq` (la `Sequence` de la `VaultCreate`):

```json
{ "method": "ledger_entry", "params": [{ "vault": { "owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "seq": 20790113 }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0056 || AccountID_owner || Sequence)` (`keylet::vault`, namespace `'V'`). Respuesta típica:

```json
{
  "index": "5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C4D5E6F",
  "node": {
    "LedgerEntryType": "Vault",
    "Owner": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Asset": { "currency": "XRP" },
    "AssetsTotal": "1000000000",
    "AssetsAvailable": "400000000",
    "ShareMPTID": "00000D8B1D9F0C3A5E7B9D1F3A5C7E9B1D3F5A7C9E1B3D5F",
    "Flags": 0,
    "OwnerNode": "0"
  }
}
```

## Reserva

Consume 2 unidades de reserva de propietario (0,4 XRP en testnet) del `Owner`: una por el propio `Vault` y otra por el `MPTokenIssuance` de `ShareMPTID` que se crea con él.

## Relacionado

- [VaultCreate](/tx/VaultCreate), [VaultSet](/tx/VaultSet), [VaultDeposit](/tx/VaultDeposit), [VaultWithdraw](/tx/VaultWithdraw), [VaultClawback](/tx/VaultClawback), [VaultDelete](/tx/VaultDelete)
- [LoanBroker](/objects/LoanBroker), [MPTokenIssuance](/objects/MPTokenIssuance), [PermissionedDomain](/objects/PermissionedDomain)
