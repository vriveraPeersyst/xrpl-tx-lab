---
title: PaymentChannelCreate
summary: Abre un canal de pago unidireccional en XRP: bloquea fondos que el destinatario podrá reclamar con firmas emitidas fuera del ledger.
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate
level: intermedio
---

## Qué hace

`PaymentChannelCreate` aparta una cantidad de XRP de tu cuenta y la guarda en un nuevo objeto [PayChannel](/objects/PayChannel) del ledger, a nombre de un `Destination`. A partir de ahí puedes firmar **claims** off-ledger (mensajes que autorizan al destinatario a cobrar hasta cierto saldo acumulado) con la clave indicada en `PublicKey`. El destinatario presenta el claim más alto que tenga con [PaymentChannelClaim](/tx/PaymentChannelClaim) cuando quiera liquidar. Solo el propietario puede añadir fondos ([PaymentChannelFund](/tx/PaymentChannelFund)); solo se mueve XRP y solo en un sentido.

La analogía es una cuenta corriente de bar: dejas un depósito en la barra, vas firmando tickets que dicen "te debo hasta X en total", y el barman cobra el último ticket cuando cierra. Si quieres marcharte antes, tienes que avisar con `SettleDelay` segundos de antelación para que el barman pueda cobrar lo pendiente.

El objeto consume una unidad de reserva de propietario (0,2 XRP en testnet) y se enlaza en los directorios de propietario de las dos cuentas.

## Cuándo usarlo

- Micropagos frecuentes a un mismo receptor (streaming, API de pago por uso) sin pagar tasa ni esperar ledger por cada uno.
- Liquidación intermitente entre dos partes que se intercambian muchos mensajes firmados.
- Canales bidireccionales: uno en cada sentido.

## Cómo funciona por dentro

**`PaymentChannelCreate::preflight`**:
- `Amount` debe ser XRP y mayor que cero; si no, `temBAD_AMOUNT`.
- `Account` y `Destination` no pueden coincidir: `temDST_IS_SRC`.
- `PublicKey` debe ser una clave pública válida (secp256k1 o ed25519): en otro caso `temMALFORMED`.

**`PaymentChannelCreate::preclaim`**:
- Comprueba tu reserva y saldo: con [Sponsor](/amendments/Sponsor) inactivo (como en testnet), `Balance < reserva(OwnerCount + 1)` → `tecINSUFFICIENT_RESERVE`, y `Balance < reserva + Amount` → `tecUNFUNDED`. Es decir, además de lo que bloqueas tienes que conservar la reserva completa.
- El destino debe existir (`tecNO_DST`), no tener `lsfDisallowIncomingPayChan` (`tecNO_PERMISSION`), y si tiene `lsfRequireDestTag` necesitas `DestinationTag` (`tecDST_TAG_NEEDED`). Las pseudo-cuentas (AMM, vaults) no pueden recibir canales: `tecNO_PERMISSION`.

**`PaymentChannelCreate::doApply`**:
- Con [fixPayChanCancelAfter](/amendments/fixPayChanCancelAfter) (activo), si `CancelAfter` es anterior al cierre del ledger padre la transacción falla con `tecEXPIRED` en lugar de crear un canal ya muerto.
- Crea el objeto con clave `keylet::payChannel(Account, Destination, Sequence)`. Guarda `Amount` (fondos totales), `Balance` a 0 (lo ya pagado), `SettleDelay`, `PublicKey`, `CancelAfter`, `SourceTag`, `DestinationTag` y, gracias a `fixIncludeKeyletFields`, el `Sequence`.
- Inserta el objeto en tu directorio de propietario (`OwnerNode`) y, por [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir), también en el del destinatario (`DestinationNode`), de modo que el receptor tampoco puede borrar su cuenta mientras el canal exista.
- Resta `Amount` de tu saldo e incrementa tu `OwnerCount`.

No hay flags específicos. `Expiration` no se fija al crear: aparece más tarde cuando el propietario pide cerrar el canal.

## Campos clave

- **Amount** — XRP en drops que quedan bloqueados en el canal. Puedes ampliarlos después con `PaymentChannelFund`.
- **SettleDelay** — segundos que el canal permanece abierto desde que el propietario solicita el cierre. Da margen al destinatario para presentar el último claim. Un valor cómodo para pruebas es 60-3600; el ejemplo usa 86400 (un día).
- **PublicKey** — clave pública (hex, 33 bytes) con la que firmarás los claims. No tiene por qué ser la clave de la cuenta, pero en la práctica el builder usa la de la cuenta conectada. Es inmutable: cambiarla requiere abrir otro canal.
- **CancelAfter** — expiración inmutable en segundos Ripple Epoch (desde 2000-01-01). Pasada esa fecha, cualquier transacción que toque el canal lo cierra.
- **DestinationTag** — obligatorio si el destino tiene `lsfRequireDestTag`.

## Errores habituales

- **tecUNFUNDED** — saldo insuficiente para bloquear `Amount` y seguir cubriendo la reserva. Reduce `Amount`.
- **tecINSUFFICIENT_RESERVE** — no cubres la reserva con un objeto más (1 XRP + 0,2 XRP por objeto en testnet).
- **tecNO_DST** — el destino no está financiado.
- **tecNO_PERMISSION** — el destino activó `asfDisallowIncomingPayChan` o es una pseudo-cuenta.
- **tecDST_TAG_NEEDED** — el destino exige `DestinationTag`.
- **tecEXPIRED** — `CancelAfter` ya está en el pasado.
- **temMALFORMED** — `PublicKey` no es una clave válida (revisa que sea hex de 66 caracteres).
- **temDST_IS_SRC** — has puesto tu propia cuenta como destino.

## Ejemplo

```json
{
  "TransactionType": "PaymentChannelCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "Amount": "5000000",
  "SettleDelay": 86400,
  "PublicKey": "ED9434799226374926EDA3B54B1B461B4ABF7237962EAE18528FEA67595397FA32"
}
```

Bloquea 5 XRP para `rYYYY_OTRA_CUENTA` con un día de preaviso de cierre.

## Pruébalo en testnet

1. Asegúrate de tener al menos `Amount` + reserva (por ejemplo, 10 XRP para bloquear 5).
2. Rellena `Destination` con la segunda cuenta y deja que el builder ponga tu clave pública en `PublicKey`. Envía.
3. Consulta `account_channels` con tu cuenta: verás `channel_id`, `amount` (5000000), `balance` (0), `settle_delay` y `public_key`.
4. En `account_info` comprueba que `Balance` bajó 5 XRP más la tasa y que `OwnerCount` subió en 1. Consulta también `account_objects` de la otra cuenta con `type: payment_channel`: el canal aparece también allí.
5. Guarda `channel_id`: lo necesitas para [PaymentChannelFund](/tx/PaymentChannelFund) y [PaymentChannelClaim](/tx/PaymentChannelClaim).
6. Para firmar claims sin código, usa el método RPC `channel_authorize` de un nodo propio (los nodos públicos lo deshabilitan) o una librería cliente; luego verifica con `channel_verify`.

## Relacionado

- [PaymentChannelFund](/tx/PaymentChannelFund)
- [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [PayChannel](/objects/PayChannel)
- [AccountSet](/tx/AccountSet) (`asfDisallowIncomingPayChan`, `asfRequireDest`)
- [fixPayChanCancelAfter](/amendments/fixPayChanCancelAfter)
- [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir)
