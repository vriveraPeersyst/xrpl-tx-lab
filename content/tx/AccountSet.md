---
title: AccountSet
summary: Modifies your account's settings: flags (asf*), domain, message key, transfer fee, and other AccountRoot fields.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/accountset
level: basic
---

## What it does

`AccountSet` is an account's settings panel. It doesn't move funds: it changes fields and flags on the [AccountRoot](/objects/AccountRoot) object that represents your account on the ledger. With it you define how your account behaves toward others (do I require a `DestinationTag`? do I accept incoming trust lines? do I block deposits?) and how it behaves as a token issuer (`DefaultRipple`, `RequireAuth`, `TransferRate`, global freeze, clawback).

Account flags are turned on one at a time with `SetFlag` and turned off with `ClearFlag`, using `asf*` values (for example `8` = `asfDefaultRipple`). Fields like `Domain` or `EmailHash` are set with their value and cleared by sending an empty or zero value.

## When to use it

- Exchanges: requiring `DestinationTag` (`asfRequireDest`) so deposits aren't lost.
- Token issuers: enabling `asfDefaultRipple` before issuing, setting `TransferRate`, requiring authorization (`asfRequireAuth`), or preparing clawback (`asfAllowTrustLineClawback`).
- Security: disabling the master key (`asfDisableMaster`) after setting up a regular key or a signer list.
- Privacy and control: `asfDepositAuth`, `asfDisallowIncomingTrustline`, `asfDisallowIncomingCheck`, `asfDisallowIncomingPayChan`, `asfDisallowIncomingNFTokenOffer`.
- Publishing the account's domain (`Domain`) for verification with `xrp-ledger.toml`.

## How it works inside

**`AccountSet::preflight`** rejects `SetFlag == ClearFlag` (`temINVALID_FLAG`) and contradictory combinations of the legacy `tf*` flags with their `asf*` equivalents (RequireAuth, RequireDest, DisallowXRP). `TransferRate` must be 0 or between 1,000,000,000 and 2,000,000,000 (`temBAD_TRANSFER_RATE`, i.e. 0% to 100% fee). `TickSize` must be 0 or between 3 and 15 (`temBAD_TICK_SIZE`). `MessageKey` must be a valid public key (`telBAD_PUBLIC_KEY`) and `Domain` cannot exceed 256 bytes (`telBAD_DOMAIN`). `asfAuthorizedNFTokenMinter` requires `NFTokenMinter` when enabling it and forbids it when disabling it (`temMALFORMED`).

**`AccountSet::preclaim`** queries the owner directory:

- Enabling `asfRequireAuth` is only possible if the account **has no objects at all** (empty directory); otherwise `tecOWNERS`. This way nobody can change the rules with trust lines already open.
- Enabling `asfAllowTrustLineClawback` also requires an empty directory (`tecOWNERS`) and that `lsfNoFreeze` isn't set (`tecNO_PERMISSION`).
- Enabling `asfNoFreeze` is forbidden if you already have clawback (`tecNO_PERMISSION`).

**`AccountSet::doApply`** applies the changes to the `AccountRoot`:

- `asfDisableMaster` requires that the transaction be **signed with the master key** (`tecNEED_MASTER_KEY`) and that a `RegularKey` or a [SignerList](/objects/SignerList) exist (`tecNO_ALTERNATIVE_KEY`); otherwise you'd be left with no way to sign.
- `asfNoFreeze` also requires signing with the master key (unless it's already disabled). It's irreversible: there's no branch that removes it.
- `asfGlobalFreeze` can be enabled by anyone, but **you can't remove it if you have `NoFreeze`**: the promise not to freeze includes not using global freeze as a weapon.
- `asfAllowTrustLineClawback` can only be enabled; the code has no branch to disable it.
- `asfAccountTxnID` adds/removes the `AccountTxnID` field from the `AccountRoot`.
- `asfAllowTrustLineLocking` (for [TokenEscrow](/amendments/TokenEscrow), active on testnet) allows escrows of your tokens.
- Fields: `EmailHash`, `WalletLocator`, `MessageKey`, `Domain` are cleared if you send `0`/empty. `TransferRate` 0 or 1,000,000,000 removes the field (no fee). `TickSize` 0 or 15 removes it.

The transaction **is not delegable** (`delegable: false` in protocol.json): only the account holder itself, its regular key, or its signers can send it.

## Key fields

- **SetFlag / ClearFlag** — a single `asf*` value per transaction. Don't confuse it with `Flags` (the legacy `tf*` ones, which only cover RequireDest, RequireAuth, and DisallowXRP).
- **TransferRate** — fee you charge when two third parties transfer your token: `1020000000` = 2%. Only affects IOU tokens you issue.
- **TickSize** — significant decimals for offers involving your token (3-15).
- **Domain** — domain in hex, lowercase by convention (`6578616d706c652e636f6d` = `example.com`).
- **MessageKey** — public key for encrypting messages off the ledger.
- **NFTokenMinter** — account authorized to mint NFTs on your behalf (together with `asfAuthorizedNFTokenMinter`, value 10).
- **EmailHash** — MD5 of the email, historically used for Gravatar avatars.

## Flags

Legacy transaction flags (`Flags`):

- **tfRequireDestTag / tfOptionalDestTag** — same as `SetFlag: 1` / `ClearFlag: 1`.
- **tfRequireAuth / tfOptionalAuth** — same as `SetFlag: 2` / `ClearFlag: 2`.
- **tfDisallowXRP / tfAllowXRP** — same as `SetFlag: 3` / `ClearFlag: 3`. Note: `lsfDisallowXRP` is only a recommendation for clients; the ledger doesn't enforce it.

Most commonly used `asf*` values in `SetFlag`/`ClearFlag`: 1 RequireDest, 2 RequireAuth, 3 DisallowXRP, 4 DisableMaster, 5 AccountTxnID, 6 NoFreeze, 7 GlobalFreeze, 8 DefaultRipple, 9 DepositAuth, 10 AuthorizedNFTokenMinter, 12-15 DisallowIncoming (NFTokenOffer, Check, PayChan, Trustline), 16 AllowTrustLineClawback, 17 AllowTrustLineLocking.

## Common errors

- **tecOWNERS** — you're trying `asfRequireAuth` or `asfAllowTrustLineClawback` with objects already created. Do it on a freshly activated account.
- **tecNEED_MASTER_KEY** — `asfDisableMaster` or `asfNoFreeze` signed with a regular key or multisign. Sign with the master key.
- **tecNO_ALTERNATIVE_KEY** — you want to disable the master key without having a regular key or a signer list.
- **tecNO_PERMISSION** — you're combining `NoFreeze` and clawback.
- **temINVALID_FLAG** — `SetFlag` and `ClearFlag` are the same, or a `tf*` contradicts the `asf*`.
- **temBAD_TRANSFER_RATE** — `TransferRate` outside [1e9, 2e9] (and not 0).
- **telBAD_DOMAIN** — `Domain` longer than 256 bytes.

## Example

```json
{
  "TransactionType": "AccountSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "SetFlag": 8,
  "Domain": "6578616D706C652E636F6D"
}
```

Enables `asfDefaultRipple` and publishes the domain `example.com`.

## Try it on testnet

1. Send the example. Query `account_info`: in `account_data` you'll see `Domain`, and in `account_flags`, `defaultRipple: true`.
2. Try `SetFlag: 1` and then ask the other account to send you a [Payment](/tx/Payment) without a `DestinationTag`: it will get `tecDST_TAG_NEEDED`. Revert with `ClearFlag: 1`.
3. Try `SetFlag: 4` (`asfDisableMaster`) without having set up a regular key: `tecNO_ALTERNATIVE_KEY`. Set one up with [SetRegularKey](/tx/SetRegularKey) and try again: now it succeeds and the account no longer accepts master-key signatures.
4. If your account has any trust line, send `SetFlag: 2`: you'll see `tecOWNERS`.
5. Clear the domain by sending `"Domain": ""` and check that the field disappears from `account_info`.

## Related

- [SetRegularKey](/tx/SetRegularKey) and [SignerListSet](/tx/SignerListSet) — requirements for `asfDisableMaster`.
- [DepositPreauth](/tx/DepositPreauth) — whitelist when you enable `asfDepositAuth`.
- [TrustSet](/tx/TrustSet) — `asfRequireAuth` and `asfDefaultRipple` affect how trust lines are created.
- [Clawback](/tx/Clawback) — needs `asfAllowTrustLineClawback`.
- [NFTokenMint](/tx/NFTokenMint) — uses `NFTokenMinter`.
- Objects: [AccountRoot](/objects/AccountRoot).
- Amendments: [Clawback](/amendments/Clawback), [DisallowIncoming](/amendments/DisallowIncoming), [DepositAuth](/amendments/DepositAuth), [TokenEscrow](/amendments/TokenEscrow), [TickSize](/amendments/TickSize).
