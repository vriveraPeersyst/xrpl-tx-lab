---
title: SponsorshipSet
summary: An account offers to pay another account's fee or reserve, creating a Sponsorship object.
category: permisos
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/sponsorshipset
amendment: Sponsor
level: advanced
---

## What it does

`SponsorshipSet` creates, adjusts or deletes a `Sponsorship` object: a relationship in which one account (the sponsor, who sends the transaction) commits to covering another account's transaction fees, its owner reserve, or both, up to a limit (`MaxFee`) and a number of sponsored objects (`RemainingOwnerCountDelta`). It's the piece that allows, for example, an application to pay on behalf of its users without those users needing their own XRP to operate.

**This transaction type depends on the `Sponsor` amendment, which is not active on testnet today.** Any attempt to send it fails with `temDISABLED` (or the equivalent) until it's activated.

## When to use it (once the amendment is active)

- An application sponsors its new users' fees so they can operate without buying XRP first.
- A service covers the owner reserve of objects it creates on a user's behalf (for example, an initial `TrustSet`).
- Withdrawing or reducing an existing sponsorship by adjusting `FeeAmountDelta` or using `tfDeleteObject`.

## How it works inside

**`SponsorshipSet::preflight`** validates that amounts aren't negative or malformed (`temBAD_AMOUNT`), rejects contradictory flag combinations such as setting and clearing `RequireSignForFee` at the same time, and requires that you don't sponsor yourself (`temREDUNDANT`).

**`SponsorshipSet::preclaim`** checks that the sponsored account exists (`tecNO_DST` if not), that you don't exceed the sponsorship system's limits (`tecLIMIT_EXCEEDED`) and, if you're modifying an existing sponsorship, that it belongs to you (`tecNO_PERMISSION` if not) and that the account involved isn't a pseudo-account (`tecPSEUDO_ACCOUNT`).

**`SponsorshipSet::doApply`**, via `createSponsorship`, creates the `Sponsorship` object the first time (with an owner reserve, `tecDIR_FULL` if the directory is full) or adjusts `FeeAmount` and `RemainingOwnerCount` according to the given deltas; if the sponsor's balance doesn't cover the commitment, `tecUNFUNDED`. With `tfDeleteObject`, it removes the sponsorship.

## Key fields

- **Sponsee** — the sponsored account.
- **CounterpartySponsor** — for relationships where both parties must confirm the sponsorship.
- **FeeAmountDelta** — how much this transaction adds to or removes from the sponsored fee budget (in drops).
- **MaxFee** — total fee ceiling the sponsor is willing to cover.
- **RemainingOwnerCountDelta** — how many additional objects (reserve) it commits to covering.

## Flags

- **tfDeleteObject** — removes the existing `Sponsorship` object instead of creating or modifying it.
- **tfSponsorshipSetRequireSignForFee** / **tfSponsorshipClearRequireSignForFee** — requires (or stops requiring) that the sponsored account sign to consume the fee sponsorship.
- **tfSponsorshipSetRequireSignForReserve** / **tfSponsorshipClearRequireSignForReserve** — the same for the reserve sponsorship.

## Common errors

- **temDISABLED** — the `Sponsor` amendment isn't active (the current case on testnet).
- **temREDUNDANT** — you're trying to sponsor yourself.
- **tecNO_DST** — the `Sponsee` account doesn't exist.
- **tecUNFUNDED** — your balance doesn't cover the commitment you're taking on.
- **tecLIMIT_EXCEEDED** — you exceed the maximum number of allowed sponsorships.
- **tecNO_PERMISSION** — you're trying to modify a sponsorship that isn't yours.

## Try it on testnet

Since the `Sponsor` amendment isn't active on testnet today, any `SponsorshipSet` you send from the builder will return a `temDISABLED`-type error. You can verify this with the example below; once the network activates the amendment, the same flow will create the `Sponsorship` object and you'll be able to query it with `account_objects`.

## Example

```json
{
  "TransactionType": "SponsorshipSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "Sponsor": "rYYYY_OTHER_ACCOUNT",
  "Flags": 65536
}
```

This would attempt to create a sponsorship toward `rYYYY_OTHER_ACCOUNT`; it fails with `temDISABLED` while the amendment isn't active.

## Related

- [SponsorshipTransfer](/tx/SponsorshipTransfer) — transfers an existing sponsorship to another account.
- Amendments: [Sponsor](/amendments/Sponsor).
