---
title: SetFee
summary: Pseudo-transaction with which validators change the network's base fee and XRP reserves.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/pseudo-transaction-types/setfee
amendment: XRPFees
level: advanced
---

## What it does

`SetFee` sets the XRPL's three global economic parameters: the base fee of a transaction (`BaseFeeDrops`), the minimum reserve every account must hold (`ReserveBaseDrops`), and the additional reserve for each object it owns (`ReserveIncrementDrops`). On testnet today these are 10 drops, 1 XRP, and 0.2 XRP respectively; you can see them in `server_info` (`validated_ledger`) or in the [FeeSettings](/objects/FeeSettings) object.

Like [EnableAmendment](/tx/EnableAmendment), nobody sends it: validators issue it in a flag ledger (every 256 ledgers) when a majority of them vote for values different from the current ones. Each validator configures its preferences (`[voting]` in `rippled.cfg`), and the network converges on the median. It appears with `Account` equal to the null account, `Fee: "0"`, and no signature.

## When to use it

It can't be submitted. It's relevant for:

- Explaining why reserves can change over time without an amendment (on mainnet they dropped from 20/5 XRP to 10/2 XRP and then to 1/0.2 XRP through this mechanism).
- Knowing where the `reserve_base_xrp`, `reserve_inc_xrp`, and `base_fee_xrp` values returned by `server_info` come from.
- Designing applications that don't treat reserves as fixed: always read them from the ledger.

## How it works inside

`SetFee` uses the shared `Change` transactor (`src/libxrpl/tx/transactors/system/Change.cpp`), with the same structural rules as the other pseudo-transactions: zero account, fee 0, no signature, and `Sequence` 0 (`temBAD_SRC_ACCOUNT`, `temBAD_FEE`, `temBAD_SIGNATURE`, `temBAD_SEQUENCE` in `Transactor::invokePreflight<Change>`).

`Change::preclaim` returns `temINVALID` if the transaction is attempted against the open ledger, and for `ttFEE` it validates which fields must be present according to the [XRPFees](/amendments/XRPFees) amendment:

- With `XRPFees` active (the case on testnet): `BaseFeeDrops`, `ReserveBaseDrops`, and `ReserveIncrementDrops` are required (`temMALFORMED` if any is missing), and the old fields `BaseFee`, `ReferenceFeeUnits`, `ReserveBase`, and `ReserveIncrement` are prohibited (`temMALFORMED`).
- Without `XRPFees`: exactly the opposite; the old fields are required and the new ones give `temDISABLED`.
- `GasLimit`, `BytecodeSizeLimit`, and `GasPrice` exist in the format but are unconditionally prohibited (`temDISABLED`) "until FeeVoteImpl fills them in," per the code comment. They're a preview of Smart Escrow.

`Change::doApply` calls `Change::applyFee`: it reads (or creates) the `FeeSettings` object, copies the three values in drops, and, with `XRPFees`, explicitly clears the four old fields. It always returns `tesSUCCESS` and leaves a "Fees have been changed" notice in the log. The new values take effect starting with the next ledger.

## Key fields

- **BaseFeeDrops** — the minimum fee for a reference transaction, in drops. It's the "cost 1" multiplied by special fees (multisigning, [Batch](/tx/Batch)) and the load factor.
- **ReserveBaseDrops** — XRP an account can't spend simply by existing. It's also the minimum amount that must be sent to create an account via a [Payment](/tx/Payment).
- **ReserveIncrementDrops** — extra reserve per unit of `OwnerCount` (trust lines, offers, escrows, tickets, etc.). It's also the fee for [AccountDelete](/tx/AccountDelete) and [LedgerStateFix](/tx/LedgerStateFix).
- **LedgerSequence** — the flag ledger where this applies.
- **BaseFee, ReferenceFeeUnits, ReserveBase, ReserveIncrement** — the old format (fee units and hex); only valid if `XRPFees` isn't active.

## Common errors

Only visible in a validator's logs:

- **temMALFORMED** — a mix of new and old fields, or a required field missing for the active mode.
- **temDISABLED** — drop-denominated fields without `XRPFees`, or any of `GasLimit`/`BytecodeSizeLimit`/`GasPrice`.
- **temINVALID** — an attempt to apply it against the open ledger.
- **temBAD_SRC_ACCOUNT, temBAD_FEE, temBAD_SIGNATURE, temBAD_SEQUENCE** — someone tried to send it from a regular account.

## Example

How it appears on the ledger with `XRPFees` active:

```json
{
  "TransactionType": "SetFee",
  "Account": "rrrrrrrrrrrrrrrrrrrrrhoLvTp",
  "BaseFeeDrops": "10",
  "ReserveBaseDrops": "1000000",
  "ReserveIncrementDrops": "200000",
  "LedgerSequence": 20800000,
  "Fee": "0",
  "Sequence": 0,
  "SigningPubKey": ""
}
```

It can't be submitted. To see the current values, use `server_info` or `ledger_entry` with `fee: true`; the `FeeSettings` object also stores the `PreviousTxnID` of the last `SetFee` that changed it.

## Related

- [FeeSettings](/objects/FeeSettings) — the object it modifies.
- [EnableAmendment](/tx/EnableAmendment) and [UNLModify](/tx/UNLModify) — the other pseudo-transactions.
- [XRPFees](/amendments/XRPFees) — changed the format to drops.
- [AccountDelete](/tx/AccountDelete), [TicketCreate](/tx/TicketCreate) — transactions whose cost depends directly on these reserves.
