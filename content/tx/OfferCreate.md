---
title: OfferCreate
summary: Publica una orden en el DEX nativo para cambiar un activo por otro, cruzando primero las órdenes existentes que la satisfagan.
category: dex
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/offercreate
level: intermedio
---

## Qué hace

`OfferCreate` es la orden límite del libro descentralizado del XRPL. Declaras lo que entregas (`TakerGets`) y lo que quieres a cambio (`TakerPays`); el cociente entre ambos fija el precio. Al aplicarse, la transacción primero intenta **cruzar** tu orden contra las que ya están en el libro contrario a ese precio o mejor, usando el mismo motor de pagos (`flow`) que usa [Payment](/tx/Payment). Si después del cruce queda algo por ejecutar, la parte restante se guarda en el ledger como un objeto [Offer](/objects/Offer) que consume una unidad de reserva de propietario (0,2 XRP en testnet).

Piensa en ella como una orden de un exchange clásico, pero con dos diferencias: el cruce es inmediato y determinista dentro de la misma transacción, y la orden que queda en el libro no bloquea fondos; solo se ejecuta si sigues teniendo saldo cuando alguien la cruza.

La transacción también puede cancelar una orden anterior en el mismo paso (`OfferSequence`) y, con [PermissionedDEX](/amendments/PermissionedDEX), colocarse en un libro permisionado (`DomainID`).

## Cuándo usarlo

- Cambiar XRP por un token emitido (IOU) o viceversa a un precio fijado por ti.
- Cambiar dos tokens entre sí: el motor añade automáticamente una ruta intermedia vía XRP si mejora el precio.
- Proveer liquidez pasiva con `tfPassive` sin cruzar órdenes al mismo precio.
- Ejecutar una compra "todo o nada" (`tfFillOrKill`) o "lo que haya ahora mismo" (`tfImmediateOrCancel`).
- Reemplazar una orden viva por otra en una sola transacción usando `OfferSequence`.

## Cómo funciona por dentro

**`OfferCreate::preflight`** (validación estática):
- `tfImmediateOrCancel` y `tfFillOrKill` a la vez → `temINVALID_FLAG`. `tfHybrid` sin `DomainID` → `temINVALID_FLAG`.
- `Expiration` presente pero igual a 0 → `temBAD_EXPIRATION`; `OfferSequence` igual a 0 → `temBAD_SEQUENCE`.
- Ambos importes deben ser positivos. XRP por XRP → `temBAD_OFFER`; el mismo activo en ambos lados → `temREDUNDANT`; código de moneda "XRP" en un IOU → `temBAD_CURRENCY`; issuer incoherente con el tipo de importe → `temBAD_ISSUER`.
- Con `fixCleanup3_2_0` (activo en testnet) un `DomainID` a cero es `temMALFORMED`.

**`OfferCreate::preclaim`** (contra el ledger):
- Ninguno de los dos activos puede estar congelado globalmente (`checkGlobalFrozen`).
- Debes tener **al menos algo** del activo que entregas: `accountFunds(TakerGets) <= 0` → `tecUNFUNDED_OFFER`. No hace falta cubrir todo el importe.
- `OfferSequence` debe ser menor que tu `Sequence` actual, si no `temBAD_SEQUENCE`.
- Si `Expiration` ya ha pasado → `tecEXPIRED`.
- Si `TakerPays` es un token, `OfferCreate::checkAcceptAsset` comprueba que puedes recibirlo: el emisor debe existir (`tecNO_ISSUER`); si el emisor tiene `lsfRequireAuth` necesitas una trust line autorizada (`tecNO_LINE` / `tecNO_AUTH`); una trust line con deep freeze → `tecFROZEN`.
- Con `DomainID`, la cuenta debe pertenecer al dominio permisionado o ser su propietaria; si no, `tecNO_PERMISSION`.

**`OfferCreate::doApply` → `applyGuts`** (efectos):
1. Si hay `OfferSequence`, borra esa orden. No encontrarla no es error.
2. Si la orden ha expirado devuelve `tecEXPIRED` (la tasa se cobra igual).
3. Si algún emisor tiene `TickSize`, redondea el precio a esa cantidad de dígitos significativos y ajusta `TakerGets` (o `TakerPays` con `tfSell`).
4. `OfferCreate::flowCross` llama al motor de pagos con tu propia cuenta como origen y destino. Tiene en cuenta el `TransferRate` del emisor del activo que entregas y limita el gasto a tu saldo real. Con `tfPassive` sube el umbral de calidad para no cruzar órdenes al mismo precio; con `tfSell` permite recibir más de `TakerPays` si el mercado lo da. Las órdenes vacías o sin fondos que encuentra por el camino se eliminan del libro.
5. Tras el cruce recalcula el resto de la orden conservando el precio original. Si cruzando te quedas sin fondos, no se crea nada.
6. `tfFillOrKill`: si queda resto, `tecKILLED` y se descartan los cruces parciales. `tfImmediateOrCancel`: nunca se crea objeto; si no cruzó nada, `tecKILLED`.
7. Para dejar el resto en el libro, tu saldo XRP anterior a la tasa debe cubrir la reserva con un objeto más; si no y no cruzaste nada, `tecINSUF_RESERVE_OFFER` (si cruzaste algo, el cruce se mantiene y simplemente no se coloca el resto).
8. Inserta el objeto [Offer](/objects/Offer) en tu directorio de propietario y en el directorio del libro (`keylet::quality(book, rate)`), incrementa `OwnerCount`, y con `tfHybrid` lo añade además al libro abierto (`applyHybrid`, campo `AdditionalBooks`).

Amendments relevantes: [PermissionedDEX](/amendments/PermissionedDEX) (libros por dominio y `tfHybrid`), [ImmediateOfferKilled](/amendments/ImmediateOfferKilled) (`tecKILLED` para IoC sin cruce), [fixFillOrKill](/amendments/fixFillOrKill), [fixReducedOffersV1](/amendments/fixReducedOffersV1) y [fixReducedOffersV2](/amendments/fixReducedOffersV2) (redondeo de órdenes reducidas), [fixTakerDryOfferRemoval](/amendments/fixTakerDryOfferRemoval), [DeepFreeze](/amendments/DeepFreeze).

## Campos clave

- **TakerGets** — lo que tú entregas y el que cruce tu orden recibe. En drops si es XRP.
- **TakerPays** — lo que pides a cambio. `TakerPays / TakerGets` es el precio.
- **Expiration** — segundos Ripple Epoch (desde 2000-01-01). La orden expirada sigue en el ledger hasta que algo la toque, pero ya no se cruza.
- **OfferSequence** — `Sequence` de una orden tuya que quieres cancelar en la misma transacción.
- **DomainID** — dominio permisionado; requiere credenciales aceptadas por ese dominio.

## Flags

- **tfPassive** — no cruza órdenes al mismo precio, solo mejores; útil para hacer mercado sin consumir liquidez.
- **tfImmediateOrCancel** — ejecuta lo que pueda ahora y no deja nada en el libro.
- **tfFillOrKill** — o se ejecuta entera o falla con `tecKILLED`.
- **tfSell** — entrega todo `TakerGets` aunque obtengas más de `TakerPays` de lo pedido.
- **tfHybrid** — la orden vive a la vez en el libro del dominio y en el libro abierto.

## Errores habituales

- **tecUNFUNDED_OFFER** — no tienes nada del activo `TakerGets`. Consigue saldo (o una trust line con balance) antes.
- **tecINSUF_RESERVE_OFFER** — no cubres la reserva para un objeto más (1 XRP base + 0,2 XRP por objeto en testnet) y la orden no cruzó nada.
- **tecKILLED** — `tfFillOrKill` no se pudo completar, o `tfImmediateOrCancel` no encontró contrapartida.
- **tecNO_LINE / tecNO_AUTH** — el emisor de `TakerPays` exige autorización y no tienes trust line autorizada.
- **tecNO_ISSUER** — el issuer de `TakerPays` no existe como cuenta.
- **tecEXPIRED** — `Expiration` ya pasó cuando se aplicó.
- **temBAD_OFFER** — importes cero o negativos, o XRP contra XRP.
- **tecNO_PERMISSION** — `DomainID` inexistente o tu cuenta no está en el dominio.

## Ejemplo

```json
{
  "TransactionType": "OfferCreate",
  "Account": "rXXXX_TU_CUENTA",
  "TakerGets": "1000000",
  "TakerPays": {
    "currency": "USD",
    "issuer": "rZZZZ_EMISOR",
    "value": "1"
  }
}
```

Ofreces 1 XRP y pides 1 USD emitido por `rZZZZ_EMISOR`.

## Pruébalo en testnet

1. Crea antes una trust line al emisor con [TrustSet](/tx/TrustSet) (si el emisor tiene `lsfRequireAuth`, tendrá que autorizarte).
2. Rellena `TakerGets` en drops y `TakerPays` con el token. Envía la transacción.
3. Consulta `account_offers` con tu cuenta: verás la orden con `seq`, `taker_gets`, `taker_pays` y `quality`.
4. En `account_info` observa que `OwnerCount` ha subido en 1.
5. Desde la otra cuenta (con saldo del token) envía la orden inversa: la tuya se cruzará y desaparecerá de `account_offers`; en los metadatos de la transacción verás el nodo `Offer` borrado y las trust lines modificadas.
6. Prueba `Flags: 131072` (`tfImmediateOrCancel`) sin contrapartida y observa `tecKILLED`.

## Relacionado

- [OfferCancel](/tx/OfferCancel)
- [Payment](/tx/Payment) (los pagos entre monedas usan los mismos libros)
- [TrustSet](/tx/TrustSet)
- [Offer](/objects/Offer)
- [DirectoryNode](/objects/DirectoryNode)
- [PermissionedDEX](/amendments/PermissionedDEX)
- [ImmediateOfferKilled](/amendments/ImmediateOfferKilled)
