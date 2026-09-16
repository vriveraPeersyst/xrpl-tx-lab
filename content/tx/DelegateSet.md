---
title: DelegateSet
summary: Autoriza a otra cuenta a enviar en tu nombre transacciones concretas, sin darle tus claves.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/delegateset
amendment: PermissionDelegationV1_1
level: avanzado
---

## Qué hace

`DelegateSet` crea o actualiza un objeto `Delegate`: una lista de permisos que tu cuenta concede a otra cuenta (`Authorize`) para operar en tu nombre. En lugar de compartir tu clave privada o configurar un [SignerList](/objects/SignerList) completo, delegas selectivamente qué tipos de transacción —o qué permisos granulares— puede firmar esa otra cuenta como si fuera tuya.

Enviar la transacción con una lista de permisos vacía (`Permissions: []`) sobre una delegación existente la elimina; no hay una transacción `DelegateDelete` separada.

**Este tipo de transacción depende del amendment `PermissionDelegationV1_1`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla con `temDISABLED` hasta que se active.

## Cuándo usarlo (cuando el amendment esté activo)

- Dar a un servicio automatizado (un bot, un backend) permiso para enviar `Payment` en tu nombre sin exponerle tu clave maestra.
- Delegar operaciones concretas del DEX (crear/cancelar ofertas) a una cuenta de trading separada de tu cuenta de custodia.
- Conceder permisos granulares (p. ej. `TrustlineAuthorize`) sin delegar la totalidad de un tipo de transacción.

## Cómo funciona por dentro

**`DelegateSet::preflight`** limita `Permissions` a un máximo de entradas (`temARRAY_TOO_LARGE`), impide autorizarte a ti mismo (`Account == Authorize` da `temMALFORMED`), rechaza permisos repetidos en la misma lista y comprueba, vía `Permission::getInstance().isDelegable`, que cada valor es un tipo de transacción o permiso realmente delegable (algunas transacciones sensibles, como las de cuenta o de gobernanza, no se pueden delegar).

**`DelegateSet::preclaim`** exige que la cuenta `Authorize` exista (`tecNO_TARGET` si no) y que no sea una pseudo-cuenta como un AMM o Vault (`tecPSEUDO_ACCOUNT`). Si envías `Permissions` vacío para borrar una delegación que no existe, falla con `tecNO_ENTRY`.

**`DelegateSet::doApply`** busca un objeto `Delegate` existente para el par (tu cuenta, `Authorize`): si existe y la lista de permisos que envías está vacía, lo borra; si existe y la lista no está vacía, la sustituye entera; si no existe, crea el objeto (comprobando reserva de propietario, `tecDIR_FULL` si algún directorio está lleno) y lo enlaza tanto en tu directorio de propietario como en el de la cuenta autorizada, para que `AccountDelete` pueda limpiarlo si esa cuenta se borra más adelante.

## Campos clave

- **Authorize** — la cuenta a la que concedes permisos. No puede ser tu propia cuenta ni una pseudo-cuenta.
- **Permissions** — lista de permisos delegados, cada uno como `{ Permission: { PermissionValue: "..." } }`. Puede ser el nombre de un tipo de transacción (p. ej. `"Payment"`) o un permiso granular más específico (ver `/permissions`). Una lista vacía elimina la delegación existente.

## Errores habituales

- **temDISABLED** — el amendment `PermissionDelegationV1_1` no está activo (el caso actual en testnet).
- **temMALFORMED** — intentas delegar en tu propia cuenta, repites un permiso en la lista, o incluyes un permiso no delegable.
- **tecNO_TARGET** — la cuenta `Authorize` no existe.
- **tecPSEUDO_ACCOUNT** — `Authorize` es una pseudo-cuenta (AMM, Vault, LoanBroker).
- **tecNO_ENTRY** — envías una lista de permisos vacía sobre una delegación que no existía.
- **tecDIR_FULL** — el directorio de propietario de alguna de las dos cuentas está lleno.

## Pruébalo en testnet

Como el amendment `PermissionDelegationV1_1` no está activo hoy en testnet, cualquier `DelegateSet` que envíes desde el builder de esta página devolverá `temDISABLED`. Puedes comprobarlo igualmente: firma y envía el ejemplo y observa el código de resultado. Cuando la red active el amendment, el mismo flujo creará el objeto `Delegate` y podrás consultarlo con `account_objects` (`type: "delegate"`).

## Ejemplo

```json
{
  "TransactionType": "DelegateSet",
  "Account": "rXXXX_TU_CUENTA",
  "Authorize": "rYYYY_OTRA_CUENTA",
  "Permissions": [
    { "Permission": { "PermissionValue": "Payment" } },
    { "Permission": { "PermissionValue": "TrustlineAuthorize" } }
  ]
}
```

Delegaría en `rYYYY_OTRA_CUENTA` la capacidad de enviar `Payment` y autorizar trust lines en tu nombre, una vez el amendment esté activo.

## Relacionado

- [SignerListSet](/tx/SignerListSet) — multifirma completa, alternativa más pesada a la delegación selectiva.
- [AccountDelete](/tx/AccountDelete) — limpia las delegaciones entrantes y salientes al borrar una cuenta.
- Amendments: [PermissionDelegationV1_1](/amendments/PermissionDelegationV1_1).
