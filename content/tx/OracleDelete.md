---
title: OracleDelete
summary: Deletes a price oracle and frees the reserve it consumed.
category: oraculos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/oracledelete
amendment: PriceOracle
level: basic
---

## What it does

`OracleDelete` removes a complete [Oracle](/objects/Oracle) object from the ledger: every price pair it contained disappears at once, and you recover the owner reserve it consumed. It's identified exactly the same way it was created, with `OracleDocumentID`, since an account can maintain several oracles in parallel.

There's no partial deletion of pairs with this transaction — for that you use [OracleSet](/tx/OracleSet), omitting `AssetPrice` on the entry you want to remove. `OracleDelete` is all or nothing.

## When to use it

- Withdrawing a price feed you're no longer going to keep updated.
- Freeing the reserve of an obsolete or test oracle.
- Cleaning up oracles before an `AccountDelete`, if they're accumulating owner reserve.
- Replacing an oracle with another one under a different `OracleDocumentID` without carrying over the old pair history: instead of overwriting with [OracleSet](/tx/OracleSet), it's sometimes simpler to delete and recreate from scratch.

## How it works inside

**`OracleDelete::preflight`** doesn't validate anything specific: it always returns `tesSUCCESS`.

**`OracleDelete::preclaim`** checks that an oracle exists with your account as owner and the given `OracleDocumentID`; if not, `tecNO_ENTRY`.

**`OracleDelete::doApply`**, through the internal `deleteOracle` function, removes the object from the owner directory (`tefBAD_LEDGER` if the directory is in an inconsistent state), decreases your owner count by 1, and deletes the object from the ledger. The effect is immediate: the oracle and all its price pairs stop existing in that same ledger.

## Key fields

- **OracleDocumentID** — the identifier of the oracle to delete, the same one you used when creating it with [OracleSet](/tx/OracleSet).

## Common errors

- **tecNO_ENTRY** — no oracle exists with that `OracleDocumentID` on your account.
- **tefBAD_LEDGER** — internal inconsistency while removing the entry from the owner directory.

Unlike `OracleSet`, there are no timing or format validations here: if the oracle exists and is yours, the transaction succeeds. Keep in mind that any application depending on that `OracleDocumentID` (for example, a `LoanBrokerSet` referencing it as a price source) will no longer be able to query it once deleted.

## Example

```json
{
  "TransactionType": "OracleDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "OracleDocumentID": 1
}
```

Deletes oracle number 1 belonging to your account.

## Try it on testnet

1. Create a test oracle with [OracleSet](/tx/OracleSet) if you don't already have one.
2. Confirm it exists by querying `get_aggregate_price` with your account and `oracle_document_id: 1`.
3. Sign and submit the example `OracleDelete`.
4. Repeat the `get_aggregate_price` query: it will now fail because the oracle no longer exists. Also check with `account_objects` (`type: "oracle"`) that the object has disappeared.
5. Submit the same `OracleDelete` again: you'll get `tecNO_ENTRY`.

## Related

- [OracleSet](/tx/OracleSet) — creates or updates the oracle.
- Objects: [Oracle](/objects/Oracle).
- Amendments: [PriceOracle](/amendments/PriceOracle).
