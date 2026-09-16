---
title: SponsorshipSet
summary: Una cuenta se ofrece a pagar la fee o la reserva de otra cuenta, creando un objeto Sponsorship.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/sponsorshipset
amendment: Sponsor
level: avanzado
---

## Qué hace

`SponsorshipSet` crea, ajusta o borra un objeto `Sponsorship`: una relación en la que una cuenta (el patrocinador, quien envía la transacción) se compromete a cubrir la fee de las transacciones de otra cuenta, su owner reserve, o ambas cosas, hasta un límite (`MaxFee`) y un número de objetos patrocinados (`RemainingOwnerCountDelta`). Es la pieza que permite, por ejemplo, que una aplicación pague en nombre de sus usuarios sin que estos necesiten tener XRP propio para operar.

**Este tipo de transacción depende del amendment `Sponsor`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla con `temDISABLED` (o el equivalente) hasta que se active.

## Cuándo usarlo (cuando el amendment esté activo)

- Una aplicación patrocina las fees de sus usuarios nuevos para que puedan operar sin comprar XRP primero.
- Un servicio cubre la owner reserve de objetos que crea en nombre de un usuario (por ejemplo, un `TrustSet` inicial).
- Retirar o reducir un patrocinio existente ajustando `FeeAmountDelta` o usando `tfDeleteObject`.

## Cómo funciona por dentro

**`SponsorshipSet::preflight`** valida montos no negativos ni con formato inválido (`temBAD_AMOUNT`), rechaza combinaciones de flags contradictorias como fijar y limpiar `RequireSignForFee` a la vez, y exige que no te patrocines a ti mismo (`temREDUNDANT`).

**`SponsorshipSet::preclaim`** comprueba que la cuenta patrocinada existe (`tecNO_DST` si no), que no superas los límites del sistema de patrocinios (`tecLIMIT_EXCEEDED`) y, si estás modificando un patrocinio existente, que te pertenece (`tecNO_PERMISSION` si no) y que no es una pseudo-cuenta la involucrada (`tecPSEUDO_ACCOUNT`).

**`SponsorshipSet::doApply`**, vía `createSponsorship`, crea el objeto `Sponsorship` la primera vez (con reserva de propietario, `tecDIR_FULL` si el directorio está lleno) o ajusta `FeeAmount` y `RemainingOwnerCount` según los deltas indicados; si el saldo del patrocinador no cubre el compromiso, `tecUNFUNDED`. Con `tfDeleteObject`, elimina el patrocinio.

## Campos clave

- **Sponsee** — la cuenta patrocinada.
- **CounterpartySponsor** — para relaciones en las que ambas partes deben confirmar el patrocinio.
- **FeeAmountDelta** — cuánto añade o quita esta transacción al presupuesto de fees patrocinado (en drops).
- **MaxFee** — techo total de fee que el patrocinador está dispuesto a cubrir.
- **RemainingOwnerCountDelta** — cuántos objetos adicionales (reserva) se comprometen a cubrir.

## Flags

- **tfDeleteObject** — elimina el objeto `Sponsorship` existente en lugar de crearlo o modificarlo.
- **tfSponsorshipSetRequireSignForFee** / **tfSponsorshipClearRequireSignForFee** — exige (o deja de exigir) que el patrocinado firme para consumir el patrocinio de fee.
- **tfSponsorshipSetRequireSignForReserve** / **tfSponsorshipClearRequireSignForReserve** — lo mismo para el patrocinio de reserva.

## Errores habituales

- **temDISABLED** — el amendment `Sponsor` no está activo (el caso actual en testnet).
- **temREDUNDANT** — intentas patrocinarte a ti mismo.
- **tecNO_DST** — la cuenta `Sponsee` no existe.
- **tecUNFUNDED** — tu saldo no cubre el compromiso que estás asumiendo.
- **tecLIMIT_EXCEEDED** — superas el número máximo de patrocinios permitidos.
- **tecNO_PERMISSION** — intentas modificar un patrocinio que no es tuyo.

## Pruébalo en testnet

Como el amendment `Sponsor` no está activo hoy en testnet, cualquier `SponsorshipSet` que envíes desde el builder devolverá un error de tipo `temDISABLED`. Puedes comprobarlo con el ejemplo de abajo; cuando la red active el amendment, el mismo flujo creará el objeto `Sponsorship` y podrás consultarlo con `account_objects`.

## Ejemplo

```json
{
  "TransactionType": "SponsorshipSet",
  "Account": "rXXXX_TU_CUENTA",
  "Sponsor": "rYYYY_OTRA_CUENTA",
  "Flags": 65536
}
```

Intentaría crear un patrocinio hacia `rYYYY_OTRA_CUENTA`; falla con `temDISABLED` mientras el amendment no esté activo.

## Relacionado

- [SponsorshipTransfer](/tx/SponsorshipTransfer) — transfiere un patrocinio existente a otra cuenta.
- Amendments: [Sponsor](/amendments/Sponsor).
