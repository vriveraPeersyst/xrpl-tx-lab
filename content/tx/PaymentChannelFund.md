---
title: PaymentChannelFund
summary: Añade XRP a un canal de pago abierto y, opcionalmente, fija o retrasa su expiración; solo puede enviarla el propietario del canal.
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelfund
level: intermedio
---

## Qué hace

`PaymentChannelFund` recarga un [PayChannel](/objects/PayChannel) existente: suma `Amount` a los fondos bloqueados del canal (campo `Amount` del objeto) y resta esa misma cantidad de tu saldo. Además permite establecer una `Expiration` mutable: una fecha a partir de la cual el canal se cierra si alguien lo toca, siempre que respete el `SettleDelay` pactado.

Es la operación de "ampliar el depósito" del canal. No crea ni borra objetos, así que no cambia tu `OwnerCount`, pero sí tiene un efecto colateral importante: si el canal ya ha expirado (por `CancelAfter` o por `Expiration`), la transacción **no recarga nada y lo cierra**, devolviendo al propietario el XRP no reclamado.

## Cuándo usarlo

- El destinatario ha consumido casi todo el saldo autorizable y quieres seguir pagando por el mismo canal en vez de abrir otro.
- Quieres poner una fecha límite al canal (`Expiration`) sin cerrarlo de inmediato.
- Retrasar una expiración que fijaste antes (solo hacia el futuro).

## Cómo funciona por dentro

**`PaymentChannelFund::preflight`**:
- Con `fixCleanup3_2_0` (activo en testnet) un `Channel` a cero es `temMALFORMED`.
- `Amount` debe ser XRP positivo; si no, `temBAD_AMOUNT`.

No hay `preclaim` propio: todas las comprobaciones contra el ledger se hacen en `doApply`, por lo que los errores de estado son `tec` (pagas la tasa).

**`PaymentChannelFund::doApply`**, en este orden:
1. Busca el canal por su ID (`Keylet(ltPAYCHAN, Channel)`). Si no existe, `tecNO_ENTRY`.
2. Si el canal ha expirado (`isChannelExpired` con `CancelAfter` o con `Expiration` respecto al cierre del ledger padre), llama a `closeChannel`: retira el objeto de los dos directorios de propietario, devuelve `Amount − Balance` al propietario, baja su `OwnerCount` y borra el canal. La transacción termina en `tesSUCCESS` **sin haber añadido fondos**.
3. Si `Account` no es el propietario del canal, `tecNO_PERMISSION`. Esta comprobación va después de la anterior: cualquiera puede usar un `PaymentChannelFund` para cerrar un canal ya expirado.
4. Si envías `Expiration`, calcula el mínimo permitido: `cierre del ledger padre + SettleDelay`, o la expiración actual si es anterior. Un valor por debajo de ese mínimo devuelve `tecNO_PERMISSION` (con `fixCleanup3_2_0`; antes era `temBAD_EXPIRATION`). Si es válido, lo guarda.
5. Comprueba la reserva y los fondos: `checkReserve` verifica que tu saldo cubre la reserva actual, y después se exige `Balance ≥ reserva + Amount`, si no `tecUNFUNDED`. No hay incremento de `OwnerCount` porque no se crea ningún objeto.
6. El destinatario del canal debe seguir existiendo (`tecNO_DST`): no se puede recargar un canal cuyo receptor borró su cuenta.
7. Suma `Amount` al canal y lo resta de tu `Balance`.

El transactor no tiene flags. La comparación de expiración usa [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) para tratar el instante exacto de forma consistente con el resto de objetos con caducidad.

## Campos clave

- **Channel** — ID del canal: 64 caracteres hex. Lo obtienes en `account_channels` (`channel_id`) o en `account_objects` (`index`).
- **Amount** — drops de XRP que se añaden al total del canal. No puede ser 0.
- **Expiration** — segundos Ripple Epoch (desde 2000-01-01). Debe ser al menos `ahora + SettleDelay` y no puede adelantar una expiración ya fijada. Es distinta de `CancelAfter`, que es inmutable desde la creación. Para quitar una `Expiration` existente usa [PaymentChannelClaim](/tx/PaymentChannelClaim) con `tfRenew`.

## Errores habituales

- **tecNO_ENTRY** — el `Channel` no existe (ID mal copiado o canal ya cerrado).
- **tecNO_PERMISSION** — no eres el propietario del canal, o `Expiration` es más temprana que `ahora + SettleDelay`.
- **tecUNFUNDED** — no tienes `Amount` de sobra por encima de tu reserva.
- **tecNO_DST** — la cuenta destinataria del canal ya no existe.
- **temBAD_AMOUNT** — `Amount` no es XRP o es cero.
- **temMALFORMED** — `Channel` es todo ceros.
- **tesSUCCESS pero el canal desaparece** — el canal estaba expirado; la transacción lo cerró y te devolvió el resto. Comprueba `CancelAfter`/`Expiration` antes de recargar.

## Ejemplo

```json
{
  "TransactionType": "PaymentChannelFund",
  "Account": "rXXXX_TU_CUENTA",
  "Channel": "C1AE6DDDEEC05CF2978C0BAD6FE302948E9533691DC749DCDD3B9E5992CA6198",
  "Amount": "1000000"
}
```

Añade 1 XRP al canal indicado.

## Pruébalo en testnet

1. Abre un canal con [PaymentChannelCreate](/tx/PaymentChannelCreate) y copia su `channel_id` de `account_channels`.
2. Pega el ID en `Channel`, pon `Amount: "1000000"` y envía desde la **misma** cuenta que creó el canal.
3. Consulta `account_channels`: `amount` ha pasado de 5000000 a 6000000 y `balance` sigue igual.
4. Repite la transacción desde la otra cuenta (la destinataria) y observa `tecNO_PERMISSION`.
5. Prueba a fijar `Expiration` con un valor menor que ahora + `SettleDelay`: `tecNO_PERMISSION`. Con un valor válido, el campo `expiration` aparece en `account_channels`.
6. Si quieres ver el cierre automático, crea un canal con `CancelAfter` a unos minutos vista, espera, y envía un `PaymentChannelFund`: el canal desaparece y tu saldo recupera los fondos.

## Relacionado

- [PaymentChannelCreate](/tx/PaymentChannelCreate)
- [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [PayChannel](/objects/PayChannel)
- [fixCleanup3_2_0](/amendments/fixCleanup3_2_0)
