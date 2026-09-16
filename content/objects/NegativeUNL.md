---
title: NegativeUNL
summary: Objeto único que lista los validadores de la UNL que la red considera caídos, para no exigir su voto en el consenso.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/negativeunl
createdBy: sistema (UNLModify)
modifiedBy: UNLModify
reserve: 0
---

## Qué representa

`NegativeUNL` es un *singleton*: solo existe un objeto de este tipo en todo el ledger. La red necesita que una super-mayoría de la UNL (lista de validadores de confianza) esté de acuerdo para validar un ledger; si varios validadores se caen a la vez, ese umbral se vuelve difícil de alcanzar y la red puede dejar de avanzar. La Negative UNL es el mecanismo para, tras observar que un validador lleva tiempo sin participar, excluirlo temporalmente del cálculo de la mayoría requerida sin tener que cambiar la lista de confianza (`UNL`) en sí.

Un validador en la Negative UNL sigue siendo de confianza; solo no cuenta para el quorum mientras esté marcado como inactivo.

## Ciclo de vida

- **Creación**: existe desde el génesis, normalmente vacío.
- **Modificación**: el pseudo-transacción [UNLModify](/tx/UNLModify), emitido por los propios validadores mediante voto de consenso (nunca por un usuario), añade una clave a `ValidatorToDisable` cuando detectan inactividad sostenida de un validador, o la retira con `ValidatorToReEnable` cuando vuelve a participar. Ambos cambios solo se aplican en ledgers "flag" (múltiplos de 256).
- **Borrado**: nunca se borra, aunque quede vacío.

## Campos clave

- **DisabledValidators** — lista de validadores actualmente excluidos del quorum, cada uno con su clave pública maestra y el índice de ledger en que fueron deshabilitados.
- **ValidatorToDisable** — clave pública del validador que se propone deshabilitar en el próximo ledger flag (campo transitorio, presente solo mientras se procesa el cambio).
- **ValidatorToReEnable** — clave pública del validador que se propone reactivar en el próximo ledger flag.

## Flags

No tiene flags `lsf*`.

## Cómo consultarlo

No pertenece a ninguna cuenta, así que no aparece en `account_objects`. Con `ledger_entry`, se pasa `"nunl": true`:

```json
{ "method": "ledger_entry", "params": [{ "nunl": true, "ledger_index": "validated" }] }
```

El índice es fijo: `SHA512Half(0x004E)` (`keylet::negativeUNL`, namespace `'N'`). Respuesta típica (con la lista vacía, el caso normal en testnet):

```json
{
  "index": "2E8A1B4F5C9D0E3A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A",
  "node": {
    "LedgerEntryType": "NegativeUNL",
    "Flags": 0
  }
}
```

También puedes ver el estado actual con `server_info`/`consensus_info` en un `rippled` con acceso a métricas de validadores.

## Relacionado

- [UNLModify](/tx/UNLModify)
- [Amendments](/objects/Amendments), [FeeSettings](/objects/FeeSettings)
