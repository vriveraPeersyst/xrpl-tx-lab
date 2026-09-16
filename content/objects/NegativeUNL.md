---
title: NegativeUNL
summary: Singleton object that lists the UNL validators the network considers down, so their vote is not required for consensus.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/negativeunl
createdBy: sistema (UNLModify)
modifiedBy: UNLModify
reserve: 0
---

## What it represents

`NegativeUNL` is a *singleton*: only one object of this type exists in the entire ledger. The network needs a super-majority of the UNL (the trusted validator list) to agree in order to validate a ledger; if several validators go down at once, that threshold becomes hard to reach and the network can stall. The Negative UNL is the mechanism for temporarily excluding a validator from the required-majority calculation, once it has been observed to be unresponsive for a while, without having to change the trust list (`UNL`) itself.

A validator on the Negative UNL is still trusted; it simply doesn't count toward the quorum while marked as inactive.

## Lifecycle

- **Creation**: exists since genesis, normally empty.
- **Modification**: the pseudo-transaction [UNLModify](/tx/UNLModify), emitted by the validators themselves via consensus vote (never by a user), adds a key to `ValidatorToDisable` when they detect sustained inactivity from a validator, or removes it with `ValidatorToReEnable` once it starts participating again. Both changes only apply on flag ledgers (multiples of 256).
- **Deletion**: never deleted, even when empty.

## Key fields

- **DisabledValidators** — list of validators currently excluded from the quorum, each with its master public key and the ledger index at which they were disabled.
- **ValidatorToDisable** — public key of the validator proposed to be disabled at the next flag ledger (transient field, present only while the change is being processed).
- **ValidatorToReEnable** — public key of the validator proposed to be re-enabled at the next flag ledger.

## Flags

Has no `lsf*` flags.

## How to query it

It doesn't belong to any account, so it doesn't appear in `account_objects`. With `ledger_entry`, pass `"nunl": true`:

```json
{ "method": "ledger_entry", "params": [{ "nunl": true, "ledger_index": "validated" }] }
```

The index is fixed: `SHA512Half(0x004E)` (`keylet::negativeUNL`, namespace `'N'`). Typical response (with an empty list, the normal case on testnet):

```json
{
  "index": "2E8A1B4F5C9D0E3A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A",
  "node": {
    "LedgerEntryType": "NegativeUNL",
    "Flags": 0
  }
}
```

You can also see the current state via `server_info`/`consensus_info` on a `rippled` with access to validator metrics.

## Related

- [UNLModify](/tx/UNLModify)
- [Amendments](/objects/Amendments), [FeeSettings](/objects/FeeSettings)
