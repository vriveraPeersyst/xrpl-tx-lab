---
title: CheckCreate
summary: Crea un Check, un pago diferido que el destinatario decide cuándo cobrar (hasta un máximo SendMax) o dejar caducar.
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcreate
xls: XLS-0011
amendment: Checks
level: básico
---

## Qué hace

`CheckCreate` emite un [Check](/objects/Check) a favor de otra cuenta. Funciona como un cheque bancario: tú firmas un compromiso de pagar hasta `SendMax`, pero el dinero **no sale de tu cuenta** al crearlo. Es el destinatario quien lo cobra más tarde con [CheckCash](/tx/CheckCash), y en ese momento se comprueba si tienes fondos. Si prefieres retirarlo, o si caduca, se elimina con [CheckCancel](/tx/CheckCancel).

A diferencia de un `Payment`, el destinatario tiene que actuar para recibir los fondos, lo que encaja con cuentas que exigen `DepositAuth`. A diferencia de un escrow, los fondos no quedan bloqueados: si al cobrar no tienes saldo, el cobro falla. El objeto consume una unidad de owner reserve de tu cuenta mientras exista.

## Cuándo usarlo

- Pagar a cuentas con `asfDepositAuth`, que rechazan pagos entrantes directos.
- Ofrecer un pago que el receptor puede aceptar total o parcialmente cuando le convenga.
- Enviar tokens a alguien que aún no tiene trust line: `CheckCash` puede crearla al cobrar ([CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine)).
- Facturación con referencia: `InvoiceID` viaja en el cheque hasta que se cobra.

## Cómo funciona por dentro

**`CheckCreate::preflight`** (estático). Un cheque a ti mismo se rechaza con `temREDUNDANT`. `SendMax` tiene que ser un importe legal y positivo (`temBAD_AMOUNT`) con una moneda válida (`temBAD_CURRENCY`). Si pones `Expiration`, no puede ser 0 (`temBAD_EXPIRATION`). `checkExtraFeatures` rechaza un `SendMax` en MPT mientras MPTokensV2 no exista en la red; en testnet solo puedes emitir cheques en XRP o IOU.

**`CheckCreate::preclaim`** (contra el ledger). El destino debe existir (`tecNO_DST`), no tener `lsfDisallowIncomingCheck` ni ser una pseudo-cuenta (`tecNO_PERMISSION`), y si tiene `lsfRequireDestTag` exige `DestinationTag` (`tecDST_TAG_NEEDED`). Para un `SendMax` en tokens: la moneda no puede estar globalmente congelada por el emisor; si tú tienes trust line con el emisor, no puede estar congelada por él; y la trust line del destino con el emisor tampoco puede estar congelada (`tecFROZEN`). El código permite explícitamente crear un cheque de una moneda para la que todavía no tienes trust line. Por último, si `Expiration` ya ha pasado respecto al cierre del ledger padre, `tecEXPIRED`.

**`CheckCreate::doApply`** (efectos). Comprueba que cubres la reserva con un objeto más, usando el saldo previo a la fee (`checkReserve` con `preFeeBalance_`), de modo que se permite "morder" la reserva para pagar la fee pero no para el objeto nuevo. Crea la entrada `Check` indexada por tu cuenta y el `Sequence` (o Ticket) de la transacción, copiando `Destination`, `SendMax`, `SourceTag`, `DestinationTag`, `InvoiceID` y `Expiration`. Inserta el objeto en el owner directory del destino y en el tuyo, y sube tu `OwnerCount` en uno. Tu `Balance` no cambia salvo por la fee.

## Campos clave

- **SendMax** — Máximo que autorizas a cobrar. En drops si es XRP; `{currency, issuer, value}` para tokens. Con tokens, el cobro pasa por `flow()` y puede aplicar el `TransferRate` del emisor, por lo que el destinatario puede recibir menos de `SendMax`.
- **Expiration** — Segundos desde el Ripple Epoch (2000-01-01), no Unix. Pasada esa hora el cheque no se puede cobrar y cualquiera puede cancelarlo.
- **InvoiceID** — Hash de 256 bits arbitrario que se guarda en el objeto como referencia.
- **DestinationTag** — Obligatorio si el destino tiene `lsfRequireDestTag`. Se comprueba también en el cobro.

## Errores habituales

- **temREDUNDANT** — `Destination` es tu propia cuenta.
- **tecNO_DST** — La cuenta destino no existe.
- **tecNO_PERMISSION** — El destino activó `asfDisallowIncomingCheck` (amendment [DisallowIncoming](/amendments/DisallowIncoming)).
- **tecDST_TAG_NEEDED** — Falta `DestinationTag` y el destino lo exige.
- **tecEXPIRED** — `Expiration` ya está en el pasado.
- **tecINSUFFICIENT_RESERVE** — No tienes XRP para la reserva de un objeto más (0,2 XRP en testnet).
- **tecFROZEN** — Cheque en tokens cuya trust line (tuya o del destino) está congelada, o moneda con global freeze.

## Ejemplo

Cheque de hasta 1 XRP que caduca en un día (843086400 ≈ ahora + 86 400 s en Ripple Epoch):

```json
{
  "TransactionType": "CheckCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "SendMax": "1000000",
  "Expiration": 843086400
}
```

## Pruébalo en testnet

1. En el builder, deja `SendMax` en `1000000` drops y una `Expiration` futura (`{{time+86400}}`). Firma y envía; espera `tesSUCCESS`.
2. Consulta `account_objects` con `type: "check"` sobre tu cuenta: verás el objeto con su `index`. Ese `index` es el `CheckID` que necesitará el destinatario en `CheckCash` o cualquiera en `CheckCancel`.
3. Consulta `account_info`: tu `Balance` solo ha bajado la fee (el cheque no mueve fondos) y tu `OwnerCount` ha subido en uno.
4. Consulta `account_objects` con `type: "check"` sobre la cuenta destino: el mismo cheque aparece también ahí, aunque la reserva la pagas tú.
5. Cóbralo desde la otra cuenta con [CheckCash](/tx/CheckCash) o retíralo con [CheckCancel](/tx/CheckCancel).

## Relacionado

- [CheckCash](/tx/CheckCash) — el destinatario cobra el cheque.
- [CheckCancel](/tx/CheckCancel) — retira un cheque (o limpia uno caducado).
- [Check](/objects/Check) — el objeto creado.
- [Checks](/amendments/Checks) — amendment que introdujo los cheques.
- [DisallowIncoming](/amendments/DisallowIncoming) — permite bloquear cheques entrantes con `asfDisallowIncomingCheck`.
- [Payment](/tx/Payment) — la alternativa inmediata.
