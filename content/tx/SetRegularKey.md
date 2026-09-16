---
title: SetRegularKey
summary: Asigna, cambia o elimina la clave regular de tu cuenta: un segundo par de claves con el que firmar sin exponer la clave maestra.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/setregularkey
level: básico
---

## Qué hace

Toda cuenta del XRPL nace con una **clave maestra**, derivada de la semilla que la creó. `SetRegularKey` añade al [AccountRoot](/objects/AccountRoot) un campo `RegularKey` con la dirección derivada de otro par de claves. A partir de ahí, las transacciones de la cuenta pueden firmarse con la clave maestra **o** con la regular.

La idea es la de una llave de uso diario frente a la llave del banco: guardas la maestra fuera de línea y operas con la regular. Si la regular se filtra, la sustituyes con otra `SetRegularKey` firmada con la maestra. Y si además desactivas la maestra con [AccountSet](/tx/AccountSet) (`asfDisableMaster`), una filtración de la maestra tampoco compromete la cuenta mientras la regular esté a salvo.

La transacción solo modifica el `AccountRoot`; no crea objetos ni consume reserva.

## Cuándo usarlo

- Rotar claves de forma periódica sin cambiar de dirección.
- Firmar desde un servidor o un dispositivo menos seguro con una clave que puedas revocar.
- Preparar el paso a `asfDisableMaster` para que la maestra quede en frío.
- Recuperar el control tras un compromiso de la clave regular.

## Cómo funciona por dentro

**`SetRegularKey::calculateBaseFee`** tiene una peculiaridad: si la transacción está firmada con la **clave maestra** de la cuenta y el `AccountRoot` no tiene el flag `lsfPasswordSpent`, la fee base es **0 drops**. Es una salvaguarda de un solo uso: una cuenta cuya clave regular ha sido comprometida puede fijar una nueva aunque el atacante le haya vaciado el saldo. En cualquier otro caso se cobra la fee normal.

**`SetRegularKey::preflight`** solo comprueba una cosa: `RegularKey` no puede ser la dirección de la propia cuenta (`temBAD_REGKEY`). Es decir, no puedes registrar la maestra como regular.

No hay `preclaim` específico; se aplican las comprobaciones genéricas de `Transactor` (cuenta existente, secuencia, firma…).

**`SetRegularKey::doApply`**:

1. Si la fee cobrada fue inferior a la mínima (es decir, se usó la fee gratuita), marca `lsfPasswordSpent` en el `AccountRoot`. El flag se vuelve a desarmar cuando la cuenta recibe un pago de XRP directo ([Payment](/tx/Payment) lo limpia en `doApply`).
2. Si la transacción trae `RegularKey`, la escribe en el `AccountRoot`.
3. Si no la trae, **elimina** la clave regular. Pero si la maestra está desactivada (`lsfDisableMaster`) y no existe un [SignerList](/objects/SignerList), lo rechaza con `tecNO_ALTERNATIVE_KEY`: no puedes dejar la cuenta sin ninguna forma de firmar.

Fíjate en que el ledger **no verifica** que `RegularKey` corresponda a una clave que realmente poseas: es una dirección cualquiera. Si te equivocas al derivarla, esa clave no servirá para nada y tendrás que corregirla con la maestra.

La transacción no es delegable.

## Campos clave

- **RegularKey** — dirección (`r...`) derivada de la clave pública del nuevo par. Se obtiene como cualquier dirección: `calcAccountID(publicKey)`. Omítelo para borrar la clave regular actual.

## Errores habituales

- **temBAD_REGKEY** — `RegularKey` es igual a `Account`. Deriva una clave nueva.
- **tecNO_ALTERNATIVE_KEY** — intentas eliminar la clave regular con la maestra desactivada y sin lista de firmantes. Rehabilita la maestra (`ClearFlag: 4`) o crea un [SignerListSet](/tx/SignerListSet) antes.
- **tefMASTER_DISABLED** — (comprobación genérica de firma) firmas con la maestra cuando está desactivada.
- **tefBAD_AUTH** — firmas con una clave que no es ni la maestra ni la regular vigente.

## Ejemplo

```json
{
  "TransactionType": "SetRegularKey",
  "Account": "rXXXX_TU_CUENTA",
  "RegularKey": "rYYYY_OTRA_CUENTA"
}
```

En el ejemplo se usa la dirección de otra cuenta de demostración como clave regular. En un uso real generarías un par de claves nuevo y pondrías su dirección aquí.

## Pruébalo en testnet

1. Envía el ejemplo. Consulta `account_info`: en `account_data` aparece `RegularKey: rYYYY_OTRA_CUENTA`.
2. Firma cualquier transacción sencilla (por ejemplo un [AccountSet](/tx/AccountSet) vacío) con la semilla de `rYYYY_OTRA_CUENTA` pero con `Account: rXXXX_TU_CUENTA`: se acepta, porque esa clave ahora es la regular de tu cuenta.
3. Envía `SetRegularKey` **sin** `RegularKey`, firmado con la maestra: el campo desaparece de `account_info`.
4. Para ver `tecNO_ALTERNATIVE_KEY`: vuelve a fijar la regular, desactiva la maestra con `AccountSet SetFlag: 4` (firmado con la maestra), y luego intenta borrar la regular firmando con ella misma.
5. Observa la fee: si la envías firmada con la maestra y la cuenta nunca usó la fee gratuita, el builder puede poner `Fee: "0"` y la red la aceptará; en los metadatos verás que se activa `lsfPasswordSpent`.

## Relacionado

- [AccountSet](/tx/AccountSet) — `asfDisableMaster` (4) para desactivar la maestra una vez configurada la regular.
- [SignerListSet](/tx/SignerListSet) — alternativa multifirma; también cuenta como "clave alternativa".
- [Payment](/tx/Payment) — un pago XRP entrante rearma la fee gratuita (`lsfPasswordSpent`).
- Objetos: [AccountRoot](/objects/AccountRoot), [SignerList](/objects/SignerList).
- Amendments: [fixMasterKeyAsRegularKey](/amendments/fixMasterKeyAsRegularKey).
