---
title: CheckCash
summary: Cobra un Check del que eres destinatario, por un importe exacto (Amount) o por lo máximo posible a partir de un mínimo (DeliverMin).
category: cheques
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/checkcash
xls: XLS-0011
amendment: Checks
level: intermedio
---

## Qué hace

`CheckCash` es la transacción con la que el destinatario de un [Check](/objects/Check) lo cobra. Solo puede enviarla la cuenta que figura como `Destination` en el cheque. Los fondos se mueven en ese momento desde la cuenta que emitió el cheque hacia la tuya; si el emisor no tiene saldo suficiente, el cobro falla y el cheque sigue en el ledger.

Hay dos modos, excluyentes: con `Amount` pides una cantidad exacta y la transacción falla si no se puede entregar entera; con `DeliverMin` pides "todo lo que se pueda hasta `SendMax`, siempre que sea al menos este mínimo", y el importe real queda en el campo `delivered_amount` de los metadatos. Si el cobro tiene éxito el cheque se borra y el emisor recupera su reserva.

Con tokens, el cobro pasa por el motor de pagos (`flow()`), igual que un `Payment` sin paths, así que puede aplicar el `TransferRate` del emisor del token. Gracias a [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine), si no tienes trust line con el emisor del token, se crea automáticamente al cobrar (pagando tú la reserva).

## Cuándo usarlo

- Aceptar un pago que te han enviado por cheque, sobre todo si tu cuenta usa `DepositAuth`.
- Cobrar parcialmente con `DeliverMin` cuando el emisor puede no tener todo el saldo.
- Recibir un token nuevo sin haber creado antes la trust line.

## Cómo funciona por dentro

**`CheckCash::preflight`** (estático). Con [fixCleanup3_3_0](/amendments/fixCleanup3_3_0) activo, un `CheckID` a cero es `temMALFORMED`. Debe haber exactamente uno de `Amount` o `DeliverMin` (`temMALFORMED` si hay ambos o ninguno). El importe elegido tiene que ser legal y positivo (`temBAD_AMOUNT`) y con moneda válida (`temBAD_CURRENCY`). Importes en MPT se rechazan en `checkExtraFeatures` mientras MPTokensV2 no exista en la red.

**`CheckCash::preclaim`** (contra el ledger). El cheque debe existir (`tecNO_ENTRY`) y tú debes ser su `Destination` (`tecNO_PERMISSION`). Si tu cuenta tiene `lsfRequireDestTag` pero el cheque no lleva `DestinationTag`, `tecDST_TAG_NEEDED`. Si `Expiration` ya pasó respecto al cierre del ledger padre, `tecEXPIRED`. El importe que pides debe ser de la misma moneda y emisor que el `SendMax` del cheque (`temMALFORMED`) y no superarlo (`tecPATH_PARTIAL`). Luego comprueba con `accountFunds` que el emisor del cheque dispone de al menos ese importe, ignorando fondos congelados o no autorizados; en XRP, se le suma una unidad de reserva (`fees().increment`) porque al cobrar el cheque el emisor libera la reserva del objeto. Si no llega, `tecPATH_PARTIAL`. Para tokens de los que no eres emisor: el emisor del token debe existir (`tecNO_ISSUER`); si tiene `lsfRequireAuth`, necesitas una trust line ya autorizada (`tecNO_AUTH`), porque no se puede crear una línea autorizada al vuelo; y tu trust line con el emisor no puede estar congelada (`tecFROZEN`).

**`CheckCash::doApply`** (efectos). Trabaja sobre un `PaymentSandbox`. Si el cheque es en XRP, calcula el líquido del emisor con `xrpLiquid` descontando su reserva menos un objeto (el cheque que va a desaparecer); con `DeliverMin` entrega `max(DeliverMin, min(SendMax, líquido))`, con `Amount` entrega exactamente `Amount`; si el líquido no llega, `tecUNFUNDED_PAYMENT`. Luego `transferXRP`. Si es en tokens: si no existe tu trust line con el emisor, comprueba que cubres la reserva de un objeto más (`tecNO_LINE_INSUF_RESERVE`) y la crea con `trustCreate` con límite 0 y el flag NoRipple según tu `lsfDefaultRipple`. Después eleva temporalmente el límite de tu trust line al máximo, para que el cobro no falle aunque supere tu `LimitAmount` (el código razona que si firmas el cobro es que quieres los fondos), llama a `flow()` con `SendMax` del cheque como tope y `partial payment` solo si usaste `DeliverMin`, y restaura el límite al salir. Si con `DeliverMin` el resultado es inferior al mínimo, `tecPATH_PARTIAL`. Registra `delivered_amount` en los metadatos en todos los casos. Por último quita el cheque de tu directorio y del emisor, baja el `OwnerCount` del emisor y borra el objeto.

## Campos clave

- **CheckID** — El `index` del objeto Check (hash de 64 hex). Lo obtienes en `account_objects` con `type: "check"`.
- **Amount** — Cantidad exacta a cobrar. Debe ser de la misma moneda que `SendMax` y no superarlo. Excluyente con `DeliverMin`.
- **DeliverMin** — Mínimo aceptable; el transactor intenta entregar lo máximo posible hasta `SendMax`. Excluyente con `Amount`. Mira `delivered_amount` en los metadatos para saber cuánto recibiste.

## Errores habituales

- **tecNO_ENTRY** — `CheckID` incorrecto o el cheque ya fue cobrado o cancelado.
- **tecNO_PERMISSION** — No eres el `Destination` del cheque.
- **tecEXPIRED** — El cheque ha caducado; cancélalo con [CheckCancel](/tx/CheckCancel) para liberar la reserva del emisor.
- **tecPATH_PARTIAL** — Pides más que `SendMax`, el emisor no tiene fondos suficientes (en preclaim), o con `DeliverMin` el resultado no alcanzó el mínimo.
- **tecUNFUNDED_PAYMENT** — Cheque en XRP cuyo emisor no tiene líquido suficiente por encima de su reserva.
- **temMALFORMED** — `Amount` y `DeliverMin` a la vez o ninguno, o la moneda no coincide con `SendMax`.
- **tecNO_LINE_INSUF_RESERVE** — Hace falta crear una trust line y no cubres su reserva.
- **tecNO_AUTH** — El emisor del token exige autorización y tu trust line no está autorizada.

## Ejemplo

Cobra 1 XRP exacto de un cheque cuyo `index` es el `CheckID`:

```json
{
  "TransactionType": "CheckCash",
  "Account": "rXXXX_TU_CUENTA",
  "CheckID": "49647F0D748DC3FE26BDACBC57F251AADEFFF391403EC9BF87C97F67E9977FB0",
  "Amount": "1000000"
}
```

Para cobrar "lo máximo posible, al menos 0,5 XRP", sustituye `Amount` por `"DeliverMin": "500000"`.

## Pruébalo en testnet

1. Desde la otra cuenta, crea un cheque a tu favor con [CheckCreate](/tx/CheckCreate) y `SendMax` `1000000`.
2. Consulta `account_objects` con `type: "check"` sobre tu cuenta y copia el `index` del cheque en `CheckID`.
3. Envía `CheckCash` con `Amount` `1000000`. Espera `tesSUCCESS`; en los metadatos verás `delivered_amount`.
4. Vuelve a consultar `account_objects`: el cheque ha desaparecido. `account_info` de tu cuenta muestra 1 XRP más (menos la fee) y el emisor ha recuperado una unidad de `OwnerCount`.
5. Repite la prueba con `Amount` mayor que `SendMax` para ver `tecPATH_PARTIAL`, o desde una cuenta que no sea el destino para ver `tecNO_PERMISSION`.

## Relacionado

- [CheckCreate](/tx/CheckCreate) — emite el cheque.
- [CheckCancel](/tx/CheckCancel) — retira o limpia un cheque.
- [Check](/objects/Check) — el objeto que se consume.
- [Checks](/amendments/Checks) — amendment de los cheques.
- [CheckCashMakesTrustLine](/amendments/CheckCashMakesTrustLine) — creación automática de la trust line al cobrar.
- [TrustSet](/tx/TrustSet) — crear la trust line a mano si el emisor exige autorización.
