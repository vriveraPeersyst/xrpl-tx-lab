---
title: SignerList
summary: The list of authorized signers and the quorum needed to operate an account in multi-signing mode.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/signerlist
createdBy: SignerListSet
modifiedBy: SignerListSet
reserve: 1
---

## What it represents

A `SignerList` replaces (or complements) signing with an account's master key or regular key with an "m of n" scheme: up to 32 possible signers, each with a `SignerWeight`, and a minimum `SignerQuorum` that must be reached by summing weights for a `multisign` transaction to be valid. The account can still sign with its normal key unless it also activates `lsfDisableMaster` on its `AccountRoot`, in which case the `SignerList` (or a regular key) is the only way.

Each account can only have one `SignerList` at a time: setting a new one completely replaces the previous one, it does not add to it.

## Lifecycle

- **Creation**: [SignerListSet](/tx/SignerListSet) with `SignerQuorum` greater than zero and 1 to 32 `SignerEntries`. Each signer can be a regular account or (with [ExpandedSignerList](/amendments/ExpandedSignerList)) carry an associated `WalletLocator`.
- **Replacement**: the same [SignerListSet](/tx/SignerListSet) on an account that already has a list replaces `SignerEntries` and `SignerQuorum` entirely.
- **Deletion**: [SignerListSet](/tx/SignerListSet) with `SignerQuorum: 0` and no `SignerEntries`, which removes the list and returns the reserve.

## Key fields

- **SignerQuorum** — minimum sum of weights required for a multi-signed transaction to be valid.
- **SignerEntries** — up to 32 entries, each with `Account` (signer) and `SignerWeight` (its weight in the sum).
- **SignerListID** — always 0 in the current implementation; reserved in case multiple lists per account are supported someday.
- **Owner** — present only when the reserve for this list is covered by a [Sponsorship](/objects/Sponsorship) instead of the account itself.

## Flags

- **lsfOneOwnerCount** — indicates that, despite the existence of two internal objects related to signer lists in older protocol versions, only 1 owner reserve unit is counted (a historical compatibility detail, not relevant for normal use).

## How to query it

`account_objects` with `type: "signer_list"` returns it for the account. With `ledger_entry`, `signer_list` only accepts the object's ID directly (there are no derived parameters, because the main list's index is fixed per account):

```json
{ "method": "ledger_entry", "params": [{ "signer_list": "E6DBAFC99223B42257915A63DFC6B0C032D4C1F5F3EF6D9C2CE6A9C84C41Ff", "ledger_index": "validated" }] }
```

The index is `SHA512Half(0x0053 || AccountID || 0)` (`keylet::signerList`, namespace `'S'`, with the "page" fixed to 0 in the current implementation). In practice it is more straightforward to request it with `account_objects` or with the dedicated `account_info` method (`signer_lists: true` parameter), which already includes it embedded. Typical response:

```json
{
  "index": "E6DBAFC99223B42257915A63DFC6B0C032D4C1F5F3EF6D9C2CE6A9C84C41Ff",
  "node": {
    "LedgerEntryType": "SignerList",
    "SignerQuorum": 3,
    "SignerEntries": [
      { "SignerEntry": { "Account": "rfkE1aSy9G8Upk4JssnwBxhEv5p4mn2KTy", "SignerWeight": 2 } },
      { "SignerEntry": { "Account": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B", "SignerWeight": 1 } }
    ],
    "SignerListID": 0,
    "OwnerNode": "0",
    "Flags": 0
  }
}
```

## Reserve

Consumes 1 owner reserve unit (0.2 XRP on testnet), regardless of how many signers the list has.

## Related

- [SignerListSet](/tx/SignerListSet)
- [AccountRoot](/objects/AccountRoot), [Sponsorship](/objects/Sponsorship)
- [ExpandedSignerList](/amendments/ExpandedSignerList), [MultiSignReserve](/amendments/MultiSignReserve)
