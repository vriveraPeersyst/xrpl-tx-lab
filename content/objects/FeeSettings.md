---
title: FeeSettings
summary: Objeto único que guarda el coste base de una transacción y las reservas de cuenta y de propietario vigentes en la red.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/feesettings
createdBy: SetFee
modifiedBy: SetFee
reserve: 0
---

## Qué representa

`FeeSettings` es un *singleton*: solo existe un objeto de este tipo en todo el ledger y nadie es su propietario. Fija tres números que todo el mundo necesita para construir una transacción válida: el coste base en drops, la reserva de cuenta (lo mínimo que hay que tener para que exista una `AccountRoot`) y la reserva de propietario (lo que cuesta cada objeto adicional que posee la cuenta, como un `Escrow` o una línea de confianza). El servidor multiplica estos valores por la carga de la red (`load_factor`) para calcular la tarifa que realmente hay que pagar en cada transacción; eso no se guarda aquí, se calcula en caliente.

## Ciclo de vida

- **Creación**: existe desde el génesis del ledger; no la crea ninguna transacción de usuario.
- **Modificación**: el pseudo-transacción [SetFee](/tx/SetFee), que emiten los validadores por consenso (nunca un usuario) cuando deciden cambiar las tarifas de red. No se puede enviar manualmente.
- **Borrado**: nunca se borra.
- **Formato histórico**: el objeto tiene dos generaciones de campos convivientes. La antigua (`BaseFee`, `ReferenceFeeUnits`, `ReserveBase`, `ReserveIncrement`) usaba unidades de "fee units" relativas; la actual (`BaseFeeDrops`, `ReserveBaseDrops`, `ReserveIncrementDrops`) expresa todo directamente en drops. Un ledger reciente solo trae los campos en drops.

## Campos clave

- **BaseFeeDrops** — coste base de una transacción "normal" (un `Payment` simple), antes de aplicar `load_factor`.
- **ReserveBaseDrops** — mínimo de XRP que debe tener una cuenta para existir.
- **ReserveIncrementDrops** — coste adicional por cada objeto que la cuenta posea (líneas de confianza, ofertas, escrows, etc.).
- **BaseFee / ReferenceFeeUnits / ReserveBase / ReserveIncrement** — equivalentes heredados en "fee units"; en desuso, se mantienen por compatibilidad con clientes antiguos.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

No aparece en `account_objects` porque no pertenece a ninguna cuenta; se consulta directamente con `ledger_entry` pasando `"fee": true`, o con el método dedicado `fee` (sin `ledger_entry`):

```json
{ "method": "ledger_entry", "params": [{ "fee": true, "ledger_index": "validated" }] }
```

El índice es fijo: `SHA512Half(0x0065)` (`keylet::feeSettings`, namespace `'e'`). Respuesta típica en testnet:

```json
{
  "index": "4BC50C9B0D8515D3EAAE1E74B29A95804346C491EE1A95BF25E4AAB854A6A66",
  "node": {
    "LedgerEntryType": "FeeSettings",
    "BaseFeeDrops": "10",
    "ReserveBaseDrops": "1000000",
    "ReserveIncrementDrops": "200000",
    "Flags": 0
  }
}
```

También puedes usar el método `server_state`, que expone estos mismos valores ya combinados con `load_factor` dentro de `validated_ledger`.

## Relacionado

- [SetFee](/tx/SetFee)
- [Amendments](/objects/Amendments), [NegativeUNL](/objects/NegativeUNL)
- [FeeEscalation](/amendments/FeeEscalation)
