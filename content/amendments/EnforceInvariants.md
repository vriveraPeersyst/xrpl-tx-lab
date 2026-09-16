---
title: EnforceInvariants
summary: Activates the ledger's invariant checks after applying each transaction, rejecting it if it leaves the state in an impossible value.
xrplDocs: https://xrpl.org/resources/known-amendments#enforceinvariants
---

## What changes

After applying each transaction, rippled runs a set of "invariant checks": global rules that nothing should be able to violate, such as the total XRP not changing except through fee burning, `AccountRoot` balances not going negative, or directory entries remaining consistent. These checks live in `libxrpl/tx/invariants/` (for example `NFTInvariant`, `AMMInvariant`, `FreezeInvariant`) and run from `InvariantRunner`, which walks every modified ledger entry and calls `visitEntry` and `finalize` on each registered checker.

Before EnforceInvariants, a failure in these checks was only logged on the server without blocking the transaction. With the amendment active, if any invariant fails, the transaction is rejected with `tecINVARIANT_FAILED` (or `tefINVARIANT_FAILED` if the failure occurs in a check that should not depend on the transaction's outcome), and the ledger does not apply the changes that violated it. It is a protocol-level safety net, independent of each transactor's logic.

## Affected transactions and objects

It affects, across the board, every transaction that modifies the ledger, not a specific transaction. The checkers cover objects such as [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState), [NFTokenPage](/objects/NFTokenPage), [AMM](/objects/AMM) and the directory structures that index those objects.

## Status and context

It is the last line of defense against implementation bugs: even if a transactor has a logic error, the invariant checks prevent that error from translating into a corrupted ledger state (XRP created out of nothing, negative balances, broken references). Being a "feature"-type amendment that has already been retired (`XRPL_RETIRE_FEATURE` in `features.macro`), its behavior is today the only one possible: invariant checks are always active on any modern XRPL network.
