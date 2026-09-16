---
title: MPTokenAuthorize
summary: Crea o elimina tu MPToken (el objeto que te habilita como tenedor) y, si el emisor lo requiere, lo autoriza.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenauthorize
amendment: MPTokensV1
level: intermedio
---

## Qué hace

Para un Multi-Purpose Token (MPT) no basta con recibir un pago: cada tenedor necesita antes un objeto [MPToken](/objects/MPToken) que lo vincula a la emisión concreta ([MPTokenIssuance](/objects/MPTokenIssuance)), algo parecido a lo que hace `TrustSet` con las trust lines de IOU, pero por-emisión y sin límites configurables. `MPTokenAuthorize` es la transacción que gestiona ese vínculo, y cumple dos papeles distintos según quién la envía y con qué flag.

Si la envía el propio tenedor sin `Holder`: crea su `MPToken` (para poder recibir el token) o, con el flag `tfMPTUnauthorize`, lo elimina (para dejar de sostenerlo). Si la envía el emisor con `Holder`: autoriza o desautoriza a ese tenedor concreto, pero solo tiene efecto sobre emisiones creadas con `lsfMPTRequireAuth` — un allowlist explícito, igual que `RequireAuth` en trust lines.

## Cuándo usarlo

- Antes de poder recibir un MPT por primera vez, crea tu `MPToken` con esta transacción (análogo a crear la trust line para un IOU).
- El emisor de una MPT con `lsfMPTRequireAuth` autoriza a un tenedor concreto tras verificarlo.
- Un tenedor con saldo cero que ya no quiere sostener el token elimina su `MPToken` para recuperar la reserva.
- El emisor revoca la autorización a un tenedor (`tfMPTUnauthorize` desde la cuenta emisora) sin necesidad de un clawback.

## Cómo funciona por dentro

**`MPTokenAuthorize::preflight`** solo rechaza el caso trivial de que `Account` y `Holder` sean la misma cuenta (`temMALFORMED`): no tiene sentido que el emisor se "autorice" a sí mismo con este campo.

**`MPTokenAuthorize::preclaim`** se ramifica según si `Holder` está presente. Sin `Holder` (lo envía el tenedor sobre sí mismo): con `tfMPTUnauthorize`, exige que el `MPToken` exista (`tecOBJECT_NOT_FOUND`), que su saldo público y bloqueado sean cero (`tecHAS_OBLIGATIONS` si no) y, si está bloqueado por el emisor, no permite eliminarlo (`tecNO_PERMISSION`); sin ese flag, exige que la emisión exista (`tecOBJECT_NOT_FOUND`), que no seas tú el emisor (`tecNO_PERMISSION`) y que no tengas ya un `MPToken` para ella (`tecDUPLICATE`). Con `Holder` (lo envía el emisor): la cuenta indicada debe existir (`tecNO_DST`), la emisión debe existir y tener `lsfMPTRequireAuth` (`tecNO_AUTH` si no lo requiere) y el tenedor debe haber creado ya su `MPToken` antes de que el emisor pueda autorizarlo (`tecOBJECT_NOT_FOUND` si no).

**`MPTokenAuthorize::doApply`** crea, borra o cambia el flag `lsfMPTAuthorized` del `MPToken` según el camino anterior, ajustando la reserva de propietario correspondiente.

## Campos clave

- **MPTokenIssuanceID** — el identificador de la emisión sobre la que operas.
- **Holder** — solo lo usa el emisor, para autorizar o desautorizar a un tenedor concreto. Un tenedor gestionando su propio `MPToken` lo omite.

## Flags

- **tfMPTUnauthorize** — invierte el sentido de la operación: el tenedor elimina su `MPToken` (sin `Holder`) o el emisor retira la autorización a un tenedor (con `Holder`).

## Errores habituales

- **tecOBJECT_NOT_FOUND** — intentas operar sobre una emisión o un `MPToken` que no existe.
- **tecDUPLICATE** — ya tienes un `MPToken` para esa emisión; no hace falta crearlo de nuevo.
- **tecHAS_OBLIGATIONS** — intentas eliminar tu `MPToken` con saldo (público o bloqueado) distinto de cero. Transfiere o quema el saldo antes.
- **tecNO_AUTH** — el emisor intenta autorizar a un tenedor en una emisión que no tiene `lsfMPTRequireAuth`; no hace falta autorización.
- **tecNO_PERMISSION** — el emisor intenta crear un `MPToken` para sí mismo, o el `MPToken` está bloqueado y no se puede eliminar.
- **tecNO_DST** — el `Holder` indicado por el emisor no existe como cuenta.

## Ejemplo

```json
{
  "TransactionType": "MPTokenAuthorize",
  "Account": "rXXXX_TU_CUENTA",
  "MPTokenIssuanceID": "000000000000000000000000000000000000000000000000"
}
```

Crea tu `MPToken` para la emisión indicada, habilitándote a recibir ese MPT.

## Pruébalo en testnet

1. Necesitas una emisión existente: créala primero con `MPTokenIssuanceCreate` desde otra cuenta.
2. Firma y envía el ejemplo con el `MPTokenIssuanceID` real de esa emisión.
3. Consulta `account_objects` con `type: "mptoken"`: verás tu objeto `MPToken` con saldo cero.
4. Pide a la cuenta emisora que te envíe un `Payment` con `Amount: { mpt_issuance_id, value }`: tu saldo subirá.
5. Con saldo en cero de nuevo, envía `MPTokenAuthorize` con `Flags: 1` (`tfMPTUnauthorize`) para eliminar tu `MPToken` y recuperar la reserva.

## Relacionado

- [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) — bloquea o desbloquea tenedores o la emisión completa.
- [Payment](/tx/Payment) — mueve saldo de MPT entre `MPToken` ya creados.
- Objetos: [MPToken](/objects/MPToken), [MPTokenIssuance](/objects/MPTokenIssuance).
- Amendments: [MPTokensV1](/amendments/MPTokensV1).
