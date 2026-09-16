---
title: MPTokenIssuanceCreate
summary: Creates a Multi-Purpose Token (MPT) issuance with its fixed rules: scale, maximum, transfer fee, metadata and permissions.
category: mpt
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/mptokenissuancecreate
xls: XLS-0033
amendment: MPTokensV1
level: intermediate
---

## What it does

`MPTokenIssuanceCreate` registers an [MPTokenIssuance](/objects/MPTokenIssuance) object on the ledger. It is the "definition" of a new-generation fungible token: unlike classic IOUs, it doesn't need trust lines or a three-letter currency code. The issuance identifier (`MPTokenIssuanceID`, 48 hex) is derived from your `Sequence` and your account, so it's deterministic.

At creation time you fix almost everything: `AssetScale`, `MaximumAmount`, `TransferFee`, metadata and the capability flags (can it be locked? transferred? clawed back?). On testnet, with only [MPTokensV1](/amendments/MPTokensV1) active, those flags and fields are immutable. The [DynamicMPT](/amendments/DynamicMPT) amendment (not active on testnet) would allow changing them later with [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet) and introduces `ImmutableFlags`.

Holders receive units when you send them a [Payment](/tx/Payment) with `Amount` in MPT format. Each holder must first have an [MPToken](/objects/MPToken) object, created with [MPTokenAuthorize](/tx/MPTokenAuthorize).

## When to use it

- Stablecoins, loyalty points, bonds, or any fungible asset you want to control with explicit rules.
- Tokens that require KYC: `tfMPTRequireAuth` forces you to authorize each holder.
- Assets with a fee on transfers between third parties (`TransferFee`).

## How it works inside

**`MPTokenIssuanceCreate::checkExtraFeatures`** rejects with `temDISABLED` anything that depends on amendments not active on testnet: `DomainID` (requires `PermissionedDomains` + `SingleAssetVault`), `ImmutableFlags` (requires `DynamicMPT`) and `tfMPTCanHoldConfidentialBalance` (requires `ConfidentialTransfer`).

**`MPTokenIssuanceCreate::preflight`**:
- `ReferenceHolding` in the tx → `temMALFORMED` (it's an internal field only written by the vault protocol).
- `ImmutableFlags` set to 0 or with bits outside the mask → `temINVALID_FLAG`.
- `TransferFee` > 50000 → `temBAD_TRANSFER_FEE`; greater than 0 without `tfMPTCanTransfer` → `temMALFORMED`; greater than 0 with `tfMPTCanHoldConfidentialBalance` → `temBAD_TRANSFER_FEE`.
- `DomainID` set to zero, or present without `tfMPTRequireAuth` → `temMALFORMED`.
- `MPTokenMetadata` empty or larger than 1024 bytes → `temMALFORMED`.
- `MaximumAmount` equal to 0 or greater than 2^63−1 → `temMALFORMED`.

**`MPTokenIssuanceCreate::doApply`** calls `MPTokenIssuanceCreate::create`, which:
1. Checks the reserve for one more object against your balance before the fee (`tecINSUFFICIENT_RESERVE`).
2. Computes the ID with `makeMptID(Sequence, Account)`.
3. Inserts the issuance into your owner directory and creates the object with `Issuer`, `OutstandingAmount = 0`, `Sequence`, the tx flags (without `tfUniversal`) and any optional fields you provided.
4. Increases your `OwnerCount` by 1.

## Key fields

- **AssetScale** — number of decimal places to display. The ledger stores integers; with `AssetScale: 2`, 100 units are shown as 1.00.
- **MaximumAmount** — cap on units in circulation (decimal string, maximum 9223372036854775807). If omitted, the maximum is that same value.
- **TransferFee** — fee charged when transferring between two holders who aren't the issuer, in units of 0.001% (100 = 0.1%). Requires `tfMPTCanTransfer`.
- **MPTokenMetadata** — up to 1024 bytes in hex. XLS-89 proposes a JSON schema (name, ticker, icon...).
- **DomainID** — restricts holders to a permissioned domain. Not usable on testnet (`temDISABLED`).
- **ImmutableFlags** — which properties can never be changed later with `MPTokenIssuanceSet`. Only with `DynamicMPT`.

## Flags

- **tfMPTCanLock** (2) — the issuer will be able to lock the entire issuance or a single holder with `MPTokenIssuanceSet`.
- **tfMPTRequireAuth** (4) — holders need the issuer to authorize them before receiving funds.
- **tfMPTCanEscrow** (8) — the token can be deposited into escrows.
- **tfMPTCanTrade** (16) — the token can be traded on the DEX (still unused in the offer code).
- **tfMPTCanTransfer** (32) — holders can send the token to each other. Without it, it only moves between issuer and holder.
- **tfMPTCanClawback** (64) — the issuer can claw back units with [Clawback](/tx/Clawback).
- **tfMPTCanHoldConfidentialBalance** (128) — encrypted balances; requires `ConfidentialTransfer`, not active on testnet.

The flags are stored on the object as `lsfMPT*` with the same values.

## Common errors

- **temMALFORMED** — `TransferFee` without `tfMPTCanTransfer`, empty or too-long metadata, `MaximumAmount` of 0.
- **temBAD_TRANSFER_FEE** — fee greater than 50000.
- **temDISABLED** — you used `DomainID`, `ImmutableFlags` or flag 128 on testnet.
- **tecINSUFFICIENT_RESERVE** — you don't have 0.2 XRP free for the new object.

## Example

```json
{
  "TransactionType": "MPTokenIssuanceCreate",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "AssetScale": 2,
  "MaximumAmount": "100000000",
  "TransferFee": 100,
  "Flags": 32,
  "MPTokenMetadata": "7B226E616D65223A2244656D6F227D"
}
```

The metadata is `{"name":"Demo"}`. Add `64` to `Flags` if you want to allow clawback, or `4` to require authorization.

## Try it on testnet

1. Load the example and send. In the result look for `mpt_issuance_id` (the node adds it to the metadata) or the `CreatedNode` of type `MPTokenIssuance`.
2. Query `account_objects` with `type: "mpt_issuance"`: you'll see the issuance with `OutstandingAmount: "0"`, `Flags: 32` and your fields. `OwnerCount` has increased by 1.
3. From the other account, send [MPTokenAuthorize](/tx/MPTokenAuthorize) with that `MPTokenIssuanceID` to create its `MPToken`.
4. From your account, send a [Payment](/tx/Payment) with `Amount: { "mpt_issuance_id": "…", "value": "1000" }` to the other account. `OutstandingAmount` becomes 1000.
5. Try adding `"DomainID"` or `Flags: 160`: the node responds `temDISABLED`.

## Related

- [MPTokenIssuanceSet](/tx/MPTokenIssuanceSet), [MPTokenIssuanceDestroy](/tx/MPTokenIssuanceDestroy), [MPTokenAuthorize](/tx/MPTokenAuthorize), [Payment](/tx/Payment), [Clawback](/tx/Clawback)
- [MPTokenIssuance](/objects/MPTokenIssuance), [MPToken](/objects/MPToken)
- [MPTokensV1](/amendments/MPTokensV1), [DynamicMPT](/amendments/DynamicMPT), [ConfidentialTransfer](/amendments/ConfidentialTransfer), [SingleAssetVault](/amendments/SingleAssetVault)
