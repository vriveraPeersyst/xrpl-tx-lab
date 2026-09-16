---
title: AccountDelete
summary: Borra tu cuenta del ledger y envía todo el XRP restante (incluida la reserva) a otra cuenta; cuesta una reserva incremental y exige no tener obligaciones pendientes.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/accountdelete
amendment: DeletableAccounts
level: avanzado
---

## Qué hace

`AccountDelete` elimina el objeto [AccountRoot](/objects/AccountRoot) de tu cuenta y transfiere a `Destination` todo el XRP que quede después de pagar la tasa, incluida la reserva base que normalmente no puedes gastar. Es la única forma de recuperar esa reserva. La transacción está pensada para cuentas "vacías": antes de borrarla tienes que deshacerte de todo lo que constituya una obligación hacia terceros (trust lines con saldo, escrows, canales de pago, cheques, NFTs...). Los objetos que solo te afectan a ti (órdenes del DEX, tickets, lista de firmantes, preautorizaciones, ofertas de NFT, DID, oráculos, credenciales, delegaciones) se borran automáticamente en la misma transacción.

La tasa no es la habitual: `AccountDelete::calculateBaseFee` devuelve una **reserva incremental completa** (0,2 XRP en testnet) en lugar de 10 drops. Este coste disuade de crear y borrar cuentas en bucle.

Una cuenta borrada puede volver a crearse recibiendo XRP, pero empezará con un `Sequence` nuevo derivado del ledger; por eso el protocolo exige una distancia mínima de 256 ledgers entre tu `Sequence` y el ledger actual, para que transacciones antiguas no puedan reproducirse.

## Cuándo usarlo

- Cerrar una cuenta de prueba o temporal y recuperar el XRP de la reserva.
- Consolidar varias cuentas en una sola.
- Retirar una cuenta comprometida después de mover fondos (aunque [SetRegularKey](/tx/SetRegularKey) o una lista de firmantes suelen ser mejor opción si quieres conservar la dirección).

## Cómo funciona por dentro

**`AccountDelete::preflight`**: `Destination` no puede ser la propia cuenta (`temDST_IS_SRC`) y, si incluyes `CredentialIDs`, deben tener formato válido (`credentials::checkFields`). Con `CredentialIDs` es necesario que [Credentials](/amendments/Credentials) esté activo.

**`AccountDelete::preclaim`** (contra el ledger):
- El destino debe existir (`tecNO_DST`) y, si tiene `lsfRequireDestTag`, necesitas `DestinationTag` (`tecDST_TAG_NEEDED`).
- Si el destino tiene `lsfDepositAuth`, debe existir un objeto [DepositPreauth](/objects/DepositPreauth) del destino hacia ti; si no, `tecNO_PERMISSION`. Con `CredentialIDs` la comprobación se pospone a `doApply` (`verifyDepositPreauth`) para poder borrar credenciales caducadas. Las pseudo-cuentas (AMM, vault) tienen `lsfDepositAuth` por defecto, así que nunca pueden ser destino.
- **NFTs**: si `MintedNFTokens ≠ BurnedNFTokens` (has emitido NFTs que siguen existiendo) o tienes alguna página de NFTs en propiedad → `tecHAS_OBLIGATIONS`.
- **Sponsor**: si tu cuenta está patrocinada, `Destination` debe ser el patrocinador (`tecNO_SPONSOR_PERMISSION`); si patrocinas objetos o cuentas de otros → `tecHAS_OBLIGATIONS`. En testnet [Sponsor](/amendments/Sponsor) no está activo, así que estos campos no existen.
- **Antigüedad**: `Sequence + 255 > ledger actual` → `tecTOO_SOON`. Misma regla con `FirstNFTokenSequence + MintedNFTokens` para evitar NFTokenIDs duplicados tras recrear la cuenta ([fixNFTokenRemint](/amendments/fixNFTokenRemint)).
- Recorre tu directorio de propietario: cada entrada debe ser de un tipo que `nonObligationDeleter` sepa borrar (`Offer`, `SignerList`, `Ticket`, `DepositPreauth`, `NFTokenOffer`, `DID`, `Oracle`, `Credential`, `Delegate`). Cualquier otro tipo (RippleState, Escrow, PayChannel, Check, MPToken, AMM, Vault...) → `tecHAS_OBLIGATIONS`. Más de 1000 entradas borrables (`kMaxDeletableDirEntries`) → `tefTOO_BIG`.

**`AccountDelete::doApply`**:
1. Con `CredentialIDs`, verifica ahora la preautorización o las credenciales.
2. `cleanupOnAccountDelete` recorre el directorio y llama al borrador de cada objeto (`offerDelete`, `SignerListSet::removeFromLedger`, `Transactor::ticketDelete`, etc.).
3. Transfiere el `Balance` restante al destino y lo registra como `delivered_amount` (`ctx_.deliver`).
4. Si tu cuenta tenía patrocinador, decrementa su `SponsoringAccountCount`.
5. Borra el directorio de propietario (si no está vacío, `tecHAS_OBLIGATIONS`), limpia `lsfPasswordSpent` en el destino si recibe XRP, y elimina tu `AccountRoot`.

También bloquean los objetos creados por otros que apuntan a ti: `CheckCreate` inserta el cheque en el directorio del destinatario (`DestinationNode`) y, desde [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir), lo mismo hace `PaymentChannelCreate` con el canal. Un cheque o canal recibido impide borrar tu cuenta hasta que se cobre, cancele o cierre.

## Campos clave

- **Destination** — cuenta que recibe el XRP restante. Debe existir ya; `AccountDelete` no crea cuentas.
- **DestinationTag** — obligatorio si el destino tiene `lsfRequireDestTag`.
- **CredentialIDs** — credenciales aceptadas que permiten superar el `DepositAuth` del destino sin preautorización explícita.
- **Fee** — debe ser al menos la reserva incremental (200000 drops en testnet), no los 10 drops habituales. Un `Fee` insuficiente se rechaza como `telINSUF_FEE_P`.

## Errores habituales

- **tecHAS_OBLIGATIONS** — tienes trust lines, escrows, canales, cheques, NFTs, MPTokens u otros objetos no borrables. Consulta `account_objects` y elimínalos uno a uno (`TrustSet` con límite 0 y saldo 0, `EscrowCancel`, `CheckCancel`, `NFTokenBurn`...).
- **tecTOO_SOON** — han pasado menos de 256 ledgers (unos 15 minutos) desde tu último `Sequence`. Espera.
- **tecNO_DST** — el destino no existe.
- **tecNO_PERMISSION** — el destino tiene `DepositAuth` y no te ha preautorizado.
- **tecDST_TAG_NEEDED** — el destino exige `DestinationTag`.
- **telINSUF_FEE_P** — `Fee` por debajo de la reserva incremental.
- **temDST_IS_SRC** — has puesto tu propia cuenta como destino.
- **tefTOO_BIG** — más de 1000 objetos borrables; cancélalos antes.

## Ejemplo

```json
{
  "TransactionType": "AccountDelete",
  "Account": "rXXXX_TU_CUENTA",
  "Destination": "rYYYY_OTRA_CUENTA",
  "Fee": "200000"
}
```

## Pruébalo en testnet

1. Usa una cuenta desechable (crea una nueva con el faucet), no tu cuenta principal del builder.
2. Comprueba con `account_objects` que no tiene nada, o que solo tiene objetos borrables (por ejemplo, crea una orden con [OfferCreate](/tx/OfferCreate) para ver cómo se elimina sola).
3. Consulta `account_info`: anota `Sequence` y compáralo con el ledger validado. Si la diferencia es menor de 256, espera; una cuenta recién creada por el faucet necesita unos 15 minutos.
4. Envía `AccountDelete` con `Fee: "200000"` y la otra cuenta como `Destination`.
5. Consulta `account_info` de la cuenta borrada: responde `actNotFound`. En la cuenta destino el `Balance` ha subido en el saldo restante, y en los metadatos verás `DeletedNode` para `AccountRoot`, `DirectoryNode` y la `Offer`.
6. Para ver `tecHAS_OBLIGATIONS`, crea antes una trust line con [TrustSet](/tx/TrustSet) y repite.

## Relacionado

- [AccountSet](/tx/AccountSet)
- [SetRegularKey](/tx/SetRegularKey)
- [DepositPreauth](/tx/DepositPreauth)
- [OfferCancel](/tx/OfferCancel)
- [AccountRoot](/objects/AccountRoot)
- [DirectoryNode](/objects/DirectoryNode)
- [DeletableAccounts](/amendments/DeletableAccounts)
- [fixNFTokenRemint](/amendments/fixNFTokenRemint)
