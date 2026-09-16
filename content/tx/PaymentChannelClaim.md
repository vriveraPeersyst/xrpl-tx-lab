---
title: PaymentChannelClaim
summary: Cobra XRP de un canal de pago presentando un claim firmado, o solicita su cierre (tfClose) o la retirada de su expiración (tfRenew).
category: canales
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelclaim
level: avanzado
---

## Qué hace

`PaymentChannelClaim` es la transacción con la que se liquida un [PayChannel](/objects/PayChannel). Tiene tres usos que se pueden combinar:

1. **Cobrar**: el destinatario presenta `Balance` (el total acumulado autorizado) junto con la `Signature` que el propietario generó off-ledger y la `PublicKey` del canal. El ledger paga la diferencia entre ese `Balance` y lo ya cobrado. El propietario también puede enviar `Balance` sin firma para pagar directamente.
2. **Cerrar** (`tfClose`): el destinatario cierra el canal al instante; el propietario solo puede programar el cierre para dentro de `SettleDelay` segundos.
3. **Renovar** (`tfRenew`): el propietario elimina la `Expiration` que hubiese fijado.

Al cerrarse el canal, el XRP no reclamado vuelve al propietario y el objeto se borra de los directorios de ambas cuentas.

Cualquiera de estas acciones sobre un canal ya expirado lo cierra sin hacer nada más.

## Cuándo usarlo

- El destinatario quiere liquidar lo acumulado en claims sin esperar a que el canal se cierre.
- El propietario quiere pagar directamente por el canal sin generar una firma.
- Cualquiera de los dos quiere terminar la relación: el receptor cerrando en el acto, el propietario iniciando la cuenta atrás.

## Cómo funciona por dentro

**`PaymentChannelClaim::preflight`**:
- `Channel` a cero → `temMALFORMED` (con `fixCleanup3_2_0`, activo).
- `Balance` y `Amount`, si aparecen, deben ser XRP positivos, y `Balance ≤ Amount`; si no, `temBAD_AMOUNT`.
- `tfClose` y `tfRenew` a la vez → `temMALFORMED`.
- Si hay `Signature`, exige `PublicKey` y `Balance`; verifica criptográficamente la firma sobre el mensaje `serializePayChanAuthorization(channelID, Amount o Balance)`. Una firma que no valida devuelve `temBAD_SIGNATURE`. Nótese que aquí se firma el importe `Amount` (si lo das) y se cobra `Balance`; por eso `Balance` no puede superar `Amount`.
- Valida el formato de `CredentialIDs` si se incluyen.

**`PaymentChannelClaim::preclaim`**: con [Credentials](/amendments/Credentials) activo, comprueba que las credenciales indicadas existen, están aceptadas y pertenecen al firmante (`credentials::valid`).

**`PaymentChannelClaim::doApply`**:
1. Busca el canal; si no existe, `tecNO_TARGET`.
2. Si ha expirado por `CancelAfter` o `Expiration`, lo cierra (`closeChannel`) y termina.
3. Si `Account` no es ni el propietario ni el destinatario → `tecNO_PERMISSION`.
4. Si hay `Balance`:
   - El destinatario sin `Signature` recibe `tecNO_PERMISSION`.
   - La `PublicKey` de la transacción debe coincidir con la del canal; si no, `tecNO_PERMISSION` (antes de `fixCleanup3_2_0` eran `temBAD_SIGNATURE`/`temBAD_SIGNER`).
   - `Balance` mayor que los fondos del canal → `tecUNFUNDED_PAYMENT`. `Balance` menor o igual que lo ya cobrado → también `tecUNFUNDED_PAYMENT`: un claim viejo no sirve.
   - El destinatario debe existir (`tecNO_DST`) y aceptar el depósito: `verifyDepositPreauth` aplica [DepositAuth](/amendments/DepositAuth); si el receptor tiene `lsfDepositAuth`, el propietario necesita preautorización o credenciales válidas, salvo que sea el propio receptor quien cobra.
   - Actualiza `Balance` del canal y abona la diferencia al destinatario.
5. `tfRenew`: solo el propietario (`tecNO_PERMISSION` en otro caso); borra `Expiration`.
6. `tfClose`: si lo envía el destinatario, o si el canal está seco (`Balance == Amount`), se cierra de inmediato. Si lo envía el propietario, fija `Expiration = cierre del ledger padre + SettleDelay` (salvo que ya hubiese una anterior). El cierre real ocurre en la siguiente transacción que toque el canal después de esa fecha.

Amendments que influyen: [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) (códigos `tec` en vez de `tem` para fallos de firma en `doApply`), [Credentials](/amendments/Credentials), [DepositAuth](/amendments/DepositAuth), [DepositPreauth](/amendments/DepositPreauth).

## Campos clave

- **Channel** — ID del canal (64 hex).
- **Balance** — total acumulado que se reclama, no el incremento. El ledger abona `Balance − balance_anterior`. Debe ser mayor que lo ya cobrado y no superar `Amount` del canal.
- **Amount** — importe que cubre la firma. Si lo omites, la firma se verifica sobre `Balance`. Permite reutilizar una firma de X para cobrar menos de X.
- **Signature** — firma hex del claim generada off-ledger (`channel_authorize` en un nodo propio, o una librería cliente). No es la firma de la transacción.
- **PublicKey** — debe ser exactamente la `PublicKey` del canal.
- **CredentialIDs** — credenciales para superar el `DepositAuth` del destinatario.

## Flags

- **tfRenew** — elimina `Expiration`. Solo el propietario.
- **tfClose** — cierre inmediato si lo pide el destinatario o el canal está seco; cierre diferido `SettleDelay` segundos si lo pide el propietario.

## Errores habituales

- **tecNO_TARGET** — el `Channel` no existe o ya se cerró.
- **tecNO_PERMISSION** — no eres parte del canal, `PublicKey` no coincide, el destinatario reclama sin `Signature`, o `tfRenew` desde el destinatario.
- **tecUNFUNDED_PAYMENT** — `Balance` supera los fondos del canal o no es mayor que lo ya cobrado.
- **temBAD_SIGNATURE** — la firma no valida contra `PublicKey` y el importe (`Amount` o `Balance`). Suele ser un `Amount` distinto del firmado.
- **temBAD_AMOUNT** — importes no XRP, cero, o `Balance > Amount`.
- **tecNO_DST** — el destinatario borró su cuenta.

## Ejemplo

```json
{
  "TransactionType": "PaymentChannelClaim",
  "Account": "rXXXX_TU_CUENTA",
  "Channel": "C1AE6DDDEEC05CF2978C0BAD6FE302948E9533691DC749DCDD3B9E5992CA6198",
  "Balance": "1000000",
  "Amount": "1000000",
  "Signature": "",
  "PublicKey": "ED9434799226374926EDA3B54B1B461B4ABF7237962EAE18528FEA67595397FA32"
}
```

Es la forma que usa el destinatario: rellena `Signature` con la firma real del claim. Si eres el **propietario** y pagas directamente, elimina `Signature`, `PublicKey` y `Amount`: una `Signature` presente (aunque esté vacía) se verifica en `preflight` y, si no valida, la transacción se rechaza con `temBAD_SIGNATURE`.

## Pruébalo en testnet

1. Abre un canal de 5 XRP con [PaymentChannelCreate](/tx/PaymentChannelCreate) desde tu cuenta y copia el `channel_id`.
2. **Pago directo del propietario**: envía `PaymentChannelClaim` con `Channel` y `Balance: "1000000"`, sin `Signature` ni `PublicKey`. En `account_channels` verás `balance: 1000000` y en `account_info` de la otra cuenta +1 XRP.
3. Reenvía el mismo `Balance`: `tecUNFUNDED_PAYMENT`, porque el claim no aumenta lo ya cobrado.
4. **Cobro por el destinatario**: genera la firma con `channel_authorize` (nodo propio) o una librería, y envía desde la otra cuenta `Balance`, `Amount`, `Signature` y `PublicKey`. Verifica antes con `channel_verify`.
5. **Cierre**: desde la otra cuenta, envía `Flags: 131072` (`tfClose`) sin `Balance`: el canal desaparece de `account_channels` y tu saldo recupera los 4 XRP restantes. Desde tu cuenta, `tfClose` solo añade `expiration` al canal.

## Relacionado

- [PaymentChannelCreate](/tx/PaymentChannelCreate)
- [PaymentChannelFund](/tx/PaymentChannelFund)
- [PayChannel](/objects/PayChannel)
- [DepositPreauth](/tx/DepositPreauth)
- [DepositAuth](/amendments/DepositAuth)
- [Credentials](/amendments/Credentials)
