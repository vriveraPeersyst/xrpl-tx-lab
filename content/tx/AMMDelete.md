---
title: AMMDelete
summary: Deletes an empty AMM (no LP tokens) that couldn't be automatically removed on the last withdrawal.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammdelete
xls: XLS-0030
amendment: AMM
level: basic
---

## What it does

When the last liquidity provider withdraws their position with [AMMWithdraw](/tx/AMMWithdraw) (or the issuer claws back everything with [AMMClawback](/tx/AMMClawback)), the transactor itself tries to delete the [AMM](/objects/AMM): the object, the pseudo-account [AccountRoot](/objects/AccountRoot), and all the [trust lines](/objects/RippleState) the pseudo-account maintains (one for every account that ever held LP tokens, plus the asset ones). That deletion has a limit of 512 trust lines per transaction (`kMaxDeletableAmmTrustLines`), so in very popular pools the final withdrawal ends up with `tecINCOMPLETE` and the AMM stays on the ledger with `LPTokenBalance` at zero.

`AMMDelete` is meant to finish that work. Any account can send it: there's no AMM owner. Each submission deletes up to 512 more trust lines; when none remain, it removes the AMM object and the pseudo-account.

## When to use it

- After an `AMMWithdraw` or `AMMClawback` that returned `tecINCOMPLETE`.
- Cleaning up an empty AMM whose LP token trust lines are still taking up reserve in former LPs' accounts (deleting the line from the pseudo-account's side gives the LP's account back that reserve).
- Before recreating the pair with [AMMCreate](/tx/AMMCreate): while the object exists, `AMMCreate` returns `tecDUPLICATE`, though it can be reactivated with [AMMDeposit](/tx/AMMDeposit) and `tfTwoAssetIfEmpty`.

## How it works inside

`AMMDelete::checkExtraFeatures` requires [AMM](/amendments/AMM), and [MPTokensV2](/amendments/MPTokensV2) if any asset is an MPT.

`AMMDelete::preflight` doesn't check anything specific: it returns `tesSUCCESS` (the common `Transactor::preflight` validations still apply: signature, `Fee`, `Sequence`, universal flags).

`AMMDelete::preclaim`:
- Looks up the AMM by `Asset`/`Asset2`; if it doesn't exist → `terNO_AMM`.
- If `LPTokenBalance != 0` → `tecAMM_NOT_EMPTY`. A pool with liquidity can't be deleted: it has to be withdrawn first.

`AMMDelete::doApply` calls `deleteAMMAccount` (`AMMHelpers.cpp`):
1. `deleteAMMTrustLines` walks the pseudo-account's directory and deletes up to 512 trust lines. If more remain, it returns `tecINCOMPLETE`; the transaction **still applies** (it's a `tec` code, so it consumes `Fee` and `Sequence`) and the progress is saved.
2. If all trust lines have disappeared, `deleteAMMMPTokens` deletes the pseudo-account's MPToken objects (only relevant when the pool holds MPT).
3. Unlinks the AMM object from the pseudo-account's directory, deletes the directory, and removes the AMM object and the pseudo-account's `AccountRoot`.

Note that `doApply` applies the sandbox both with `tesSUCCESS` and with `tecINCOMPLETE`: in both cases the ledger changes.

## Key fields

- **Asset** / **Asset2** — The pair identifying the AMM, in the same format as in `amm_info`: `{currency: "XRP"}` or `{currency, issuer}`. Order doesn't matter: `keylet::amm` canonicalizes it.

It has no flags of its own.

## Common errors

- **tecAMM_NOT_EMPTY** — The pool still has LP tokens in circulation. All LPs must withdraw (or the issuer must claw back) first.
- **terNO_AMM** — No AMM exists for that pair: check `issuer` and `currency`, or it's already been deleted.
- **tecINCOMPLETE** — 512 trust lines were deleted but more remain. Not a real error: keep sending `AMMDelete` until you get `tesSUCCESS`.
- **temDISABLED** — Only if the AMM amendment weren't active; on testnet it is.

## Example

```json
{
  "TransactionType": "AMMDelete",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Asset": { "currency": "XRP" },
  "Asset2": { "currency": "USD", "issuer": "rZZZZ_EMISOR" }
}
```

## Try it on testnet

Under normal conditions it's hard to see `AMMDelete` in action, because a test AMM with few LPs deletes itself on the last withdrawal. You can test both paths:

1. With an XRP/USD AMM that still has liquidity, send the example and observe `tecAMM_NOT_EMPTY` in the result (the transaction is included in the ledger and charges the `Fee`).
2. Withdraw all the liquidity with [AMMWithdraw](/tx/AMMWithdraw) and `tfWithdrawAll`. Check `amm_info`: if it returns `actNotFound`, the AMM was already deleted in that same transaction, and a later `AMMDelete` will give `terNO_AMM`.
3. If `amm_info` still shows the AMM with `lp_token.value` = 0 (happens when the pseudo-account had more than 512 trust lines), send `AMMDelete` as many times as needed. In the metadata you'll see a `DeletedNode` of type `RippleState` for each deleted trust line, and, on the final submission, the `DeletedNode` entries for `AMM` and `AccountRoot`.
4. Check with `account_lines` on a former LP's account that its LP token line has disappeared and that its `OwnerCount` has dropped.

## Related

- [AMMWithdraw](/tx/AMMWithdraw), [AMMClawback](/tx/AMMClawback), [AMMCreate](/tx/AMMCreate), [AMMDeposit](/tx/AMMDeposit)
- [AMM](/objects/AMM), [AccountRoot](/objects/AccountRoot), [RippleState](/objects/RippleState)
- [AMM](/amendments/AMM)
