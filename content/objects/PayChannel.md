---
title: PayChannel
summary: Un canal de pago unidireccional de XRP: el emisor deposita un fondo y va autorizando pagos incrementales fuera de cadena mediante firmas.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/paychannel
createdBy: PaymentChannelCreate
modifiedBy: PaymentChannelFund, PaymentChannelClaim
reserve: 1
---

## Qué representa

Un `PayChannel` permite pagos repetidos y de bajo importe (micropagos, streaming de contenido, tarificación por uso) sin publicar una transacción por cada uno. El emisor bloquea XRP en `Amount` y va firmando fuera de cadena "reclamaciones" (claims) por importes crecientes hasta `Balance`; el destinatario solo necesita publicar una transacción cuando quiere cobrar lo acumulado, presentando la firma más reciente. El resto del tiempo, el canal no genera tráfico en el ledger.

Es más flexible que un [Escrow](/objects/Escrow) para pagos repetidos porque no hace falta crear un objeto nuevo por cada pago: es el mismo canal, solo se actualiza `Balance`.

## Ciclo de vida

- **Creación**: [PaymentChannelCreate](/tx/PaymentChannelCreate). El emisor fija `Amount` (fondo total), `SettleDelay` (tiempo de gracia tras solicitar el cierre) y `PublicKey` (la clave que firmará las reclamaciones). `Balance` empieza a cero.
- **Recarga**: [PaymentChannelFund](/tx/PaymentChannelFund), por el emisor, añade más XRP a `Amount` y opcionalmente extiende `Expiration`.
- **Cobro**: [PaymentChannelClaim](/tx/PaymentChannelClaim), por el destinatario, presentando `Balance` y `Signature` firmados por `PublicKey`; solo puede reclamar hasta esa cifra acumulada, nunca más. También sirve para que el emisor inicie el cierre (con `tfClose`) tras `SettleDelay`, o para cancelarlo antes si el destinatario coopera.
- **Cierre**: cuando el emisor pide cerrar y pasa `SettleDelay` sin que el destinatario reclame más, o cuando ambas partes acuerdan cerrarlo con `tfClose`, se borra el objeto y el sobrante de `Amount` vuelve al emisor.

## Campos clave

- **Account / Destination** — quien financia el canal y quien puede cobrar de él.
- **Amount** — fondo total depositado; el destinatario nunca puede cobrar más que esto.
- **Balance** — lo ya reclamado (cobrado) hasta ahora; crece con cada `PaymentChannelClaim` exitoso, nunca decrece.
- **PublicKey** — la clave que debe firmar cada reclamación fuera de cadena; normalmente distinta de la clave de firma de transacciones de `Account`.
- **SettleDelay** — segundos que debe esperar el emisor tras pedir el cierre antes de poder recuperar el sobrante, dando tiempo al destinatario a presentar su última reclamación.
- **Expiration / CancelAfter** — `Expiration` es mutable (se puede extender con `PaymentChannelFund`); `CancelAfter` es un límite fijo puesto en la creación que no se puede mover.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

`account_objects` con `type: "payment_channel"` lo devuelve para `Account`. Con `ledger_entry`, `payment_channel` solo acepta el ID del objeto directamente:

```json
{ "method": "ledger_entry", "params": [{ "payment_channel": "96F76F27D8A327FC48753167EC04A46AA0E382E6916C40D14A423D5E9366F02", "ledger_index": "validated" }] }
```

El ID es `SHA512Half(0x0078 || AccountID_emisor || AccountID_destino || Sequence)` (`keylet::payChannel`, namespace `'x'`), y se encuentra en los metadatos de la `PaymentChannelCreate`. Respuesta típica:

```json
{
  "index": "96F76F27D8A327FC48753167EC04A46AA0E382E6916C40D14A423D5E9366F02",
  "node": {
    "LedgerEntryType": "PayChannel",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Destination": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy",
    "Amount": "100000000",
    "Balance": "5000000",
    "PublicKey": "32D2471DB72B27E3310F355BB33E339BF26F8392DDDA1DF43C9F2A6D9C41E5C0D",
    "SettleDelay": 86400,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet) del emisor mientras exista.

## Relacionado

- [PaymentChannelCreate](/tx/PaymentChannelCreate), [PaymentChannelFund](/tx/PaymentChannelFund), [PaymentChannelClaim](/tx/PaymentChannelClaim)
- [Escrow](/objects/Escrow), [Check](/objects/Check)
