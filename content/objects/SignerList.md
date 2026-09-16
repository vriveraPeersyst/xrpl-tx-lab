---
title: SignerList
summary: La lista de firmantes autorizados y el quórum necesario para operar una cuenta en modo multifirma.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/signerlist
createdBy: SignerListSet
modifiedBy: SignerListSet
reserve: 1
---

## Qué representa

Un `SignerList` sustituye (o complementa) la firma con la clave maestra o la regular key de una cuenta por un esquema de "m de n": hasta 32 firmantes posibles, cada uno con un `SignerWeight`, y un `SignerQuorum` mínimo que hay que alcanzar sumando pesos para que una transacción `multisign` sea válida. La cuenta puede seguir firmando con su clave normal salvo que además active `lsfDisableMaster` en su `AccountRoot`, en cuyo caso el `SignerList` (o una regular key) es la única vía.

Cada cuenta solo puede tener un `SignerList` a la vez: fijar uno nuevo reemplaza el anterior por completo, no lo añade.

## Ciclo de vida

- **Creación**: [SignerListSet](/tx/SignerListSet) con `SignerQuorum` mayor que cero y de 1 a 32 `SignerEntries`. Cada firmante puede ser una cuenta normal o (con [ExpandedSignerList](/amendments/ExpandedSignerList)) llevar asociado un `WalletLocator`.
- **Reemplazo**: el mismo [SignerListSet](/tx/SignerListSet) sobre una cuenta que ya tiene lista, sustituye `SignerEntries` y `SignerQuorum` enteros.
- **Borrado**: [SignerListSet](/tx/SignerListSet) con `SignerQuorum: 0` y sin `SignerEntries`, lo que elimina la lista y devuelve la reserva.

## Campos clave

- **SignerQuorum** — suma mínima de pesos necesaria para que una transacción multifirmada sea válida.
- **SignerEntries** — hasta 32 entradas, cada una con `Account` (firmante) y `SignerWeight` (su peso en la suma).
- **SignerListID** — siempre 0 en la implementación actual; reservado por si algún día se soportan varias listas por cuenta.
- **Owner** — presente solo cuando la reserva de esta lista la cubre un [Sponsorship](/objects/Sponsorship) en vez de la propia cuenta.

## Flags

- **lsfOneOwnerCount** — indica que, pese a existir dos objetos internos relacionados con signer lists en versiones antiguas del protocolo, solo cuenta 1 unidad de owner reserve (detalle histórico de compatibilidad, no relevante para el uso normal).

## Cómo consultarlo

`account_objects` con `type: "signer_list"` lo devuelve para la cuenta. Con `ledger_entry`, `signer_list` solo acepta el ID del objeto directamente (no hay parámetros derivados, porque el índice de la lista principal es fijo por cuenta):

```json
{ "method": "ledger_entry", "params": [{ "signer_list": "E6DBAFC99223B42257915A63DFC6B0C032D4C1F5F3EF6D9C2CE6A9C84C41Ff", "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0053 || AccountID || 0)` (`keylet::signerList`, namespace `'S'`, con el "page" fijo a 0 en la implementación actual). En la práctica es más directo pedirlo con `account_objects` o con el método dedicado `account_info` (parámetro `signer_lists: true`), que ya lo trae embebido. Respuesta típica:

```json
{
  "index": "E6DBAFC99223B42257915A63DFC6B0C032D4C1F5F3EF6D9C2CE6A9C84C41Ff",
  "node": {
    "LedgerEntryType": "SignerList",
    "SignerQuorum": 3,
    "SignerEntries": [
      { "SignerEntry": { "Account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy", "SignerWeight": 2 } },
      { "SignerEntry": { "Account": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "SignerWeight": 1 } }
    ],
    "SignerListID": 0,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet), independientemente de cuántos firmantes tenga la lista.

## Relacionado

- [SignerListSet](/tx/SignerListSet)
- [AccountRoot](/objects/AccountRoot), [Sponsorship](/objects/Sponsorship)
- [ExpandedSignerList](/amendments/ExpandedSignerList), [MultiSignReserve](/amendments/MultiSignReserve)
