---
title: PayChan
summary: Introduce los canales de pago unidireccionales para hacer micropagos off-ledger con reclamaciones firmadas fuera de cadena.
xrplDocs: https://xrpl.org/resources/known-amendments#paychan
introducedIn: 0.90.0
---

## Qué cambia

Introduce el objeto `PayChannel` (`ltPAYCHAN`): un canal de pago unidireccional entre una cuenta origen y una cuenta destino, con un `Amount` total reservado en XRP, un `Balance` de lo ya reclamado, una `PublicKey` para verificar firmas, un `SettleDelay` (tiempo mínimo antes de poder cerrar el canal sin acuerdo mutuo) y opcionalmente `Expiration` y `CancelAfter`.

`PaymentChannelCreate` abre el canal bloqueando el `Amount` indicado de la cuenta origen. A partir de ahí, el origen puede firmar fuera de cadena, sin coste ni latencia de ledger, sucesivas "reclamaciones" que autorizan al destino a retirar una cantidad creciente del canal; cada firma sustituye a la anterior, así que solo hace falta enviar a la red la última. `PaymentChannelClaim` es la transacción que liquida: el destino la usa para cobrar presentando la firma más reciente (verificada contra `PublicKey`), y cualquiera de las dos partes puede usarla para cerrar el canal (de mutuo acuerdo, o unilateralmente una vez pasado `SettleDelay`/`Expiration`), devolviendo el remanente al origen. `PaymentChannelFund` permite al origen añadir más XRP al canal ya abierto, opcionalmente extendiendo su `Expiration`.

## Transacciones y objetos afectados

- Nuevas: [PaymentChannelCreate](/tx/PaymentChannelCreate), [PaymentChannelFund](/tx/PaymentChannelFund) y [PaymentChannelClaim](/tx/PaymentChannelClaim).
- Objeto: nuevo [PayChannel](/objects/PayChannel), enlazado en el owner directory de la cuenta origen (y, según el ledger, también en el de destino).

## Estado y contexto

Los canales de pago resuelven el caso de uso de micropagos repetidos entre las mismas dos partes: streaming de contenido pagado por segundo, tarificación por API, propinas frecuentes, etc. Sin canal, cada micropago sería una transacción `Payment` en el ledger, con su coste de comisión y su latencia de confirmación; con un canal, solo la apertura y el cierre (o el reaprovisionamiento) tocan el ledger, mientras que las reclamaciones intermedias se negocian y firman off-chain. Amendments y fixes posteriores (como `fixPayChanCancelAfter`, que corrige el comportamiento de `CancelAfter`, o `fixPayChanRecipientOwnerDir`) ajustan detalles de este diseño original.
