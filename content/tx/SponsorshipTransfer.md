---
title: SponsorshipTransfer
summary: Crea, cierra o reasigna el patrocinio de fee/reserva de un objeto o cuenta a otro patrocinador.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/sponsorshiptransfer
amendment: Sponsor
level: avanzado
---

## Qué hace

`SponsorshipTransfer` gestiona el ciclo de vida del patrocinio sobre un objeto concreto del ledger o sobre la cuenta patrocinada en general: puede crear un patrocinio nuevo (`tfSponsorshipCreate`), terminarlo (`tfSponsorshipEnd`) o reasignarlo de un patrocinador a otro (`tfSponsorshipReassign`). A diferencia de [SponsorshipSet](/tx/SponsorshipSet), que ajusta el presupuesto de un patrocinio existente, esta transacción actúa sobre la propia relación de patrocinio: quién es el patrocinador de un objeto u owner count concretos.

**Este tipo de transacción depende del amendment `Sponsor`, que hoy no está activo en testnet.** Cualquier intento de enviarla falla mientras el amendment no esté activo.

## Cuándo usarlo (cuando el amendment esté activo)

- Traspasar el patrocinio de la reserva de un objeto (por ejemplo, un `TrustSet`) de una aplicación a otra cuando cambia el operador del servicio.
- Terminar formalmente un patrocinio cuando la relación comercial acaba, liberando al patrocinador de la obligación.
- Crear un patrocinio dirigido a un objeto concreto (`ObjectID`) en lugar de a la cuenta en general.

## Cómo funciona por dentro

**`SponsorshipTransfer::preflight`** exige exactamente uno de los tres flags de acción (`tfSponsorshipCreate`, `tfSponsorshipEnd`, `tfSponsorshipReassign`) y valida la coherencia de los campos según la acción: crear requiere los datos del nuevo patrocinio, reasignar requiere identificar tanto el patrocinio existente como el nuevo patrocinador con su firma (`SponsorSignature`).

**`SponsorshipTransfer::preclaim`** comprueba que la cuenta o el objeto (`ObjectID`) existen y, según la acción, que el patrocinio referenciado existe (`tecNO_ENTRY`) y que quien envía la transacción tiene permiso para tocarlo (`tecNO_PERMISSION` si no).

**`SponsorshipTransfer::doApply`** ajusta los contadores `SponsoredOwnerCount`, `SponsoringAccountCount` y `SponsoringOwnerCount` de las cuentas implicadas y, según el flag, crea, borra o traspasa el vínculo de patrocinio correspondiente.

## Campos clave

- **ObjectID** — el objeto concreto del ledger cuyo patrocinio se gestiona. Si lo omites, la operación afecta al patrocinio general de la cuenta.
- **Sponsee** — la cuenta beneficiaria del patrocinio.
- **Sponsor** / **SponsorFlags** / **SponsorSignature** — identifican al nuevo patrocinador y su autorización explícita para asumir el compromiso, necesaria en una reasignación.

## Flags

- **tfSponsorshipCreate** — crea un nuevo vínculo de patrocinio.
- **tfSponsorshipEnd** — termina un patrocinio existente.
- **tfSponsorshipReassign** — traspasa un patrocinio existente a otro patrocinador.

## Errores habituales

- **tecNO_ENTRY** — el patrocinio u objeto referenciado no existe.
- **tecNO_PERMISSION** — no tienes autoridad sobre el patrocinio que intentas modificar.
- **temINVALID_FLAG** — no indicaste ninguno de los tres flags de acción, o indicaste más de uno.
- **temMALFORMED** — faltan campos requeridos para la acción elegida.

## Ejemplo

```json
{
  "TransactionType": "SponsorshipTransfer",
  "Account": "rXXXX_TU_CUENTA",
  "Sponsor": "rYYYY_OTRA_CUENTA",
  "Flags": 65536
}
```

Intentaría crear un patrocinio (`Flags: 65536` = `tfSponsorshipCreate`) con `rYYYY_OTRA_CUENTA` como patrocinador; fallará mientras el amendment `Sponsor` no esté activo en testnet.

## Pruébalo en testnet

El amendment `Sponsor` no está activo hoy en testnet, así que cualquier envío de esta transacción desde el builder de esta página fallará. Puedes comprobarlo con el ejemplo de arriba; cuando la red active el amendment, podrás repetir el flujo y verificar el cambio de patrocinador consultando el objeto correspondiente por `ledger_entry`.

## Relacionado

- [SponsorshipSet](/tx/SponsorshipSet) — crea y ajusta el presupuesto de un patrocinio.
- Amendments: [Sponsor](/amendments/Sponsor).
