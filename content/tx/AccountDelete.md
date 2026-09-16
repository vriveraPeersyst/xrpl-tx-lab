---
title: AccountDelete
summary: Deletes your account from the ledger and sends all remaining XRP (including the reserve) to another account; costs an incremental reserve and requires having no pending obligations.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/accountdelete
amendment: DeletableAccounts
level: advanced
---

## What it does

`AccountDelete` removes the [AccountRoot](/objects/AccountRoot) object for your account and transfers to `Destination` all the XRP left after paying the fee, including the base reserve you normally can't spend. It's the only way to recover that reserve. The transaction is designed for "empty" accounts: before deleting it you have to get rid of everything that constitutes an obligation toward third parties (trust lines with a balance, escrows, payment channels, checks, NFTs...). Objects that only affect you (DEX offers, tickets, signer list, preauthorizations, NFT offers, DID, oracles, credentials, delegations) are deleted automatically in the same transaction.

The fee isn't the usual one: `AccountDelete::calculateBaseFee` returns a **full incremental reserve** (0.2 XRP on testnet) instead of 10 drops. This cost discourages creating and deleting accounts in a loop.

A deleted account can be recreated by receiving XRP, but it will start with a new `Sequence` derived from the ledger; that's why the protocol requires a minimum distance of 256 ledgers between your `Sequence` and the current ledger, so old transactions can't be replayed.

## When to use it

- Closing a test or temporary account and recovering the reserve's XRP.
- Consolidating several accounts into one.
- Retiring a compromised account after moving funds (though [SetRegularKey](/tx/SetRegularKey) or a signer list are usually a better option if you want to keep the address).

## How it works inside

**`AccountDelete::preflight`**: `Destination` cannot be the account itself (`temDST_IS_SRC`) and, if you include `CredentialIDs`, they must have a valid format (`credentials::checkFields`). With `CredentialIDs` the [Credentials](/amendments/Credentials) amendment must be active.

**`AccountDelete::preclaim`** (against the ledger):
- The destination must exist (`tecNO_DST`) and, if it has `lsfRequireDestTag`, you need a `DestinationTag` (`tecDST_TAG_NEEDED`).
- If the destination has `lsfDepositAuth`, a [DepositPreauth](/objects/DepositPreauth) object from the destination toward you must exist; otherwise `tecNO_PERMISSION`. With `CredentialIDs` the check is deferred to `doApply` (`verifyDepositPreauth`) so expired credentials can be deleted. Pseudo-accounts (AMM, vault) have `lsfDepositAuth` by default, so they can never be a destination.
- **NFTs**: if `MintedNFTokens ≠ BurnedNFTokens` (you've minted NFTs that still exist) or you own any NFT page → `tecHAS_OBLIGATIONS`.
- **Sponsor**: if your account is sponsored, `Destination` must be the sponsor (`tecNO_SPONSOR_PERMISSION`); if you sponsor objects or accounts belonging to others → `tecHAS_OBLIGATIONS`. On testnet [Sponsor](/amendments/Sponsor) isn't active, so these fields don't exist.
- **Age**: `Sequence + 255 > current ledger` → `tecTOO_SOON`. Same rule with `FirstNFTokenSequence + MintedNFTokens` to avoid duplicate NFTokenIDs after recreating the account ([fixNFTokenRemint](/amendments/fixNFTokenRemint)).
- Walks your owner directory: each entry must be of a type `nonObligationDeleter` knows how to delete (`Offer`, `SignerList`, `Ticket`, `DepositPreauth`, `NFTokenOffer`, `DID`, `Oracle`, `Credential`, `Delegate`). Any other type (RippleState, Escrow, PayChannel, Check, MPToken, AMM, Vault...) → `tecHAS_OBLIGATIONS`. More than 1000 deletable entries (`kMaxDeletableDirEntries`) → `tefTOO_BIG`.

**`AccountDelete::doApply`**:
1. With `CredentialIDs`, it now verifies the preauthorization or the credentials.
2. `cleanupOnAccountDelete` walks the directory and calls the appropriate deleter for each object (`offerDelete`, `SignerListSet::removeFromLedger`, `Transactor::ticketDelete`, etc.).
3. Transfers the remaining `Balance` to the destination and records it as `delivered_amount` (`ctx_.deliver`).
4. If your account had a sponsor, decrements its `SponsoringAccountCount`.
5. Deletes the owner directory (if not empty, `tecHAS_OBLIGATIONS`), clears `lsfPasswordSpent` on the destination if it receives XRP, and removes your `AccountRoot`.

Objects created by others that point at you also block deletion: `CheckCreate` inserts the check into the recipient's directory (`DestinationNode`), and since [fixPayChanRecipientOwnerDir](/amendments/fixPayChanRecipientOwnerDir), `PaymentChannelCreate` does the same with the channel. A received check or channel prevents deleting your account until it's cashed, canceled, or closed.

## Key fields

- **Destination** — account that receives the remaining XRP. It must already exist; `AccountDelete` doesn't create accounts.
- **DestinationTag** — required if the destination has `lsfRequireDestTag`.
- **CredentialIDs** — accepted credentials that let you bypass the destination's `DepositAuth` without an explicit preauthorization.
- **Fee** — must be at least the incremental reserve (200000 drops on testnet), not the usual 10 drops. An insufficient `Fee` is rejected as `telINSUF_FEE_P`.

## Common errors

- **tecHAS_OBLIGATIONS** — you have trust lines, escrows, channels, checks, NFTs, MPTokens, or other non-deletable objects. Check `account_objects` and remove them one by one (`TrustSet` with limit 0 and balance 0, `EscrowCancel`, `CheckCancel`, `NFTokenBurn`...).
- **tecTOO_SOON** — fewer than 256 ledgers (about 15 minutes) have passed since your last `Sequence`. Wait.
- **tecNO_DST** — the destination doesn't exist.
- **tecNO_PERMISSION** — the destination has `DepositAuth` and hasn't preauthorized you.
- **tecDST_TAG_NEEDED** — the destination requires a `DestinationTag`.
- **telINSUF_FEE_P** — `Fee` below the incremental reserve.
- **temDST_IS_SRC** — you set your own account as the destination.
- **tefTOO_BIG** — more than 1000 deletable objects; cancel them first.

## Example

```json
{
  "TransactionType": "AccountDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Destination": "rYYYY_OTHER_ACCOUNT",
  "Fee": "200000"
}
```

## Try it on testnet

1. Use a disposable account (create a new one with the faucet), not your main builder account.
2. Check with `account_objects` that it has nothing, or only deletable objects (for example, create an order with [OfferCreate](/tx/OfferCreate) to see how it gets removed on its own).
3. Query `account_info`: note `Sequence` and compare it with the validated ledger. If the difference is less than 256, wait; an account just created by the faucet needs about 15 minutes.
4. Send `AccountDelete` with `Fee: "200000"` and the other account as `Destination`.
5. Query `account_info` for the deleted account: it responds `actNotFound`. On the destination account, `Balance` has increased by the remaining amount, and in the metadata you'll see `DeletedNode` entries for `AccountRoot`, `DirectoryNode`, and the `Offer`.
6. To see `tecHAS_OBLIGATIONS`, create a trust line first with [TrustSet](/tx/TrustSet) and try again.

## Related

- [AccountSet](/tx/AccountSet)
- [SetRegularKey](/tx/SetRegularKey)
- [DepositPreauth](/tx/DepositPreauth)
- [OfferCancel](/tx/OfferCancel)
- [AccountRoot](/objects/AccountRoot)
- [DirectoryNode](/objects/DirectoryNode)
- [DeletableAccounts](/amendments/DeletableAccounts)
- [fixNFTokenRemint](/amendments/fixNFTokenRemint)
