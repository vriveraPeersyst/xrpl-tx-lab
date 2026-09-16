---
title: AccountSet
summary: Modifica la configuración de tu cuenta: flags (asf*), dominio, clave de mensajes, comisión de transferencia y demás campos del AccountRoot.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/accountset
level: básico
---

## Qué hace

`AccountSet` es el panel de ajustes de una cuenta. No mueve fondos: cambia campos y flags del objeto [AccountRoot](/objects/AccountRoot) que representa tu cuenta en el ledger. Con ella defines cómo se comporta tu cuenta ante los demás (¿exijo `DestinationTag`? ¿acepto trust lines entrantes? ¿bloqueo depósitos?) y cómo se comporta como emisor de tokens (`DefaultRipple`, `RequireAuth`, `TransferRate`, congelación global, clawback).

Los flags de cuenta se activan de uno en uno con `SetFlag` y se desactivan con `ClearFlag`, usando los valores `asf*` (por ejemplo `8` = `asfDefaultRipple`). Los campos como `Domain` o `EmailHash` se establecen con su valor y se borran enviando el valor vacío o cero.

## Cuándo usarlo

- Exchanges: exigir `DestinationTag` (`asfRequireDest`) para no perder depósitos.
- Emisores de tokens: activar `asfDefaultRipple` antes de emitir, fijar `TransferRate`, exigir autorización (`asfRequireAuth`) o preparar clawback (`asfAllowTrustLineClawback`).
- Seguridad: desactivar la clave maestra (`asfDisableMaster`) tras configurar una clave regular o una lista de firmantes.
- Privacidad y control: `asfDepositAuth`, `asfDisallowIncomingTrustline`, `asfDisallowIncomingCheck`, `asfDisallowIncomingPayChan`, `asfDisallowIncomingNFTokenOffer`.
- Publicar el dominio de la cuenta (`Domain`) para verificación con `xrp-ledger.toml`.

## Cómo funciona por dentro

**`AccountSet::preflight`** rechaza `SetFlag == ClearFlag` (`temINVALID_FLAG`) y las combinaciones contradictorias de los flags legacy `tf*` con sus equivalentes `asf*` (RequireAuth, RequireDest, DisallowXRP). `TransferRate` debe ser 0 o estar entre 1.000.000.000 y 2.000.000.000 (`temBAD_TRANSFER_RATE`, es decir, de 0 % a 100 % de comisión). `TickSize` debe ser 0 o entre 3 y 15 (`temBAD_TICK_SIZE`). `MessageKey` debe ser una clave pública válida (`telBAD_PUBLIC_KEY`) y `Domain` no puede superar 256 bytes (`telBAD_DOMAIN`). `asfAuthorizedNFTokenMinter` exige `NFTokenMinter` al activarse y lo prohíbe al desactivarse (`temMALFORMED`).

**`AccountSet::preclaim`** consulta el directorio de propietario:

- Activar `asfRequireAuth` solo es posible si la cuenta **no tiene ningún objeto** (directorio vacío); si no, `tecOWNERS`. Así nadie cambia las reglas con trust lines ya abiertas.
- Activar `asfAllowTrustLineClawback` también exige directorio vacío (`tecOWNERS`) y que no esté puesto `lsfNoFreeze` (`tecNO_PERMISSION`).
- Activar `asfNoFreeze` está prohibido si ya tienes clawback (`tecNO_PERMISSION`).

**`AccountSet::doApply`** aplica los cambios sobre el `AccountRoot`:

- `asfDisableMaster` exige que la transacción esté **firmada con la clave maestra** (`tecNEED_MASTER_KEY`) y que exista una `RegularKey` o un [SignerList](/objects/SignerList) (`tecNO_ALTERNATIVE_KEY`); de lo contrario te quedarías sin forma de firmar.
- `asfNoFreeze` también exige firma con la clave maestra (salvo que ya esté desactivada). Es irreversible: no hay rama que lo quite.
- `asfGlobalFreeze` puede activarlo cualquiera, pero **no puedes quitarlo si tienes `NoFreeze`**: la promesa de no congelar incluye no usar el congelado global como arma.
- `asfAllowTrustLineClawback` solo se activa; el código no tiene rama para desactivarlo.
- `asfAccountTxnID` añade/quita el campo `AccountTxnID` del `AccountRoot`.
- `asfAllowTrustLineLocking` (para [TokenEscrow](/amendments/TokenEscrow), activo en testnet) permite escrows de tus tokens.
- Campos: `EmailHash`, `WalletLocator`, `MessageKey`, `Domain` se borran si envías `0`/vacío. `TransferRate` 0 o 1.000.000.000 elimina el campo (sin comisión). `TickSize` 0 o 15 lo elimina.

La transacción **no es delegable** (`delegable: false` en protocol.json): solo el propio titular, su clave regular o sus firmantes pueden enviarla.

## Campos clave

- **SetFlag / ClearFlag** — un único valor `asf*` por transacción. No confundir con `Flags` (los `tf*` legacy, que solo cubren RequireDest, RequireAuth y DisallowXRP).
- **TransferRate** — comisión que cobras cuando dos terceros se transfieren tu token: `1020000000` = 2 %. Solo afecta a tokens IOU que emites.
- **TickSize** — decimales significativos de las ofertas que involucren tu token (3-15).
- **Domain** — dominio en hex, minúsculas por convención (`6578616d706c652e636f6d` = `example.com`).
- **MessageKey** — clave pública para cifrado de mensajes fuera del ledger.
- **NFTokenMinter** — cuenta autorizada a acuñar NFT en tu nombre (junto a `asfAuthorizedNFTokenMinter`, valor 10).
- **EmailHash** — MD5 del email, usado históricamente para avatares Gravatar.

## Flags

Flags de transacción legacy (`Flags`):

- **tfRequireDestTag / tfOptionalDestTag** — igual que `SetFlag: 1` / `ClearFlag: 1`.
- **tfRequireAuth / tfOptionalAuth** — igual que `SetFlag: 2` / `ClearFlag: 2`.
- **tfDisallowXRP / tfAllowXRP** — igual que `SetFlag: 3` / `ClearFlag: 3`. Nota: `lsfDisallowXRP` es solo una recomendación para clientes; el ledger no lo aplica.

Valores `asf*` más usados en `SetFlag`/`ClearFlag`: 1 RequireDest, 2 RequireAuth, 3 DisallowXRP, 4 DisableMaster, 5 AccountTxnID, 6 NoFreeze, 7 GlobalFreeze, 8 DefaultRipple, 9 DepositAuth, 10 AuthorizedNFTokenMinter, 12-15 DisallowIncoming (NFTokenOffer, Check, PayChan, Trustline), 16 AllowTrustLineClawback, 17 AllowTrustLineLocking.

## Errores habituales

- **tecOWNERS** — intentas `asfRequireAuth` o `asfAllowTrustLineClawback` con objetos ya creados. Hazlo en una cuenta recién activada.
- **tecNEED_MASTER_KEY** — `asfDisableMaster` o `asfNoFreeze` firmado con clave regular o multifirma. Firma con la maestra.
- **tecNO_ALTERNATIVE_KEY** — quieres desactivar la maestra sin tener clave regular ni lista de firmantes.
- **tecNO_PERMISSION** — combinas `NoFreeze` y clawback.
- **temINVALID_FLAG** — `SetFlag` y `ClearFlag` iguales, o un `tf*` contradictorio con el `asf*`.
- **temBAD_TRANSFER_RATE** — `TransferRate` fuera de [1e9, 2e9] (y distinto de 0).
- **telBAD_DOMAIN** — `Domain` de más de 256 bytes.

## Ejemplo

```json
{
  "TransactionType": "AccountSet",
  "Account": "rXXXX_TU_CUENTA",
  "SetFlag": 8,
  "Domain": "6578616D706C652E636F6D"
}
```

Activa `asfDefaultRipple` y publica el dominio `example.com`.

## Pruébalo en testnet

1. Envía el ejemplo. Consulta `account_info`: en `account_data` verás `Domain` y, en `account_flags`, `defaultRipple: true`.
2. Prueba `SetFlag: 1` y luego pide a la otra cuenta que te envíe un [Payment](/tx/Payment) sin `DestinationTag`: obtendrá `tecDST_TAG_NEEDED`. Revierte con `ClearFlag: 1`.
3. Prueba `SetFlag: 4` (`asfDisableMaster`) sin haber configurado clave regular: `tecNO_ALTERNATIVE_KEY`. Configura una con [SetRegularKey](/tx/SetRegularKey) y repite: ahora tiene éxito y la cuenta ya no acepta firmas de la maestra.
4. Si tu cuenta tiene alguna trust line, envía `SetFlag: 2`: verás `tecOWNERS`.
5. Borra el dominio enviando `"Domain": ""` y comprueba que el campo desaparece de `account_info`.

## Relacionado

- [SetRegularKey](/tx/SetRegularKey) y [SignerListSet](/tx/SignerListSet) — requisitos para `asfDisableMaster`.
- [DepositPreauth](/tx/DepositPreauth) — lista blanca cuando activas `asfDepositAuth`.
- [TrustSet](/tx/TrustSet) — `asfRequireAuth` y `asfDefaultRipple` afectan a cómo se crean las trust lines.
- [Clawback](/tx/Clawback) — necesita `asfAllowTrustLineClawback`.
- [NFTokenMint](/tx/NFTokenMint) — usa `NFTokenMinter`.
- Objetos: [AccountRoot](/objects/AccountRoot).
- Amendments: [Clawback](/amendments/Clawback), [DisallowIncoming](/amendments/DisallowIncoming), [DepositAuth](/amendments/DepositAuth), [TokenEscrow](/amendments/TokenEscrow), [TickSize](/amendments/TickSize).
