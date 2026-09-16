---
title: Payment
summary: Envía XRP, tokens emitidos (IOU) o MPT a otra cuenta, con enrutado por paths y conversión entre monedas.
category: pagos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/payment
level: básico
---

## Qué hace

`Payment` es la transacción más usada del XRPL: mueve valor de una cuenta a otra. Puede enviar XRP directamente, tokens emitidos por un tercero a través de trust lines, o Multi-Purpose Tokens (MPT). Si el destino no existe y envías XRP suficiente, la propia transacción crea la cuenta.

Piensa en ella como una transferencia bancaria con un motor de cambio incorporado: puedes indicar qué quieres que llegue (`Amount`) y, opcionalmente, con qué estás dispuesto a pagarlo (`SendMax`). El motor de pagos (`RippleCalc`) busca rutas por el DEX y por trust lines para cumplir el pedido.

Objetos que toca: modifica el [AccountRoot](/objects/AccountRoot) del origen y del destino (o lo crea), ajusta [RippleState](/objects/RippleState) cuando circulan tokens, puede consumir [Offer](/objects/Offer) del libro de órdenes y, con MPT, modifica [MPToken](/objects/MPToken).

## Cuándo usarlo

- Enviar XRP a otra persona o a un exchange (con `DestinationTag`).
- Activar una cuenta nueva enviándole al menos la reserva base (1 XRP en testnet hoy).
- Pagar con un token IOU (por ejemplo USD emitido por un gateway) a alguien que tiene trust line con ese emisor.
- Convertir monedas al vuelo: pagar en USD gastando XRP, dejando que el DEX haga el cambio.
- Pagos parciales y pagos con calidad limitada para integraciones de liquidez.

## Cómo funciona por dentro

**`Payment::preflight`** valida la estructura sin tocar el ledger. Rechaza importes ≤ 0 (`temBAD_AMOUNT`), destino ausente (`temDST_NEEDED`) y un pago a uno mismo en la misma moneda sin `Paths` (`temREDUNDANT`). Para un pago XRP → XRP ("xrpDirect") no tiene sentido nada del motor de rutas, así que devuelve errores específicos si añades `SendMax` (`temBAD_SEND_XRP_MAX`), `Paths` (`temBAD_SEND_XRP_PATHS`), `tfPartialPayment` (`temBAD_SEND_XRP_PARTIAL`), `tfLimitQuality` (`temBAD_SEND_XRP_LIMIT`) o `tfNoRippleDirect` (`temBAD_SEND_XRP_NO_DIRECT`). `DeliverMin` exige `tfPartialPayment`, debe ser de la misma moneda que `Amount` y no mayor que él. Con [MPTokensV1](/amendments/MPTokensV1) activo (y sin MPTokensV2, que no está en testnet) un pago de MPT no admite `Paths` ni conversiones: `Amount` y `SendMax` deben ser el mismo activo. El flag `tfSponsorCreatedAccount` requiere [Sponsor](/amendments/Sponsor), que no está activo en testnet: hoy da `temDISABLED`.

**`Payment::preclaim`** mira el ledger. Si el destino no existe: solo puede crearse con XRP (`tecNO_DST` si es token), nunca con pago parcial (`telNO_DST_PARTIAL`) y el importe debe ser ≥ reserva base (`tecNO_DST_INSUF_XRP`). Si existe y tiene `lsfRequireDestTag`, falta `DestinationTag` → `tecDST_TAG_NEEDED`. Limita el número y la longitud de los paths (`telBAD_PATH_COUNT`). Con `DomainID` ([PermissionedDEX](/amendments/PermissionedDEX)), origen y destino deben pertenecer al dominio permisionado, si no `tecNO_PERMISSION`. Las `CredentialIDs` se validan con `credentials::valid` (pueden dar `tecEXPIRED`).

**`Payment::doApply`** crea el `AccountRoot` del destino si no existía (con `Sequence` = número de ledger actual) y después toma uno de tres caminos:

1. *Pago con rutas* (hay `Paths`, `SendMax` o `Amount` no es XRP): comprueba la preautorización de depósito (`verifyDepositPreauth`) y ejecuta `RippleCalc`. Si entrega menos de `Amount` y está por debajo de `DeliverMin`, `tecPATH_PARTIAL`; si el motor devuelve un `ter` reintentable lo convierte en `tecPATH_DRY` para cobrar la fee.
2. *Pago MPT directo*: exige autorización de ambos lados (`requireAuth`), que la emisión permita transferir (`canTransfer`), que ningún lado esté bloqueado (`tecLOCKED`) y aplica el `TransferFee` de la emisión cuando el pago es entre tenedores.
3. *XRP directo*: exige que el saldo previo al cobro de la fee cubra `Amount` + reserva (`tecUNFUNDED_PAYMENT`). Si el destino tiene `lsfDepositAuth`, solo pasa si el remitente está preautorizado o si tanto el importe como el saldo del destino son ≤ reserva base (regla anti-bloqueo). Los pseudo-accounts (AMM, Vault) no pueden recibir XRP directo: `tecNO_PERMISSION`.

## Campos clave

- **Amount** — lo que debe llegar al destino. String en drops para XRP; objeto `{currency, issuer, value}` para IOU; `{mpt_issuance_id, value}` para MPT.
- **SendMax** — máximo que aceptas gastar, en la moneda de origen. Obligatorio en la práctica para pagos con conversión; prohibido en XRP → XRP.
- **DeliverMin** — mínimo aceptable en un pago parcial. Sin él, un `tfPartialPayment` puede entregar cualquier cantidad > 0.
- **Paths** — rutas explícitas. Si las omites, el motor usa la ruta directa y las por defecto (salvo `tfNoRippleDirect`).
- **DestinationTag** — entero que identifica al beneficiario final en cuentas compartidas (exchanges). No lo interpreta el ledger.
- **InvoiceID** — hash de 256 bits libre para correlacionar con tu sistema.
- **DomainID** — restringe el pago al dominio permisionado indicado.

## Flags

- **tfNoRippleDirect** — no usar la ruta por defecto; solo las `Paths` indicadas.
- **tfPartialPayment** — permite entregar menos de `Amount` (hasta `DeliverMin`) en lugar de fallar. Ojo al integrar: mira `delivered_amount` en los metadatos, no `Amount`.
- **tfLimitQuality** — descarta rutas cuya relación entrada/salida sea peor que `Amount / SendMax`.
- **tfSponsorCreatedAccount** — creación de cuenta patrocinada; requiere el amendment Sponsor, no activo en testnet.

## Errores habituales

- **tecNO_DST_INSUF_XRP** — el destino no existe y envías menos de la reserva base. Envía ≥ 1 XRP.
- **tecNO_DST** — intentas enviar un token a una cuenta que no existe. Actívala antes con XRP.
- **tecDST_TAG_NEEDED** — el destino exige `DestinationTag`.
- **tecUNFUNDED_PAYMENT** — no te queda XRP por encima de la reserva para cubrir `Amount`.
- **tecPATH_DRY** — no hay liquidez ni trust lines que conecten origen y destino (por ejemplo, el destino no tiene trust line al emisor).
- **tecPATH_PARTIAL** — la ruta existe pero no cubre `Amount` (o `DeliverMin`) dentro de `SendMax`.
- **tecNO_PERMISSION** — el destino tiene `DepositAuth` y no estás preautorizado, o no perteneces al `DomainID`.
- **temREDUNDANT** — te pagas a ti mismo en la misma moneda sin `Paths`.

## Ejemplo

```json
{
  "TransactionType": "Payment",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "Amount": "1000000",
  "DestinationTag": 12345
}
```

Envía 1 XRP (1.000.000 drops) con tag 12345.

## Pruébalo en testnet

1. Conecta tu cuenta en el builder y deja el ejemplo tal cual; el builder rellena `Fee`, `Sequence` y `LastLedgerSequence`.
2. Firma y envía. Espera al resultado `tesSUCCESS` y al ledger validado.
3. Consulta `account_info` de la cuenta destino: su `Balance` habrá subido 1.000.000 drops.
4. Repite hacia una dirección nueva (sin activar) con `Amount: "500000"`: verás `tecNO_DST_INSUF_XRP`. Sube a `"1000000"` y comprobarás que la cuenta aparece creada.
5. Para un pago de tokens, crea antes una trust line con [TrustSet](/tx/TrustSet) desde el destino al emisor y usa `Amount: {currency, issuer, value}`; en los metadatos verás modificado el objeto `RippleState`.

## Relacionado

- [TrustSet](/tx/TrustSet) — necesario para recibir tokens.
- [DepositPreauth](/tx/DepositPreauth) y [AccountSet](/tx/AccountSet) (`asfDepositAuth`, `asfRequireDest`).
- [OfferCreate](/tx/OfferCreate) — la liquidez del DEX que usan los pagos con conversión.
- [CheckCreate](/tx/CheckCreate) — pago diferido que cobra el destinatario.
- Objetos: [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [MPToken](/objects/MPToken).
- Amendments: [MPTokensV1](/amendments/MPTokensV1), [Credentials](/amendments/Credentials), [PermissionedDEX](/amendments/PermissionedDEX), [DepositAuth](/amendments/DepositAuth).
