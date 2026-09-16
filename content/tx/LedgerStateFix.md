---
title: LedgerStateFix
summary: Maintenance transaction that repairs damaged ledger structures (NFT pages or offer book directories) in exchange for a fee of one owner reserve.
category: sistema
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/ledgerstatefix
amendment: fixNFTokenPageLinks
level: advanced
---

## What it does

`LedgerStateFix` is a repair tool, not a business operation. When a historical bug leaves a ledger structure in an inconsistent state, this transaction lets any account pay to have it repaired. It doesn't move funds or create objects: it fixes links or fields that already exist.

Today it supports two kinds of fix (`LedgerFixType`):

- **1 – NfTokenPageLink**: repairs the links between an account's (`Owner`) [NFTokenPage](/objects/NFTokenPage) pages. Introduced by [fixNFTokenPageLinks](/amendments/fixNFTokenPageLinks) to fix NFT directories broken by an old bug in page splitting.
- **2 – BookExchangeRate**: recalculates the `ExchangeRate` field of the first page of an offer book directory (`BookDirectory`) when it doesn't match the quality encoded in its own key. Added by [fixCleanup3_2_0](/amendments/fixCleanup3_2_0).

Anyone can send it: you don't need to own the structure.

## When to use it

- An account can't mint, transfer, or burn NFTs because its pages are badly linked (unexplained `tecINTERNAL` or `tefBAD_LEDGER` errors on NFT operations).
- An offer book returns inconsistent results because of a badly stored `ExchangeRate`.
- As an operator or tooling developer, to leave the testnet ledger in a healthy state after reproducing a bug.

In practice it's very rarely needed; on a testnet with the relevant fixes active, there's normally nothing to repair.

## How it works inside

`LedgerStateFix::preflight` looks at `LedgerFixType`: type 1 is always accepted; type 2 requires [fixCleanup3_2_0](/amendments/fixCleanup3_2_0) to be active (otherwise `temDISABLED`, though it is active on testnet); any other value returns `tefINVALID_LEDGER_FIX_TYPE`. It then checks that the transaction carries exactly the field that matches its type (`Owner` for type 1, `BookDirectory` for type 2) and none of the other type's; otherwise `temINVALID`. The `kLedgerFixFields` table is what associates each type with its field. Note that the current code no longer checks `fixNFTokenPageLinks`: the amendment is now integrated.

`LedgerStateFix::calculateBaseFee` returns `calculateOwnerReserveFee`: the minimum fee is a full owner reserve (0.2 XRP on testnet), same as in [AccountDelete](/tx/AccountDelete). This is deliberate: it discourages spamming a transaction that traverses potentially large structures.

`LedgerStateFix::preclaim` validates against the ledger. For type 1, `Owner` must exist as an account (`tecOBJECT_NOT_FOUND`). For type 2, `BookDirectory` must be an existing `DirectoryNode` (`tecOBJECT_NOT_FOUND`), must be the book's first page (the one holding `ExchangeRate`; otherwise `tecNO_PERMISSION`), and its `ExchangeRate` must actually be wrong: if it already matches `getQuality(key)`, also `tecNO_PERMISSION`. In other words, you can't pay to "fix" something that's already healthy.

`LedgerStateFix::doApply` performs the fix. Type 1: calls `nft::repairNFTokenDirectoryLinks` on the `Owner`; if it fails to repair anything it returns `tecFAILED_PROCESSING` (and still charges the fee). Type 2: writes `ExchangeRate = getQuality(key)` to the page and updates it.

The transaction is delegable (`delegable: true` in protocol.json).

## Key fields

- **LedgerFixType** — 1 (`NfTokenPageLink`) or 2 (`BookExchangeRate`). Determines which other field is required.
- **Owner** — type 1 only: the account whose NFT pages you want to repair. Doesn't have to be your own.
- **BookDirectory** — type 2 only: key (64 hex chars) of the offer book directory's first page. Obtained from `book_offers` or `ledger_data`.
- **Fee** — minimum one owner reserve (200000 drops on testnet), not the base fee of 10 drops.

## Common errors

- **tefINVALID_LEDGER_FIX_TYPE** — `LedgerFixType` is neither 1 nor 2.
- **temINVALID** — `Owner` (type 1) or `BookDirectory` (type 2) is missing, or you set the field for the other type.
- **telINSUF_FEE_P** — the `Fee` is less than the owner reserve; this isn't from the transactor but from the common fee check.
- **tecOBJECT_NOT_FOUND** — the `Owner` account or the `BookDirectory` directory doesn't exist.
- **tecNO_PERMISSION** — the directory isn't a book's first page, or its `ExchangeRate` is already correct (nothing to fix).
- **tecFAILED_PROCESSING** — the NFT page repair couldn't be completed; the fee is charged anyway.

## Example

```json
{
  "TransactionType": "LedgerStateFix",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "LedgerFixType": 1,
  "Owner": "rYYYY_OTHER_ACCOUNT",
  "Fee": "200000"
}
```

## Try it on testnet

1. Set the builder's `Fee` to 200000 drops (0.2 XRP, testnet's owner reserve). With 10 drops the network rejects it for insufficient fee.
2. Send the example with `LedgerFixType: 1` and an `Owner` that exists. The most likely outcome is `tesSUCCESS` (or `tecFAILED_PROCESSING` if the Owner has no NFT pages to repair) and, either way, no visible change: query the Owner's `account_objects` with `type: "nft_page"` before and after and compare.
3. Try with an `Owner` with no funds (nonexistent account): `tecOBJECT_NOT_FOUND`.
4. Try `LedgerFixType: 3`: `tefINVALID_LEDGER_FIX_TYPE`. Try type 1 with `BookDirectory` instead of `Owner`: `temINVALID`.
5. For type 2, take a real `BookDirectory` from `book_offers` (the `BookDirectory` field of any offer) and send it: on a healthy ledger you'll get `tecNO_PERMISSION`, because the `ExchangeRate` already matches.

## Related

- [NFTokenPage](/objects/NFTokenPage) and [DirectoryNode](/objects/DirectoryNode) — the structures it repairs.
- [NFTokenMint](/tx/NFTokenMint), [OfferCreate](/tx/OfferCreate) — the operations that depend on them.
- [AccountDelete](/tx/AccountDelete) — the other transaction with a fee of one owner reserve.
- [fixNFTokenPageLinks](/amendments/fixNFTokenPageLinks), [fixCleanup3_2_0](/amendments/fixCleanup3_2_0).
