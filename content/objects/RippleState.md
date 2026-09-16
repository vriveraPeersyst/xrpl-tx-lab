---
title: RippleState
summary: Una línea de confianza bidireccional entre dos cuentas para un token emitido concreto; lleva el balance y los límites de crédito de ambos lados.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/ripplestate
createdBy: TrustSet
modifiedBy: TrustSet, Payment, OfferCreate, Clawback, AMMDeposit, AMMWithdraw
reserve: 1
---

## Qué representa

Un `RippleState` (internamente llamado así, aunque en la API y en `account_lines` aparece como "trust line") registra la relación de crédito entre dos cuentas para una moneda concreta. No hay "emisor" y "receptor" fijos dentro del objeto: es simétrico, con un lado "bajo" (`LowLimit`) y un lado "alto" (`HighLimit`) determinados por el orden numérico de los `AccountID`, no por quién lo creó. El `Balance` se guarda desde el punto de vista del lado bajo: positivo significa que el lado alto debe al lado bajo.

Es la base de los tokens emitidos "clásicos" en XRPL: para que una cuenta tenga USD de un emisor, tiene que existir una línea de confianza entre ambas, con el límite marcando el máximo que el titular está dispuesto a mantener.

## Ciclo de vida

- **Creación**: [TrustSet](/tx/TrustSet), por cualquiera de los dos lados, fijando su propio `LimitAmount` en cero o mayor. La línea nace con `Balance` a cero salvo que ambos lados hayan hecho rippling previamente por otra vía.
- **Modificación**: nuevos [TrustSet](/tx/TrustSet) cambian límites, `QualityIn`/`QualityOut`, o flags de congelación (`lsfLowFreeze`/`lsfHighFreeze`, `lsfLowDeepFreeze`/`lsfHighDeepFreeze`) y de no-rippling. El `Balance` cambia con cualquier [Payment](/tx/Payment) que use esta línea como parte de su ruta, con el cruce de [OfferCreate](/tx/OfferCreate), o con [Clawback](/tx/Clawback) del emisor.
- **Borrado**: automático cuando `Balance` llega a cero y ambos `LimitAmount` están a cero y no quedan flags de autorización activos (`lsfLowAuth`/`lsfHighAuth`) que deban preservarse; no hace falta una transacción específica, se limpia como efecto colateral de la operación que deja la línea en ese estado.

## Campos clave

- **Balance** — saldo desde el punto de vista del lado bajo (`LowLimit`); negativo si el lado bajo debe al alto.
- **LowLimit / HighLimit** — cuánto está dispuesto a mantener cada lado del emisor del otro, con su propio `AccountID` embebido dentro del `STAmount`.
- **LowQualityIn / LowQualityOut / HighQualityIn / HighQualityOut** — factores de conversión (en partes por mil millones) que cada lado aplica a los pagos que atraviesan esta línea; sirven para cobrar comisión implícita o hacer descuentos en el rippling.
- **LowNode / HighNode** — páginas del directorio de propietario de cada lado donde está enlazada la línea.
- **HighSponsor / LowSponsor** — si la reserva de esta línea la cubre un patrocinador externo en vez del propio titular, referencian el [Sponsorship](/objects/Sponsorship) correspondiente.

## Flags

Cada flag existe por duplicado, uno para el lado bajo y otro para el alto (`lsfLow*`/`lsfHigh*`):

- **Reserve** — ese lado ya ha "consumido" su unidad de owner reserve por esta línea.
- **Auth** — ese lado ha autorizado explícitamente al otro (relevante si el emisor tiene `lsfRequireAuth`).
- **NoRipple** — ese lado ha desactivado el rippling a través de esta línea.
- **Freeze** — ese lado ha congelado la línea: el otro no puede enviar ni recibir por ella.
- **DeepFreeze** — congelación profunda: ni el propio titular puede mover el saldo existente, solo el emisor.

Además, **lsfAMMNode** marca que la línea pertenece a un pool de [AMM](/objects/AMM), no a una cuenta normal.

## Cómo consultarlo

`account_objects` con `type: "state"` (o el método dedicado `account_lines`, más cómodo) lo devuelve para cualquiera de los dos lados. Con `ledger_entry`, `ripple_state` acepta `accounts` (array de 2 direcciones) y `currency`:

```json
{ "method": "ledger_entry", "params": [{ "ripple_state": { "accounts": ["rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"], "currency": "USD" }, "ledger_index": "validated" }] }
```

El índice es `SHA512Half(0x0072 || min(id0,id1) || max(id0,id1) || currency)` (`keylet::trustLine`, namespace `'r'`), con las cuentas ordenadas numéricamente, no por quién la creó. Respuesta típica:

```json
{
  "index": "2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B7C8D9E0F1A2B3C",
  "node": {
    "LedgerEntryType": "RippleState",
    "Balance": { "currency": "USD", "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji", "value": "-50" },
    "LowLimit": { "currency": "USD", "issuer": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "value": "0" },
    "HighLimit": { "currency": "USD", "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "value": "1000" },
    "Flags": 131072
  }
}
```

## Reserva

Consume 1 unidad de reserva de propietario (0,2 XRP en testnet), del lado que la marcó con `lsfLowReserve`/`lsfHighReserve` (normalmente quien la creó primero, si el otro lado aún no había fijado un límite).

## Relacionado

- [TrustSet](/tx/TrustSet), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [AccountRoot](/objects/AccountRoot), [Offer](/objects/Offer), [Sponsorship](/objects/Sponsorship)
- [DeepFreeze](/amendments/DeepFreeze), [DisallowIncoming](/amendments/DisallowIncoming)
