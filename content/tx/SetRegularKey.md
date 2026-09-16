---
title: SetRegularKey
summary: Assigns, changes, or removes your account's regular key: a second key pair you can sign with without exposing the master key.
category: cuenta
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/setregularkey
level: basic
---

## What it does

Every XRPL account is born with a **master key**, derived from the seed that created it. `SetRegularKey` adds a `RegularKey` field to the [AccountRoot](/objects/AccountRoot) with the address derived from another key pair. From then on, the account's transactions can be signed with either the master key **or** the regular key.

The idea is a daily-use key versus the key to the vault: you keep the master key offline and operate with the regular one. If the regular key leaks, you replace it with another `SetRegularKey` signed with the master key. And if you also disable the master key with [AccountSet](/tx/AccountSet) (`asfDisableMaster`), a leak of the master key won't compromise the account either, as long as the regular key stays safe.

The transaction only modifies the `AccountRoot`; it doesn't create objects or consume reserve.

## When to use it

- Rotating keys periodically without changing your address.
- Signing from a server or a less secure device with a key you can revoke.
- Preparing the move to `asfDisableMaster` so the master key can be kept in cold storage.
- Regaining control after a compromise of the regular key.

## How it works inside

**`SetRegularKey::calculateBaseFee`** has a peculiarity: if the transaction is signed with the account's **master key** and the `AccountRoot` doesn't have the `lsfPasswordSpent` flag, the base fee is **0 drops**. It's a one-time safeguard: an account whose regular key has been compromised can set a new one even if the attacker has drained its balance. In any other case, the normal fee is charged.

**`SetRegularKey::preflight`** only checks one thing: `RegularKey` can't be the account's own address (`temBAD_REGKEY`). In other words, you can't register the master key as the regular key.

There's no transaction-specific `preclaim`; the generic `Transactor` checks apply (existing account, sequence, signature...).

**`SetRegularKey::doApply`**:

1. If the fee charged was below the minimum (that is, the free fee was used), it sets `lsfPasswordSpent` on the `AccountRoot`. The flag is cleared again when the account receives a direct XRP payment ([Payment](/tx/Payment) clears it in `doApply`).
2. If the transaction includes `RegularKey`, it writes it to the `AccountRoot`.
3. If it doesn't include one, it **removes** the regular key. But if the master key is disabled (`lsfDisableMaster`) and there's no [SignerList](/objects/SignerList), it's rejected with `tecNO_ALTERNATIVE_KEY`: you can't leave the account with no way to sign at all.

Note that the ledger **doesn't verify** that `RegularKey` corresponds to a key you actually possess: it's just some address. If you make a mistake deriving it, that key won't work for anything, and you'll have to fix it with the master key.

The transaction isn't delegable.

## Key fields

- **RegularKey** — the address (`r...`) derived from the public key of the new key pair. It's obtained like any address: `calcAccountID(publicKey)`. Omit it to remove the current regular key.

## Common errors

- **temBAD_REGKEY** — `RegularKey` is the same as `Account`. Derive a new key.
- **tecNO_ALTERNATIVE_KEY** — you're trying to remove the regular key while the master key is disabled and there's no signer list. Re-enable the master key (`ClearFlag: 4`) or create a [SignerListSet](/tx/SignerListSet) first.
- **tefMASTER_DISABLED** — (generic signature check) you're signing with the master key while it's disabled.
- **tefBAD_AUTH** — you're signing with a key that's neither the master key nor the current regular key.

## Example

```json
{
  "TransactionType": "SetRegularKey",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "RegularKey": "rYYYY_OTHER_ACCOUNT"
}
```

The example uses another demo account's address as the regular key. In real use you'd generate a new key pair and put its address here.

## Try it on testnet

1. Submit the example. Query `account_info`: `account_data` now shows `RegularKey: rYYYY_OTHER_ACCOUNT`.
2. Sign any simple transaction (for example an empty [AccountSet](/tx/AccountSet)) with `rYYYY_OTHER_ACCOUNT`'s seed but `Account: rXXXX_YOUR_ACCOUNT`: it's accepted, because that key is now your account's regular key.
3. Submit `SetRegularKey` **without** `RegularKey`, signed with the master key: the field disappears from `account_info`.
4. To see `tecNO_ALTERNATIVE_KEY`: set the regular key again, disable the master key with `AccountSet SetFlag: 4` (signed with the master key), then try to remove the regular key by signing with itself.
5. Watch the fee: if you submit it signed with the master key and the account never used the free fee, the builder may set `Fee: "0"` and the network will accept it; in the metadata you'll see `lsfPasswordSpent` get set.

## Related

- [AccountSet](/tx/AccountSet) — `asfDisableMaster` (4) to disable the master key once the regular key is configured.
- [SignerListSet](/tx/SignerListSet) — multisig alternative; also counts as an "alternative key."
- [Payment](/tx/Payment) — an incoming XRP payment rearms the free fee (`lsfPasswordSpent`).
- Objects: [AccountRoot](/objects/AccountRoot), [SignerList](/objects/SignerList).
- Amendments: [fixMasterKeyAsRegularKey](/amendments/fixMasterKeyAsRegularKey).
