---
title: CheckCancel
summary: Elimina un Check sin cobrarlo; lo puede hacer el emisor o el destinatario en cualquier momento, y cualquiera si ya ha caducado.
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcancel
xls: XLS-0011
amendment: Checks
level: básico
---

## Qué hace

`CheckCancel` borra un objeto [Check](/objects/Check) del ledger sin mover fondos. Sirve para que el emisor retire un cheque que ya no quiere pagar, para que el destinatario lo rechace, o para que cualquiera limpie un cheque caducado. Al eliminarlo, el emisor del cheque recupera la unidad de owner reserve que el objeto ocupaba.

Como un cheque nunca bloquea fondos, cancelarlo no tiene ningún efecto sobre saldos: solo desaparece el compromiso.

## Cuándo usarlo

- Retirar un cheque emitido por error o que ya no procede pagar.
- Rechazar un cheque recibido que no quieres cobrar.
- Liberar reserva eliminando cheques caducados, propios o ajenos.

## Cómo funciona por dentro

**`CheckCancel::preflight`** (estático). Con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) activo, como en testnet, un `CheckID` a cero es `temMALFORMED`. No hay más validaciones específicas.

**`CheckCancel::preclaim`** (contra el ledger). Lee el cheque por `keylet::check(CheckID)`; si no existe, `tecNO_ENTRY`. Después decide quién puede cancelar en función de la caducidad, evaluada con `hasExpired` contra el tiempo de cierre del ledger padre (el código justifica usar el ledger padre porque es el único cuyo cierre se conoce con certeza): si el cheque **no** ha caducado, la cuenta que firma tiene que ser el `Account` (emisor) o el `Destination` del cheque; de lo contrario `tecNO_PERMISSION`. Si ya ha caducado, cualquiera puede cancelarlo. Un cheque sin `Expiration` nunca caduca, así que solo lo pueden cancelar sus dos partes.

**`CheckCancel::doApply`** (efectos). Vuelve a cargar el cheque (`tecNO_ENTRY` si no está), lo elimina del owner directory del destino (siempre que no sea un cheque a uno mismo, que `CheckCreate` impide) y del directorio del emisor; si alguna eliminación falla, `tefBAD_LEDGER`. Después decrementa el `OwnerCount` del emisor con `decreaseOwnerCountForObject` y borra el objeto. No toca ningún `Balance` aparte de la fee de quien envía.

## Campos clave

- **CheckID** — El `index` del objeto Check (hash de 64 hex). Es el único campo propio. Lo obtienes en `account_objects` con `type: "check"` de la cuenta emisora o de la destinataria.

## Errores habituales

- **tecNO_ENTRY** — No hay ningún cheque con ese `CheckID`; quizá ya fue cobrado o cancelado.
- **tecNO_PERMISSION** — El cheque no ha caducado y no eres ni su emisor ni su destinatario.
- **temMALFORMED** — `CheckID` es todo ceros.
- **tefBAD_LEDGER** — Fallo interno al retirar el objeto de un directorio; no debería ocurrir.

## Ejemplo

```json
{
  "TransactionType": "CheckCancel",
  "Account": "rXXXX_TU_CUENTA",
  "CheckID": "49647F0D748DC3FE26BDACBC57F251AADEFFF391403EC9BF87C97F67E9977FB0"
}
```

## Pruébalo en testnet

1. Crea un cheque con [CheckCreate](/tx/CheckCreate) hacia la otra cuenta, con o sin `Expiration`.
2. Consulta `account_objects` con `type: "check"` sobre tu cuenta y copia el `index` en `CheckID`.
3. Envía `CheckCancel` desde tu cuenta (eres el emisor): `tesSUCCESS`.
4. Vuelve a consultar `account_objects`: el cheque ya no aparece, ni en tu cuenta ni en la del destino. En `account_info`, tu `OwnerCount` ha bajado en uno y el `Balance` solo refleja la fee.
5. Para ver el control de permisos: crea otro cheque, y prueba a cancelarlo desde una tercera cuenta que no sea emisor ni destino. Obtendrás `tecNO_PERMISSION` mientras no haya caducado. Si le pusiste una `Expiration` corta (`{{time+120}}`), espera y reintenta desde esa tercera cuenta: ahora sí se cancela.

## Relacionado

- [CheckCreate](/tx/CheckCreate) — emite el cheque.
- [CheckCash](/tx/CheckCash) — la alternativa: cobrarlo.
- [Check](/objects/Check) — el objeto eliminado.
- [Checks](/amendments/Checks) — amendment que introdujo los cheques.
- [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) — rechaza `CheckID` a cero.
