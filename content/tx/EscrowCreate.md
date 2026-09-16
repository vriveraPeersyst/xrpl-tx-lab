---
title: EscrowCreate
summary: Bloquea XRP, tokens emitidos o MPT en un objeto Escrow que solo se libera al destinatario cuando pasa un tiempo o se presenta una condición criptográfica.
category: escrow
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/escrowcreate
amendment: Escrow
level: intermedio
---

## Qué hace

`EscrowCreate` aparta una cantidad de tu cuenta y la guarda en un objeto [Escrow](/objects/Escrow) del ledger. Ese dinero deja de estar disponible para ti, pero tampoco lo tiene todavía el destinatario: queda "en depósito" hasta que alguien lo libera con [EscrowFinish](/tx/EscrowFinish) o lo devuelve con [EscrowCancel](/tx/EscrowCancel).

La analogía es un sobre cerrado en una caja fuerte con temporizador: nadie puede abrirlo antes de `FinishAfter`, solo el destinatario puede cobrarlo entre `FinishAfter` y `CancelAfter`, y después de `CancelAfter` solo se puede devolver al remitente. Además del tiempo, puedes exigir una `Condition` (crypto-condition PREIMAGE-SHA-256): el escrow solo se libera si alguien presenta la preimagen correcta.

Desde el amendment [TokenEscrow](/amendments/TokenEscrow), activo en testnet, el `Amount` puede ser XRP, un token emitido (IOU) o un MPT. Con tokens el emisor debe haber activado `lsfAllowTrustLineLocking` (o `lsfMPTCanEscrow` en la emisión MPT). El objeto creado consume una unidad de owner reserve de tu cuenta hasta que desaparece.

## Cuándo usarlo

- Pagos diferidos o vesting: liberar fondos a una fecha concreta sin depender de que el remitente siga activo.
- Pagos condicionados: un intercambio en el que el cobro exige revelar un secreto (la preimagen de la condición).
- Garantías: bloquear XRP como fianza, con `CancelAfter` para recuperarla si nadie la reclama.
- Bloquear tokens emitidos (stablecoins, por ejemplo) con las mismas reglas, si el emisor lo permite.

## Cómo funciona por dentro

**`EscrowCreate::preflight`** (validación estática). Si `Amount` no es XRP, exige que [TokenEscrow](/amendments/TokenEscrow) esté activo (si no, `temBAD_AMOUNT`) y que el importe sea positivo y con moneda válida. Con XRP basta con que sea mayor que cero. Debe haber al menos uno de `CancelAfter` o `FinishAfter` (`temBAD_EXPIRATION`); si están los dos, `CancelAfter` tiene que ser estrictamente posterior a `FinishAfter`. Si no hay `FinishAfter`, tiene que haber `Condition`: el código lo justifica porque, sin ninguno de los dos, el escrow se podría finalizar de inmediato y eso confunde (`temMALFORMED`). Si hay `Condition`, se deserializa con `Condition::deserialize`; si está mal formada, `temMALFORMED`. Los campos `Bytecode` y `Data` (SmartEscrow) hacen que `checkExtraFeatures` rechace la transacción mientras ese amendment no exista en la red.

**`EscrowCreate::preclaim`** (contra el ledger). El destino tiene que existir (`tecNO_DST`) y no puede ser una pseudo-cuenta (`tecNO_PERMISSION`). Para tokens IOU, `escrowCreatePreclaimHelper<Issue>` comprueba, en este orden: no eres el emisor; el emisor existe (`tecNO_ISSUER`) y tiene `lsfAllowTrustLineLocking` (`tecNO_PERMISSION`); tienes trust line con él (`tecNO_LINE`); tanto tú como el destino pasáis `requireAuth` si el emisor exige autorización; ninguno de los dos está congelado (`tecFROZEN`); y tu saldo disponible cubre el importe (`tecINSUFFICIENT_FUNDS`). Para MPT se comprueba lo equivalente: la emisión existe, tiene `lsfMPTCanEscrow`, tienes un objeto MPToken, no estás bloqueado (`tecLOCKED`) y la emisión permite transferir.

**`EscrowCreate::doApply`** (efectos). Primero mira el tiempo de cierre del ledger padre: si `CancelAfter` o `FinishAfter` ya han pasado, devuelve `tecNO_PERMISSION`, es decir, no puedes crear un escrow con fechas en el pasado. Luego comprueba que cubres la reserva con un objeto más (`checkReserve`) y, si el escrow es de XRP, que tras restar el importe sigues por encima de tu reserva (`tecUNFUNDED`). Si el destino tiene `lsfRequireDestTag` y no pones `DestinationTag`, `tecDST_TAG_NEEDED`. A continuación crea la entrada `Escrow` indexada por tu cuenta y el Sequence (o Ticket) de la transacción, la inserta en tu owner directory, en el del destino (si no es un auto-envío) y, para IOU, también en el del emisor. Con tokens guarda el `TransferRate` vigente del emisor en el objeto para aplicarlo en el cobro. Finalmente resta el importe de tu `Balance` (XRP) o mueve los tokens al emisor con `directSendNoFee` / `lockEscrowMPT`, e incrementa tu `OwnerCount`.

## Campos clave

- **Amount** — Cantidad a bloquear. En drops si es XRP; objeto `{currency, issuer, value}` para IOU; `{mpt_issuance_id, value}` para MPT.
- **FinishAfter** — Segundos desde el Ripple Epoch (2000-01-01 00:00 UTC), no Unix. Antes de este instante nadie puede finalizar el escrow.
- **CancelAfter** — Segundos Ripple Epoch. A partir de aquí ya no se puede finalizar y cualquiera puede cancelar. Sin él, el escrow nunca caduca.
- **Condition** — Crypto-condition PREIMAGE-SHA-256 en hexadecimal. Quien finalice tendrá que aportar el `Fulfillment` correspondiente.
- **DestinationTag** — Obligatorio si el destino exige tag; se copia al objeto para que el destinatario lo vea al cobrar.

## Errores habituales

- **temBAD_EXPIRATION** — No has puesto ni `FinishAfter` ni `CancelAfter`, o `CancelAfter` no es posterior a `FinishAfter`.
- **temMALFORMED** — Sin `FinishAfter` y sin `Condition`, o la `Condition` no es un crypto-condition válido.
- **tecNO_PERMISSION** — Las fechas ya han pasado al aplicar la transacción, el destino es una pseudo-cuenta, o el emisor del token no permite bloquear (`lsfAllowTrustLineLocking` / `lsfMPTCanEscrow`).
- **tecUNFUNDED** — Tras apartar el XRP te quedarías por debajo de la reserva (1 XRP base + 0,2 XRP por objeto en testnet).
- **tecINSUFFICIENT_RESERVE** — No cubres la reserva del nuevo objeto.
- **tecNO_DST** — La cuenta destino no existe. Un escrow no crea cuentas.
- **tecDST_TAG_NEEDED** — El destino tiene `lsfRequireDestTag` y falta `DestinationTag`.
- **tecNO_LINE / tecFROZEN** — Con tokens: no tienes trust line con el emisor o la línea (tuya o del destino) está congelada.

## Ejemplo

Bloquea 2 XRP que se podrán cobrar a partir de dos minutos y devolver a partir de un día. Los tiempos son Ripple Epoch (843000120 ≈ ahora + 120 s; 843086400 ≈ ahora + 86 400 s).

```json
{
  "TransactionType": "EscrowCreate",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "Amount": "2000000",
  "FinishAfter": 843000120,
  "CancelAfter": 843086400
}
```

## Pruébalo en testnet

1. En el builder, deja `Amount` en `2000000` drops y ajusta `FinishAfter` a unos minutos en el futuro (el builder calcula `{{time+120}}` por ti).
2. Firma y envía. Comprueba que el resultado es `tesSUCCESS` y anota el `Sequence` de la transacción: lo necesitarás como `OfferSequence` en `EscrowFinish` o `EscrowCancel`.
3. Consulta `account_objects` con `type: "escrow"` sobre tu cuenta: verás el objeto con `Amount`, `Destination`, `FinishAfter` y `CancelAfter`.
4. Consulta `account_info`: tu `Balance` ha bajado en 2 XRP más la fee y tu `OwnerCount` ha subido en 1.
5. Intenta un `EscrowFinish` antes de `FinishAfter`: obtendrás `tecNO_PERMISSION`. Repite cuando haya pasado el tiempo.

## Relacionado

- [EscrowFinish](/tx/EscrowFinish) — libera los fondos al destinatario.
- [EscrowCancel](/tx/EscrowCancel) — devuelve los fondos tras `CancelAfter`.
- [Escrow](/objects/Escrow) — el objeto que crea esta transacción.
- [TokenEscrow](/amendments/TokenEscrow) — permite bloquear IOU y MPT.
- [fixTokenEscrowV1](/amendments/fixTokenEscrowV1) — correcciones al escrow de tokens.
- [AccountSet](/tx/AccountSet) — el emisor activa `asfAllowTrustLineLocking`.
