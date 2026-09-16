---
title: AccountRoot
summary: This is the account itself: its XRP balance, its sequence, its settings, and the count of objects it owns.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/accountroot
createdBy: Payment
modifiedBy: AccountSet, SetRegularKey, AccountDelete, Payment
reserve: 0
---

## What it represents

An `AccountRoot` is an XRPL account's record. Every `r...` address that exists in the ledger has exactly one object of this type, and almost every transaction touches it: it charges the fee from `Balance`, increments `Sequence`, and updates `PreviousTxnID`. If you're looking for "the account" in the ledger, this is it.

Think of it as the header of a folder. Everything else the account owns ([Offer](/objects/Offer), [Escrow](/objects/Escrow), [RippleState](/objects/RippleState), etc.) hangs off its owner directory, a [DirectoryNode](/objects/DirectoryNode) whose key is derived from the address.

## Lifecycle

- **Creation**: there is no "create account" transaction. It is created when a [Payment](/tx/Payment) in XRP delivers to a nonexistent address an amount equal to or greater than the base reserve (1 XRP on testnet). `Payment::doApply` builds the `AccountRoot` with `Sequence` equal to the index of the ledger in which it is born. It can also be created by [CheckCash](/tx/CheckCash) when cashing XRP, [EscrowFinish](/tx/EscrowFinish) and [PaymentChannelClaim](/tx/PaymentChannelClaim) toward a deleted destination, and [XChainAccountCreateCommit](/tx/XChainAccountCreateCommit) via a bridge.
- **Modification**: [AccountSet](/tx/AccountSet) changes flags, `Domain`, `EmailHash`, `TransferRate`, `TickSize`, `NFTokenMinter`; [SetRegularKey](/tx/SetRegularKey) sets `RegularKey`; [TicketCreate](/tx/TicketCreate) moves `TicketCount`; [NFTokenMint](/tx/NFTokenMint) and [NFTokenBurn](/tx/NFTokenBurn) update the NFT counters. Any transaction that creates or deletes an owned object adjusts `OwnerCount`.
- **Deletion**: only with [AccountDelete](/tx/AccountDelete), and only if `Sequence + 256` is less than or equal to the current ledger, `OwnerCount` is 0 (except for objects that are deleted in cascade), and the account is not linked to an AMM, Vault, or LoanBroker. The remaining XRP minus the fee goes to the destination.

## Key fields

- **Balance** — XRP in drops. It can never drop below the reserve (`ReserveBase + OwnerCount × ReserveIncrement`) due to a transaction the account sends, except for the fee itself.
- **Sequence** — the number of the next transaction the account can send. It starts at the ledger index of creation, not at 1.
- **OwnerCount** — objects that count toward the reserve. It is the multiplier for the incremental reserve (0.2 XRP on testnet).
- **AccountTxnID** — hash of the last transaction; it only exists if you enabled `asfAccountTxnID` to chain submissions.
- **RegularKey** — alternate signing key. With `lsfDisableMaster`, it's the only way to sign without a [SignerList](/objects/SignerList).
- **TransferRate** — fee charged when transferring issued tokens, in billionths (1,000,000,000 = 0%; 1,020,000,000 = 2%).
- **TickSize** — significant decimal places for offers on this issuer's tokens (3-15).
- **MintedNFTokens / BurnedNFTokens / FirstNFTokenSequence** — counters for the NFT issuer; `NFTokenMinter` authorizes another account to mint on its behalf.
- **SponsoredOwnerCount / SponsoringOwnerCount / SponsoringAccountCount** — accounting for reserves sponsored via [Sponsorship](/objects/Sponsorship). If someone else pays the reserve, your `OwnerCount` goes up but so does `SponsoredOwnerCount`, and the effective reserve deducts that portion.
- **AMMID / VaultID / LoanBrokerID** — mark that the account is a pseudo-account created by the protocol for an [AMM](/objects/AMM), a [Vault](/objects/Vault), or a [LoanBroker](/objects/LoanBroker). No one holds its keys.

## Flags

- **lsfPasswordSpent** — the account's single free transaction (historical) has already been used.
- **lsfRequireDestTag** — rejects incoming payments without a `DestinationTag`.
- **lsfRequireAuth** — anyone who wants to hold your tokens needs you to authorize their trust line.
- **lsfDisallowXRP** — advisory for clients: don't send XRP here. The protocol does not enforce it.
- **lsfDisableMaster** — the master key no longer signs.
- **lsfNoFreeze** — an irrevocable renunciation of the ability to freeze trust lines.
- **lsfGlobalFreeze** — all tokens you issue are frozen.
- **lsfDefaultRipple** — enables rippling by default on your trust lines (essential for issuers).
- **lsfDepositAuth** — only accounts with [DepositPreauth](/objects/DepositPreauth) or valid credentials can receive funds.
- **lsfDisallowIncomingNFTokenOffer / Check / PayChan / Trustline** — rejects, at `preclaim`, the creation of those objects with the account as destination.
- **lsfAllowTrustLineClawback** — enables [Clawback](/tx/Clawback); incompatible with `lsfNoFreeze`.
- **lsfAllowTrustLineLocking** — allows escrows of tokens issued by this account ([TokenEscrow](/amendments/TokenEscrow)).

## How to query it

`account_info` is the normal way. With `ledger_entry`, use `account_root`:

```json
{ "method": "ledger_entry", "params": [{ "account_root": "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe", "ledger_index": "validated" }] }
```

The key is `SHA512Half(0x0061 || AccountID)` (`keylet::account`). Typical response:

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

`account_objects` does not return the `AccountRoot` itself (it is not an "owned" object), but it does return everything that hangs off it.

## Related

- [Payment](/tx/Payment), [AccountSet](/tx/AccountSet), [SetRegularKey](/tx/SetRegularKey), [AccountDelete](/tx/AccountDelete)
- [DirectoryNode](/objects/DirectoryNode), [SignerList](/objects/SignerList), [FeeSettings](/objects/FeeSettings)
- [DeletableAccounts](/amendments/DeletableAccounts), [DisallowIncoming](/amendments/DisallowIncoming), [Clawback](/amendments/Clawback)
