---
title: SignerListSet
summary: Crea, sustituye o elimina la lista de firmantes (multifirma) de una cuenta, con pesos y un quórum.
category: multifirma
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/signerlistset
amendment: MultiSign
level: intermedio
---

## Qué hace

`SignerListSet` asocia a tu cuenta un objeto [SignerList](/objects/SignerList): un conjunto de entre 1 y 32 cuentas firmantes, cada una con un peso (`SignerWeight`), y un umbral (`SignerQuorum`). A partir de ese momento, cualquier transacción de tu cuenta puede ir firmada por un subconjunto de esas cuentas cuya suma de pesos alcance el quórum, en lugar de por tu clave maestra o regular.

Piensa en una caja fuerte con varias llaves: defines quién tiene llave, cuánto "vale" cada una y cuántas hacen falta para abrir. Un quórum de 2 con tres firmantes de peso 1 es un clásico "2 de 3"; también puedes dar peso 2 a un socio para que su firma valga por dos.

Una cuenta solo tiene una lista (el `SignerListID` siempre es 0 en el código actual). Enviar `SignerListSet` de nuevo sustituye la lista entera; enviarlo con `SignerQuorum: 0` y sin `SignerEntries` la borra.

## Cuándo usarlo

- Tesorerías compartidas donde ninguna persona debe poder mover fondos sola.
- Cuentas de emisor de tokens en las que deshabilitas la clave maestra y dejas el control a un comité.
- Recuperación: mantener una lista de firmantes de respaldo por si pierdes la clave principal.
- Automatizaciones con firmantes "fantasma": las cuentas firmantes no necesitan existir en el ledger.

## Cómo funciona por dentro

`SignerListSet::determineOperation` decide qué quieres hacer: si `SignerQuorum` es distinto de 0 y hay `SignerEntries`, es un `Set` (crear o sustituir); si el quórum es 0 y no hay entradas, es un `Destroy`. Cualquier otra combinación (quórum 0 con entradas, o quórum positivo sin entradas) es `Operation::Unknown` y `preflight` la rechaza con `temMALFORMED`. Las entradas se ordenan por cuenta antes de seguir.

Para un `Set`, `SignerListSet::validateQuorumAndSignerEntries` comprueba: entre `kMinMultiSigners` (1) y `kMaxMultiSigners` (32) entradas (`temMALFORMED`); sin cuentas duplicadas (`temBAD_SIGNER`); cada peso mayor que 0 (`temBAD_WEIGHT`); ningún firmante es la propia cuenta (`temBAD_SIGNER`); y el quórum es positivo y alcanzable, es decir, menor o igual que la suma de todos los pesos (`temBAD_QUORUM`). Un comentario del código lo deja explícito: no se verifica que las cuentas firmantes existan; se permiten "phantom accounts".

`SignerListSet::getFlagsMask` acepta solo flags universales cuando [fixInvalidTxFlags](/amendments/fixInvalidTxFlags) está activo (lo está en testnet).

No hay `preclaim` específico. En `doApply`, `SignerListSet::replaceSignerList` primero elimina la lista antigua si existe (así se libera su reserva antes de comprobar la nueva), luego llama a `checkReserve` con `ownerCountDelta = 1` contra el saldo previo al pago de la fee (`tecINSUFFICIENT_RESERVE` si no llega), crea el objeto `SignerList` con el flag `lsfOneOwnerCount`, lo inserta en el directorio de la cuenta (`tecDIR_FULL` si no cabe) e incrementa `OwnerCount` en 1. Ese "1 unidad de reserva, sea cual sea el tamaño de la lista" es el comportamiento del amendment [MultiSignReserve](/amendments/MultiSignReserve); al borrar una lista antigua sin `lsfOneOwnerCount`, `removeSignersFromLedger` aplica la fórmula previa (2 + número de firmantes) para descontar correctamente. Si [fixIncludeKeyletFields](/amendments/fixIncludeKeyletFields) está activo, `writeSignersToSLE` también graba el campo `Owner` en el objeto.

`SignerListSet::destroySignerList` tiene una protección importante: si la cuenta tiene `lsfDisableMaster` y no tiene `RegularKey`, devuelve `tecNO_ALTERNATIVE_KEY`. Sin esa regla borrarías la única forma de firmar y la cuenta quedaría bloqueada para siempre.

`SignerListSet` no es delegable (`delegable: false` en protocol.json): no puede autorizarse mediante [DelegateSet](/tx/DelegateSet).

## Campos clave

- **SignerQuorum** — suma mínima de pesos que deben firmar. 0 significa borrar la lista (y entonces no puede haber `SignerEntries`).
- **SignerEntries** — array de 1 a 32 objetos `SignerEntry` con `Account` y `SignerWeight` (1-65535). Opcionalmente `WalletLocator` (un hash de 256 bits de uso libre), que permite [ExpandedSignerList](/amendments/ExpandedSignerList). Las cuentas no tienen por qué existir.
- **Fee al usar la lista** — no es un campo de esta transacción, pero recuerda que una transacción multifirmada paga fee base × (número de firmas + 1).

## Errores habituales

- **temMALFORMED** — combinación inválida de quórum y entradas, o más de 32 (o cero) entradas.
- **temBAD_QUORUM** — el quórum es 0 con entradas, o supera la suma de pesos: nunca podría alcanzarse.
- **temBAD_SIGNER** — un firmante repetido, o te has incluido a ti mismo en tu propia lista.
- **temBAD_WEIGHT** — algún `SignerWeight` es 0.
- **tecINSUFFICIENT_RESERVE** — no cubres una unidad más de owner reserve (0,2 XRP en testnet).
- **tecNO_ALTERNATIVE_KEY** — intentas borrar la lista con la clave maestra deshabilitada y sin clave regular.

## Ejemplo

```json
{
  "TransactionType": "SignerListSet",
  "Account": "rXXXX_TU_CUENTA",
  "SignerQuorum": 2,
  "SignerEntries": [
    { "SignerEntry": { "Account": "rYYYY_OTRA_CUENTA", "SignerWeight": 1 } },
    { "SignerEntry": { "Account": "rZZZZ_EMISOR", "SignerWeight": 1 } }
  ]
}
```

## Pruébalo en testnet

1. Envía el ejemplo desde el builder: dos firmantes de peso 1 y quórum 2 (ambos deben firmar).
2. Consulta `account_objects` con `type: "signer_list"`: verás el objeto `SignerList` con `Flags: 65536` (`lsfOneOwnerCount`), `SignerQuorum: 2` y las entradas ordenadas por cuenta.
3. Mira `account_info`: `OwnerCount` ha subido exactamente en 1, independientemente del número de firmantes.
4. Prueba variantes que deben fallar: un `SignerQuorum: 3` (suma de pesos 2) devuelve `temBAD_QUORUM`; incluir tu propia cuenta devuelve `temBAD_SIGNER`.
5. Para borrar la lista, envía `SignerQuorum: 0` sin `SignerEntries` y comprueba que el objeto desaparece y `OwnerCount` baja en 1.
6. Si además tienes activado `asfDisableMaster` con [AccountSet](/tx/AccountSet) y no tienes clave regular, el borrado responderá `tecNO_ALTERNATIVE_KEY`.

## Relacionado

- [SignerList](/objects/SignerList) — el objeto que gestiona.
- [TicketCreate](/tx/TicketCreate) — tickets para no bloquear transacciones multifirma en curso.
- [SetRegularKey](/tx/SetRegularKey) y [AccountSet](/tx/AccountSet) (`asfDisableMaster`) — las otras dos formas de controlar quién firma.
- [MultiSignReserve](/amendments/MultiSignReserve), [ExpandedSignerList](/amendments/ExpandedSignerList), [fixIncludeKeyletFields](/amendments/fixIncludeKeyletFields).
- [Batch](/tx/Batch) — permite firmar un lote con `BatchSigners`, incluidos firmantes multifirma.
