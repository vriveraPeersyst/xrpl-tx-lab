# Guía de redacción de contenido (content/)

Esta web es educativa: cada página debe permitir a alguien que no conoce el XRPL entender
**qué hace** una transacción u objeto, **cuándo usarlo**, **qué puede fallar** y **cómo
probarlo en testnet** desde el builder de la propia página. Todo en **español**, con
ortografía completa (tildes, ñ). Los identificadores técnicos (nombres de campos, flags,
códigos TER, nombres de amendments) se dejan en inglés tal cual aparecen en rippled.

## Fuentes de verdad, por orden

1. `src/data/testnet.json` → qué existe HOY en la testnet (tipos, campos, flags, TER, amendments activos).
2. `src/data/protocol.json` → cómo funciona (campos con opcionalidad, transactor: TER por fase,
   amendments consultados, flags, privilegios, delegabilidad). Extraído del código.
3. `vendor/rippled/src/libxrpl/tx/transactors/**` → el código real. Léelo para explicar reglas
   (preflight = validación estática, preclaim = validación contra el ledger, doApply = efectos).
4. Documentación: https://xrpl.org/docs/references/protocol/transactions/types/<nombre-en-minúsculas>
   y las XLS en https://github.com/XRPLF/XRPL-Standards (útiles para entender; NO son la verdad
   si contradicen el código).

Lo que la UI ya genera automáticamente desde protocol.json (NO lo repitas en el markdown):
tabla de campos con tipos/opcionalidad, lista de flags con valores hex, lista completa de códigos
TER que devuelve el transactor, amendments consultados y enlaces al código fuente.

## content/tx/<Name>.md

```
---
title: Payment
summary: Envía XRP, tokens emitidos o MPT a otra cuenta, con enrutado (paths) y conversión entre monedas.   # 1 frase
category: pagos          # una de: cuenta | pagos | dex | tokens | nft | mpt | escrow | canales | cheques | multifirma | identidad | permisos | amm | puente | vault | prestamos | confidencial | batch | oraculos | sistema | otros
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/payment
xls: XLS-0033   # opcional, la XLS que lo introdujo (formato XLS-00NN)
amendment: MPTokensV1   # opcional, amendment que introdujo el tipo (si aplica)
level: básico   # básico | intermedio | avanzado
---

## Qué hace
2-4 párrafos claros. Analogía si ayuda. Qué objetos del ledger crea/modifica/borra (enlaza como [Escrow](/objects/Escrow)).

## Cuándo usarlo
Casos de uso reales, viñetas.

## Cómo funciona por dentro
Explica las tres fases del transactor con lo relevante del código: qué valida `preflight`
(estático), qué comprueba `preclaim` contra el ledger, qué hace `doApply`. Cita reglas
concretas (p.ej. "si el destino no existe y Amount es XRP ≥ reserva base, se crea la cuenta").
Menciona qué amendments cambian el comportamiento (enlaza como [Credentials](/amendments/Credentials)).

## Campos clave
Explica solo los campos con semántica no obvia (no repitas la tabla). Usa una lista `**Campo** — explicación`.

## Flags
Solo si el tipo tiene flags: explica el efecto de cada uno en una lista. Si no, omite la sección.

## Errores habituales
Los 4-8 códigos TER más frecuentes con su causa y cómo evitarlos: `**tecNO_DST** — …`.

## Ejemplo
Un JSON completo y válido para testnet dentro de ```json. Debe coincidir con el `example` del registro (src/lib/tx/registry.ts) o mejorarlo.

## Pruébalo en testnet
Pasos concretos (numerados) para probarlo con el builder de esta página y qué observar después
(p.ej. "consulta account_objects y verás un objeto Escrow").

## Relacionado
Lista de enlaces a otras tx/objetos/amendments de esta web.
```

Longitud orientativa: 400-1200 palabras. Los pseudo-tipos (EnableAmendment, SetFee, UNLModify)
se documentan igual pero sin "Pruébalo": explica que los emite el sistema y no se pueden enviar.

## content/objects/<Name>.md

```
---
title: Escrow
summary: Retiene XRP o tokens hasta que se cumple una condición o un tiempo.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/escrow
createdBy: EscrowCreate          # tx que lo crean (coma-separado)
modifiedBy: EscrowFinish, EscrowCancel
reserve: 1                       # unidades de owner reserve que consume (0 si no cuenta)
---

## Qué representa
## Ciclo de vida (qué tx lo crea, modifica, borra; enlaza a /tx/<Name>)
## Campos clave (solo semántica no obvia)
## Flags (si tiene lsf*)
## Cómo consultarlo (método RPC: account_objects con type=..., ledger_entry con qué parámetros, ejemplo de respuesta JSON)
## Relacionado
```

## content/amendments/<Name>.md

```
---
title: Credentials
summary: Añade credenciales verificables on-chain (CredentialCreate/Accept/Delete) y su uso en DepositPreauth y pagos.
xls: XLS-0070
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials   # si existe
xrplDocs: https://xrpl.org/resources/known-amendments#credentials
introducedIn: 2.3.0    # versión de rippled, si se sabe
---

## Qué cambia
## Transacciones y objetos afectados (enlaces a /tx y /objects)
## Estado y contexto (para qué sirve, por qué se propuso; para los fix*: qué bug corrige)
```

El estado (activo en testnet, votación, veto) lo pinta la UI desde testnet.json; no lo escribas.
Longitud: 150-500 palabras. Para los `fix*` basta con 150.

## Estilo

- Tono claro y directo, segunda persona ("puedes", "envías").
- Frases cortas. Nada de relleno ni de marketing.
- Números y unidades exactos: drops vs XRP, segundos Ripple Epoch (2000-01-01) vs Unix.
- Cuando cites código: ruta y función (`Payment::preclaim`), no líneas.
- No inventes campos ni reglas: si no está en el código o en protocol.json, no existe.
