---
title: UNLModify
summary: Negative UNL pseudo-transaction with which the network marks a validator as inactive or reinstates it.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/pseudo-transaction-types/unlmodify
amendment: NegativeUNL
level: advanced
---

## What it does

The XRPL needs more than 80% of the trusted validators (the UNL) to agree in order to validate a ledger. If several validators go down at once, the network could stop making progress. The *Negative UNL* is the solution: the network itself keeps a list of validators that have gone a while without voting, and temporarily excludes them from the quorum, so that the absence of a few doesn't block everyone else.

`UNLModify` is the pseudo-transaction that updates that list, stored in the [NegativeUNL](/objects/NegativeUNL) object. With `UNLModifyDisabling: 1` it proposes disabling a validator; with `0` it proposes re-enabling it. The proposal doesn't take effect immediately: it's recorded as `ValidatorToDisable` or `ValidatorToReEnable` and becomes effective at the next flag ledger, 256 ledgers later.

Like all pseudo-transactions, it's issued by the system with the null account, no fee and no signature; no account can send it.

## When to use it

It can't be used. It's worth understanding it in order to:

- Interpret `server_info` or `ledger_entry` (`nunl: true`) when you see validators in `DisabledValidators`.
- Know that a disabled validator can still validate; it simply doesn't count toward the quorum until it's re-enabled.
- Understand the network's robustness against partial outages: the voting rules (`NegativeUNLVote`) only allow listing up to 25% of the UNL (`kNegativeUnlMaxListed`), disabling anyone who has validated less than 50% of the last 256 ledgers, and re-enabling anyone who exceeds 80% again.

## How it works inside

It shares the `Change` transactor (`src/libxrpl/tx/transactors/system/Change.cpp`) with [EnableAmendment](/tx/EnableAmendment) and [SetFee](/tx/SetFee).

`Transactor::invokePreflight<Change>` enforces the shape of every pseudo-transaction: `Account` zero (`temBAD_SRC_ACCOUNT`), `Fee` 0 (`temBAD_FEE`), no signature or `Signers` (`temBAD_SIGNATURE`), `Sequence` 0 and no `PreviousTxnID` (`temBAD_SEQUENCE`).

`Change::preclaim` returns `temINVALID` if an attempt is made to apply it against the open ledger; for `ttUNL_MODIFY` it doesn't validate anything else.

`Change::doApply` calls `Change::applyUNLModify`, which performs all the checks and responds with `tefFAILURE` for any problem:

1. The ledger must be a flag ledger (`isFlagLedger(view().seq())`, a multiple of 256).
2. `UNLModifyDisabling` (only 0 or 1), `LedgerSequence` and `UNLModifyValidator` must be present.
3. `LedgerSequence` must exactly match the index of the ledger being closed.
4. `UNLModifyValidator` must be a valid public key (`publicKeyType`).
5. It reads (or creates) the `NegativeUNL` object and checks whether the validator is already in `DisabledValidators`.
6. To disable: there can't already be a pending `ValidatorToDisable`, the validator can't be the same as a pending `ValidatorToReEnable`, and it can't already be in the list. If everything checks out, it writes `ValidatorToDisable`.
7. To re-enable: symmetric. There can't already be a `ValidatorToReEnable`, it can't match `ValidatorToDisable`, and the validator **must** be in the list. It writes `ValidatorToReEnable`.

From this it follows that at each flag ledger there can be, at most, one proposal to disable and one to re-enable. The actual application (moving the validator to or from `DisabledValidators`) happens when the next flag ledger closes, outside this transactor.

The [NegativeUNL](/amendments/NegativeUNL) amendment that introduced all of this is active on testnet, and the transactor no longer checks for it.

## Key fields

- **UNLModifyDisabling** — 1 to propose disabling, 0 to propose re-enabling. Any other value is `tefFAILURE`.
- **UNLModifyValidator** — the validator's public key (hex, the same one you see in `validators` or `server_info`), not its address or domain.
- **LedgerSequence** — must be the index of the flag ledger it's included in.

## Common errors

These only appear in a validator's logs (`N-UNL: applyUNLModify, ...`):

- **tefFAILURE** — any of the seven checks above fails: it's not a flag ledger, `LedgerSequence` is incorrect, the key is invalid, the proposal is duplicated, disabling someone already listed, or re-enabling someone who isn't.
- **temINVALID** — an attempt was made to apply it against the open ledger.
- **temBAD_SRC_ACCOUNT, temBAD_FEE, temBAD_SIGNATURE, temBAD_SEQUENCE** — someone tried to send it from a regular account.

## Example

This is how a proposal to disable a validator appears in a flag ledger:

```json
{
  "TransactionType": "UNLModify",
  "Account": "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
  "UNLModifyDisabling": 1,
  "UNLModifyValidator": "ED6E9F1F7A9C5F4B4E8F7A6B5C4D3E2F1A0B9C8D7E6F5A4B3C2D1E0F9A8B7C6D5E",
  "LedgerSequence": 20800000,
  "Fee": "0",
  "Sequence": 0,
  "SigningPubKey": ""
}
```

It can't be sent. To observe testnet's Negative UNL, use `ledger_entry` with `nunl: true` or check the `validated_ledger` field of `server_info`; typically the object doesn't exist or is empty, because it's only created when some validator fails in a sustained way.

## Related

- [NegativeUNL](/objects/NegativeUNL) — the object it modifies.
- [EnableAmendment](/tx/EnableAmendment) and [SetFee](/tx/SetFee) — the other pseudo-transactions of the `Change` transactor.
- [NegativeUNL](/amendments/NegativeUNL) — the amendment that introduced this mechanism.
