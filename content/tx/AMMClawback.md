---
title: AMMClawback
summary: Lets a token issuer claw back a token that a holder has deposited into an AMM, withdrawing their liquidity on their behalf.
category: amm
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ammclawback
xls: XLS-0073
amendment: AMMClawback
level: advanced
---

## What it does

Ordinary [Clawback](/tx/Clawback) recovers tokens from a holder's trust line. But if that holder has deposited the tokens into an [AMM](/objects/AMM), they're no longer on their trust line: they're in the pool's pseudo-account, and the holder only has LP tokens. `AMMClawback` fills that gap: the issuer forces a **balanced withdrawal** of the holder's (`Holder`) position from the AMM and, of what comes out, keeps its own token. The other asset in the pair is delivered to the holder, unless the issuer also issues that second asset and enables `tfClawTwoAssets`, in which case it claws back both.

It burns the holder's LP tokens, reduces the pool's reserves, and, if the pool ends up empty, deletes it just like [AMMWithdraw](/tx/AMMWithdraw). It ignores the holder's freezes, authorization, and reserve: the issuer takes priority (`OverrideFreeze` privilege).

Before the [AMMClawback](/amendments/AMMClawback) amendment, `AMMCreate` rejected tokens with clawback enabled; now they're allowed precisely because this transaction exists.

## When to use it

- Regulated issuers (stablecoins, tokenized assets) who must be able to recover funds by legal order even if they're in an AMM.
- Removing a compromised account's token from circulation without relying on that account withdrawing its own liquidity.
- Completely draining an AMM of your token when you want to discontinue it: after clawing back the last LP, the pool is deleted.

## How it works inside

`AMMClawback::checkExtraFeatures` requires [AMMClawback](/amendments/AMMClawback) (active on testnet), and [MPTokensV2](/amendments/MPTokensV2) if an MPT is involved.

`AMMClawback::preflight`:
- `Account` (issuer) ≠ `Holder` (`temMALFORMED`).
- `Asset` cannot be XRP (`temMALFORMED`): XRP has no issuer.
- `Asset.issuer` must be `Account` (`temMALFORMED`).
- With `tfClawTwoAssets`, `Asset2.issuer` must also be `Account` (`temINVALID_FLAG`).
- If `Amount` is present, its asset must be `Asset` (`temBAD_AMOUNT`) and must be positive.

`AMMClawback::preclaim`:
- `Holder` must exist (`terNO_ACCOUNT`); the pair must have an AMM (`terNO_AMM`).
- The issuer must have `lsfAllowTrustLineClawback` **and not** `lsfNoFreeze` (`tecNO_PERMISSION`). Both are set via [AccountSet](/tx/AccountSet) and are irreversible; `AllowTrustLineClawback` can only be enabled on an account with no trust lines. For MPT, the issuance must have `lsfMPTCanClawback`.
- With `tfClawTwoAssets`, the same check applies to `Asset2`.

`AMMClawback::doApply` (in `applyGuts`):
1. With [fixAMMClawbackRounding](/amendments/fixAMMClawbackRounding) (active) it first calls `verifyAndAdjustLPTokenBalance` to fix rounding mismatches if the holder is the last LP. If the holder has no LP tokens → `tecAMM_BALANCE`.
2. **Without `Amount`**: `AMMWithdraw::equalWithdrawTokens` with all of the holder's LP tokens (`WithdrawAll::Yes`), no fee, ignoring freeze, auth, and reserve.
3. **With `Amount`**: `equalWithdrawMatchingOneAmount` computes the fraction `Amount / assetReserve`, withdraws that same fraction of the other asset and of the LP tokens. If the fraction covers all of the holder's LP tokens (more than they have; with [fixCleanup3_4_0](/amendments/fixCleanup3_4_0), not yet active, also if exactly equal) it becomes a full withdrawal. With `fixAMMClawbackRounding` it rounds LP tokens and assets in favor of the pool (`getRoundedLPTokens`, `getRoundedAsset`).
4. Checks the precision invariant and calls `deleteAMMAccountIfEmpty`.
5. What's withdrawn of `Asset` goes from the holder to the issuer via `directSendNoFee` (equivalent to burning it). With `tfClawTwoAssets` the same happens with `Asset2`; otherwise the holder keeps the second asset. If the holder had deleted their trust line, it's recreated without requiring reserve (`ReserveHandling::IgnoreReserve`), so they can't dodge the clawback.

One detail: in the withdrawal, the `Amount` you request is interpreted against the pool's reserve, so the issuer recovers at most the holder's proportional share; it cannot take liquidity from other LPs.

## Key fields

- **Holder** — Account whose deposit in the AMM is being clawed back. Must have LP tokens of that pool.
- **Asset** — Your token (with `issuer` = your account). This is the asset you're clawing back.
- **Asset2** — The other asset in the pair, used to identify the AMM.
- **Amount** — How much of `Asset` to claw back. If omitted, **all** of the holder's position is withdrawn. If specified, the equivalent fraction of both assets is withdrawn.

## Flags

- **tfClawTwoAssets** (1) — Also claws back `Asset2`. Only valid if you issue both assets in the pool.

## Common errors

- **tecNO_PERMISSION** — Your account doesn't have `lsfAllowTrustLineClawback`, or it has `lsfNoFreeze`. Enable `asfAllowTrustLineClawback` (16) with `AccountSet` before issuing any trust line.
- **temMALFORMED** — `Asset` is XRP, its `issuer` isn't your account, or `Holder` is you.
- **temINVALID_FLAG** — `tfClawTwoAssets` with an `Asset2` you don't issue.
- **tecAMM_BALANCE** — The holder has no LP tokens for this AMM.
- **tecAMM_INVALID_TOKENS** / **tecAMM_FAILED** — `Amount` so small it rounds to zero LP tokens or leaves a one-sided withdrawal.
- **terNO_AMM** / **terNO_ACCOUNT** — The pair has no AMM, or `Holder` doesn't exist.

## Example

```json
{
  "TransactionType": "AMMClawback",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Holder": "rYYYY_OTHER_ACCOUNT",
  "Asset": { "currency": "USD", "issuer": "rXXXX_YOUR_ACCOUNT" },
  "Asset2": { "currency": "XRP" }
}
```

Claws back all of `rYYYY_OTHER_ACCOUNT`'s position in the USD/XRP pool: the USD goes back to the issuer and the XRP is delivered to the holder.

## Try it on testnet

Here your account acts as the **issuer**, so you need to set up the scenario:

1. With `rXXXX_YOUR_ACCOUNT` send [AccountSet](/tx/AccountSet) with `SetFlag: 16` (`asfAllowTrustLineClawback`) **before** anyone opens trust lines with you, and `SetFlag: 8` (`asfDefaultRipple`).
2. From `rYYYY_OTHER_ACCOUNT` open a USD trust line to your account ([TrustSet](/tx/TrustSet)) and have it pay you, say, 100 USD with a [Payment](/tx/Payment).
3. With `rYYYY_OTHER_ACCOUNT` create the USD/XRP AMM ([AMMCreate](/tx/AMMCreate) with 50 USD and 10 XRP). Note the `amm_info`.
4. With `rXXXX_YOUR_ACCOUNT` send the example. In the metadata you'll see the holder's LP token line set to zero, the pseudo-account's USD trust line decrease, and the holder receive the 10 XRP; since it was the only LP, the AMM is deleted (`DeletedNode` for `AMM` and `AccountRoot`).
5. Repeat the scenario and try `Amount: {currency: "USD", issuer: "rXXXX_YOUR_ACCOUNT", value: "10"}`: only a fifth of the position is withdrawn and the AMM stays alive with a reduced `lp_token.value`.
6. Send the transaction from an account without `AllowTrustLineClawback` to see `tecNO_PERMISSION`.

## Related

- [Clawback](/tx/Clawback), [AMMWithdraw](/tx/AMMWithdraw), [AMMCreate](/tx/AMMCreate), [AMMDelete](/tx/AMMDelete), [AccountSet](/tx/AccountSet)
- [AMM](/objects/AMM), [RippleState](/objects/RippleState)
- [AMMClawback](/amendments/AMMClawback), [Clawback](/amendments/Clawback), [fixAMMClawbackRounding](/amendments/fixAMMClawbackRounding), [fixCleanup3_4_0](/amendments/fixCleanup3_4_0)
