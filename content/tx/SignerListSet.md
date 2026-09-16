---
title: SignerListSet
summary: Creates, replaces or removes an account's signer list (multi-signing), with weights and a quorum.
category: multifirma
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/signerlistset
amendment: MultiSign
level: intermediate
---

## What it does

`SignerListSet` attaches a [SignerList](/objects/SignerList) object to your account: a set of between 1 and 32 signer accounts, each with a weight (`SignerWeight`), and a threshold (`SignerQuorum`). From that point on, any transaction from your account can be signed by a subset of those accounts whose combined weight reaches the quorum, instead of by your master or regular key.

Think of a safe with several keys: you define who holds a key, how much each one "counts for", and how many are needed to open it. A quorum of 2 with three signers of weight 1 is a classic "2 of 3"; you can also give a partner weight 2 so their signature counts as two.

An account only has one list (`SignerListID` is always 0 in the current code). Sending `SignerListSet` again replaces the entire list; sending it with `SignerQuorum: 0` and no `SignerEntries` deletes it.

## When to use it

- Shared treasuries where no single person should be able to move funds alone.
- Token issuer accounts where you disable the master key and hand control to a committee.
- Recovery: keeping a backup signer list in case you lose the master key.
- Automation with "phantom" signers: the signer accounts don't need to exist on the ledger.

## How it works inside

`SignerListSet::determineOperation` decides what you want to do: if `SignerQuorum` is nonzero and there are `SignerEntries`, it's a `Set` (create or replace); if the quorum is 0 and there are no entries, it's a `Destroy`. Any other combination (quorum 0 with entries, or a positive quorum with no entries) is `Operation::Unknown` and `preflight` rejects it with `temMALFORMED`. The entries are sorted by account before continuing.

For a `Set`, `SignerListSet::validateQuorumAndSignerEntries` checks: between `kMinMultiSigners` (1) and `kMaxMultiSigners` (32) entries (`temMALFORMED`); no duplicate accounts (`temBAD_SIGNER`); each weight greater than 0 (`temBAD_WEIGHT`); no signer is the account itself (`temBAD_SIGNER`); and the quorum is positive and reachable, i.e. less than or equal to the sum of all weights (`temBAD_QUORUM`). A code comment makes it explicit: it does not verify that the signer accounts exist; "phantom accounts" are allowed.

`SignerListSet::getFlagsMask` only accepts universal flags when [fixInvalidTxFlags](/amendments/fixInvalidTxFlags) is active (it is on testnet).

There's no specific `preclaim`. In `doApply`, `SignerListSet::replaceSignerList` first removes the old list if it exists (freeing its reserve before checking the new one), then calls `checkReserve` with `ownerCountDelta = 1` against the balance before the fee is paid (`tecINSUFFICIENT_RESERVE` if it's not enough), creates the `SignerList` object with the `lsfOneOwnerCount` flag, inserts it into the account's directory (`tecDIR_FULL` if it doesn't fit) and increases `OwnerCount` by 1. That "1 reserve unit, regardless of list size" is the behavior introduced by the [MultiSignReserve](/amendments/MultiSignReserve) amendment; when deleting an old list without `lsfOneOwnerCount`, `removeSignersFromLedger` applies the previous formula (2 + number of signers) to deduct correctly. If [fixIncludeKeyletFields](/amendments/fixIncludeKeyletFields) is active, `writeSignersToSLE` also writes the `Owner` field on the object.

`SignerListSet::destroySignerList` has an important safeguard: if the account has `lsfDisableMaster` and no `RegularKey`, it returns `tecNO_ALTERNATIVE_KEY`. Without that rule you would delete the only way of signing and the account would be locked forever.

`SignerListSet` is not delegable (`delegable: false` in protocol.json): it cannot be authorized via [DelegateSet](/tx/DelegateSet).

## Key fields

- **SignerQuorum** — minimum sum of weights that must sign. 0 means delete the list (and then there can be no `SignerEntries`).
- **SignerEntries** — array of 1 to 32 `SignerEntry` objects with `Account` and `SignerWeight` (1-65535). Optionally `WalletLocator` (a freely-used 256-bit hash), enabled by [ExpandedSignerList](/amendments/ExpandedSignerList). The accounts don't need to exist.
- **Fee when using the list** — not a field of this transaction, but remember that a multi-signed transaction pays base fee × (number of signatures + 1).

## Common errors

- **temMALFORMED** — invalid combination of quorum and entries, or more than 32 (or zero) entries.
- **temBAD_QUORUM** — the quorum is 0 with entries, or exceeds the sum of weights: it could never be reached.
- **temBAD_SIGNER** — a repeated signer, or you've included yourself in your own list.
- **temBAD_WEIGHT** — some `SignerWeight` is 0.
- **tecINSUFFICIENT_RESERVE** — you don't cover one more unit of owner reserve (0.2 XRP on testnet).
- **tecNO_ALTERNATIVE_KEY** — you're trying to delete the list with the master key disabled and no regular key.

## Example

```json
{
  "TransactionType": "SignerListSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "SignerQuorum": 2,
  "SignerEntries": [
    { "SignerEntry": { "Account": "rYYYY_OTHER_ACCOUNT", "SignerWeight": 1 } },
    { "SignerEntry": { "Account": "rZZZZ_EMISOR", "SignerWeight": 1 } }
  ]
}
```

## Try it on testnet

1. Send the example from the builder: two signers of weight 1 and quorum 2 (both must sign).
2. Query `account_objects` with `type: "signer_list"`: you'll see the `SignerList` object with `Flags: 65536` (`lsfOneOwnerCount`), `SignerQuorum: 2` and the entries sorted by account.
3. Check `account_info`: `OwnerCount` has increased by exactly 1, regardless of the number of signers.
4. Try variants that should fail: a `SignerQuorum: 3` (sum of weights 2) returns `temBAD_QUORUM`; including your own account returns `temBAD_SIGNER`.
5. To delete the list, send `SignerQuorum: 0` with no `SignerEntries` and check that the object disappears and `OwnerCount` decreases by 1.
6. If you also have `asfDisableMaster` enabled via [AccountSet](/tx/AccountSet) and no regular key, the deletion will respond with `tecNO_ALTERNATIVE_KEY`.

## Related

- [SignerList](/objects/SignerList) — the object it manages.
- [TicketCreate](/tx/TicketCreate) — tickets to avoid blocking in-flight multi-signed transactions.
- [SetRegularKey](/tx/SetRegularKey) and [AccountSet](/tx/AccountSet) (`asfDisableMaster`) — the other two ways to control who can sign.
- [MultiSignReserve](/amendments/MultiSignReserve), [ExpandedSignerList](/amendments/ExpandedSignerList), [fixIncludeKeyletFields](/amendments/fixIncludeKeyletFields).
- [Batch](/tx/Batch) — lets you sign a batch with `BatchSigners`, including multi-sign signers.
