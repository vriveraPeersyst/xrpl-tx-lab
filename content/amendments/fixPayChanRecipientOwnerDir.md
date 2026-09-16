---
title: fixPayChanRecipientOwnerDir
summary: Añade el PayChannel también al owner directory del destinatario del canal, no solo al del remitente.
xrplDocs: https://xrpl.org/resources/known-amendments#fixpaychanrecipientownerdir
---

## Qué cambia

Al crear un [PayChannel](/objects/PayChannel) con [PaymentChannelCreate](/tx/PaymentChannelCreate), el objeto se enlaza en el owner directory de la cuenta que lo crea (`Account`), lo que permite listar y contar sus objetos poseídos. Antes del fix, el destinatario del canal (`Destination`) no tenía ninguna referencia a ese `PayChannel` en su propio directorio: no había forma de recorrer desde la cuenta destinataria los canales de pago que otros habían abierto hacia ella, ni ese objeto contaba en su lado para operaciones como el borrado de cuenta.

Con `fixPayChanRecipientOwnerDir` activo, `PaymentChannelCreate::doApply` inserta el `PayChannel` también en el owner directory de `Destination`, guardando la página resultante en el nuevo campo `DestinationNode` del objeto. Así, tanto el remitente como el destinatario pueden enumerar el canal desde su propio directorio de propietario.

## Transacciones y objetos afectados

- [PaymentChannelCreate](/tx/PaymentChannelCreate): inserta el canal en dos directorios en lugar de uno.
- [PayChannel](/objects/PayChannel): nuevo campo `DestinationNode`, junto al ya existente `OwnerNode`.

## Estado y contexto

Corrige una asimetría en cómo se indexan los canales de pago: sin este fix, un servicio que dependiera del owner directory para descubrir los `PayChannel` asociados a una cuenta se perdía todos los canales en los que esa cuenta era solo destinataria. El amendment está retirado en el código; el enlazado por ambos lados es hoy el único comportamiento existente.
