---
title: AccountRoot
summary: Es la cuenta en sí: su saldo en XRP, su secuencia, sus ajustes y el contador de objetos que posee.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/accountroot
createdBy: Payment
modifiedBy: AccountSet, SetRegularKey, AccountDelete, Payment
reserve: 0
---

## Qué representa

Un `AccountRoot` es la ficha de una cuenta del XRPL. Cada dirección `r...` que existe en el ledger tiene exactamente un objeto de este tipo, y casi todas las transacciones lo tocan: cobran la comisión de `Balance`, incrementan `Sequence` y actualizan `PreviousTxnID`. Si buscas "la cuenta" en el ledger, es esto.

Piensa en él como la cabecera de una carpeta. El resto de lo que la cuenta posee ([Offer](/objects/Offer), [Escrow](/objects/Escrow), [RippleState](/objects/RippleState), etc.) cuelga de su directorio de propietario, un [DirectoryNode](/objects/DirectoryNode) cuya clave se deriva de la dirección.

## Ciclo de vida

- **Creación**: no hay una transacción "crear cuenta". Se crea cuando un [Payment](/tx/Payment) en XRP entrega a una dirección que no existe una cantidad igual o superior a la reserva base (1 XRP en testnet). `Payment::doApply` fabrica el `AccountRoot` con `Sequence` igual al índice del ledger en que nace. También pueden crearla [CheckCash](/tx/CheckCash) al cobrar XRP, [EscrowFinish](/tx/EscrowFinish) y [PaymentChannelClaim](/tx/PaymentChannelClaim) hacia un destino borrado, y [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit) vía puente.
- **Modificación**: [AccountSet](/tx/AccountSet) cambia flags, `Domain`, `EmailHash`, `TransferRate`, `TickSize`, `NFTokenMinter`; [SetRegularKey](/tx/SetRegularKey) fija `RegularKey`; [TicketCreate](/tx/TicketCreate) mueve `TicketCount`; [NFTokenMint](/tx/NFTokenMint) y [NFTokenBurn](/tx/NFTokenBurn) actualizan los contadores de NFT. Cualquier transacción que cree o borre un objeto propio ajusta `OwnerCount`.
- **Borrado**: solo con [AccountDelete](/tx/AccountDelete), y solo si `Sequence + 256` es menor o igual que el ledger actual, `OwnerCount` es 0 (salvo objetos que se borran en cascada) y la cuenta no está vinculada a un AMM, Vault o LoanBroker. El XRP restante menos la comisión va al destino.

## Campos clave

- **Balance** — XRP en drops. Nunca puede bajar de la reserva (`ReserveBase + OwnerCount × ReserveIncrement`) por una transacción que la cuenta emite, salvo la propia comisión.
- **Sequence** — número de la próxima transacción que la cuenta puede enviar. Empieza en el índice del ledger de creación, no en 1.
- **OwnerCount** — objetos que cuentan para la reserva. Es el multiplicador de la reserva incremental (0,2 XRP en testnet).
- **AccountTxnID** — hash de la última transacción; solo existe si activaste `asfAccountTxnID` para encadenar envíos.
- **RegularKey** — clave alternativa para firmar. Con `lsfDisableMaster` es la única forma de firmar sin [SignerList](/objects/SignerList).
- **TransferRate** — comisión al transferir tokens emitidos, en milmillonésimas (1 000 000 000 = 0 %; 1 020 000 000 = 2 %).
- **TickSize** — decimales significativos para las ofertas sobre tokens de este emisor (3-15).
- **MintedNFTokens / BurnedNFTokens / FirstNFTokenSequence** — contadores del emisor de NFT; `NFTokenMinter` autoriza a otra cuenta a acuñar en su nombre.
- **SponsoredOwnerCount / SponsoringOwnerCount / SponsoringAccountCount** — contabilidad de reservas patrocinadas por [Sponsorship](/objects/Sponsorship). Si la reserva la paga otro, tu `OwnerCount` sube pero también `SponsoredOwnerCount`, y la reserva efectiva descuenta esa parte.
- **AMMID / VaultID / LoanBrokerID** — marcan que la cuenta es una pseudocuenta creada por el protocolo para un [AMM](/objects/AMM), un [Vault](/objects/Vault) o un [LoanBroker](/objects/LoanBroker). Nadie tiene sus claves.

## Flags

- **lsfPasswordSpent** — la única transacción gratuita de la cuenta (histórica) ya se usó.
- **lsfRequireDestTag** — rechaza pagos entrantes sin `DestinationTag`.
- **lsfRequireAuth** — los que quieran tener tokens tuyos necesitan que autorices su línea de confianza.
- **lsfDisallowXRP** — consejo para clientes: no envíes XRP aquí. El protocolo no lo impone.
- **lsfDisableMaster** — la clave maestra ya no firma.
- **lsfNoFreeze** — renuncia irrevocable a congelar líneas de confianza.
- **lsfGlobalFreeze** — todos los tokens que emites quedan congelados.
- **lsfDefaultRipple** — permite rippling por defecto en tus líneas de confianza (imprescindible para emisores).
- **lsfDepositAuth** — solo reciben fondos quienes tengan [DepositPreauth](/objects/DepositPreauth) o credenciales válidas.
- **lsfDisallowIncomingNFTokenOffer / Check / PayChan / Trustline** — rechaza en `preclaim` la creación de esos objetos con la cuenta como destino.
- **lsfAllowTrustLineClawback** — habilita [Clawback](/tx/Clawback); incompatible con `lsfNoFreeze`.
- **lsfAllowTrustLineLocking** — permite escrows de tokens emitidos por esta cuenta ([TokenEscrow](/amendments/TokenEscrow)).

## Cómo consultarlo

`account_info` es la vía normal. Con `ledger_entry` usa `account_root`:

```json
{ "method": "ledger_entry", "params": [{ "account_root": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ledger_index": "validated" }] }
```

La clave es `SHA512Half(0x0061 || AccountID)` (`keylet::account`). Respuesta típica:

```json
{
  "index": "13F1A95D7AAB7108D4C5D3B3B5C3C3E2A0E4F1F9B8D2C3A4B5C6D7E8F9A0B1C2",
  "node": {
    "LedgerEntryType": "AccountRoot",
    "Account": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
    "Balance": "99997990",
    "Flags": 8388608,
    "OwnerCount": 2,
    "Sequence": 20790112,
    "PreviousTxnID": "5A0E3C0F8C0A4D9B1B0C7F7B4D4F4A2E8E6B3C1D9F0A7B2C4D6E8F0A1B3C5D7E",
    "PreviousTxnLgrSeq": 20800100
  }
}
```

`account_objects` no devuelve el `AccountRoot` (no es un objeto "poseído"), pero sí todo lo que cuelga de él.

## Relacionado

- [Payment](/tx/Payment), [AccountSet](/tx/AccountSet), [SetRegularKey](/tx/SetRegularKey), [AccountDelete](/tx/AccountDelete)
- [DirectoryNode](/objects/DirectoryNode), [SignerList](/objects/SignerList), [FeeSettings](/objects/FeeSettings)
- [DeletableAccounts](/amendments/DeletableAccounts), [DisallowIncoming](/amendments/DisallowIncoming), [Clawback](/amendments/Clawback)
