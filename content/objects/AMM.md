---
title: AMM
summary: Un pool de liquidez automático entre dos activos, con su comisión de intercambio, las votaciones de los proveedores y la subasta del slot con descuento.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/amm
createdBy: AMMCreate
modifiedBy: AMMDeposit, AMMWithdraw, AMMVote, AMMBid, AMMClawback, AMMDelete, Payment, OfferCreate
reserve: 0
---

## Qué representa

Un `AMM` es un creador de mercado automático: un pool con dos activos (XRP, tokens emitidos o MPT) que cualquiera puede usar para cambiar uno por otro a un precio fijado por la fórmula de producto constante. Quien aporta liquidez recibe *LP tokens*, un token emitido por la pseudocuenta del AMM que representa su participación.

El objeto `AMM` guarda la configuración y la gobernanza del pool. Los fondos no están en él, sino en la pseudocuenta: un [AccountRoot](/objects/AccountRoot) con el campo `AMMID` apuntando a este objeto, sin claves privadas, cuyos saldos viven en `Balance` (XRP), en líneas [RippleState](/objects/RippleState) con `lsfAMMNode` o en objetos [MPToken](/objects/MPToken) con `lsfMPTAMM`.

## Ciclo de vida

- **Creación**: [AMMCreate](/tx/AMMCreate) crea el objeto, la pseudocuenta (`createPseudoAccount` en `AMMCreate::doApply`) y el primer depósito. Esta transacción cobra como comisión el equivalente a un incremento de reserva de propietario (`AMMCreate::calculateBaseFee`), 0,2 XRP en testnet, en lugar de la comisión normal.
- **Modificación**: [AMMDeposit](/tx/AMMDeposit) y [AMMWithdraw](/tx/AMMWithdraw) mueven `LPTokenBalance`; [AMMVote](/tx/AMMVote) actualiza `VoteSlots` y recalcula `TradingFee`; [AMMBid](/tx/AMMBid) cambia `AuctionSlot`; [AMMClawback](/tx/AMMClawback) permite a un emisor con clawback retirar su token del pool; cualquier [Payment](/tx/Payment) u [OfferCreate](/tx/OfferCreate) que cruce el pool cambia los saldos de la pseudocuenta, no este objeto.
- **Borrado**: cuando la última retirada deja `LPTokenBalance` a cero, `AMMWithdraw` intenta borrar el AMM y su pseudocuenta. Si hay demasiadas líneas de confianza para limpiarlas en una sola transacción (`tecINCOMPLETE`), hay que rematar con [AMMDelete](/tx/AMMDelete).

## Campos clave

- **Account** — dirección de la pseudocuenta que custodia los activos y emite los LP tokens.
- **Asset / Asset2** — los dos activos del pool, en orden canónico. Su hash determina la clave del objeto.
- **LPTokenBalance** — total de LP tokens en circulación. La moneda es un código hex de 160 bits calculado a partir de los dos activos (`ammLPTCurrency`).
- **TradingFee** — comisión en unidades de 1/100 000 (1000 = 1 %, máximo 1000). Es la media ponderada de `VoteSlots`.
- **VoteSlots** — hasta 8 votos; cada uno guarda `Account`, `TradingFee` y `VoteWeight` (participación en LP tokens en el momento del voto).
- **AuctionSlot** — quien ganó la subasta de 24 horas: `Account`, `Price` pagado en LP tokens, `Expiration`, `DiscountedFee` (una décima parte de `TradingFee`) y hasta 4 `AuthAccounts` que también disfrutan el descuento.

## Flags

No tiene flags `lsf*` propios.

## Cómo consultarlo

El comando dedicado es `amm_info` (con `asset` y `asset2`, o con `amm_account`). Con `ledger_entry` pasa el par de activos:

```json
{ "method": "ledger_entry", "params": [{ "amm": { "asset": { "currency": "XRP" }, "asset2": { "currency": "USD", "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq" } }, "ledger_index": "validated" }] }
```

La clave es `SHA512Half(0x0041 || activo1 || activo2)` (`keylet::amm`). En `account_objects` de la pseudocuenta usa `type: "amm"`. Respuesta típica:

```json
{
  "node": {
    "LedgerEntryType": "AMM",
    "Account": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE",
    "Asset": { "currency": "XRP" },
    "Asset2": { "currency": "USD", "issuer": "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq" },
    "LPTokenBalance": { "currency": "03930D02208264E2E40EC1B0C09E4DB96EE197B1", "issuer": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE", "value": "1000" },
    "TradingFee": 500,
    "VoteSlots": [ { "VoteEntry": { "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "TradingFee": 500, "VoteWeight": 100000 } } ],
    "AuctionSlot": { "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "DiscountedFee": 50, "Expiration": 811500000, "Price": { "currency": "03930D02208264E2E40EC1B0C09E4DB96EE197B1", "issuer": "rMZ1Q7YoLAqqvyXBc4rVSHwbGpi2TnSxsE", "value": "0" } },
    "OwnerNode": "0"
  }
}
```

## Reserva

El objeto pertenece a la pseudocuenta, no a ti, así que no suma a tu `OwnerCount`. Lo que pagas es la comisión especial de `AMMCreate` (un incremento de reserva, que se quema) y la reserva de tu línea de confianza de LP tokens.

## Relacionado

- [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit), [AMMWithdraw](/tx/AMMWithdraw), [AMMVote](/tx/AMMVote), [AMMBid](/tx/AMMBid), [AMMDelete](/tx/AMMDelete), [AMMClawback](/tx/AMMClawback)
- [RippleState](/objects/RippleState), [MPToken](/objects/MPToken), [Offer](/objects/Offer)
- [AMM](/amendments/AMM), [AMMClawback](/amendments/AMMClawback), [fixAMMv1_3](/amendments/fixAMMv1_3)
