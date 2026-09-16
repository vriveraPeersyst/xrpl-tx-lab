---
title: DIDSet
summary: Creates or updates an account's decentralized identifier (DID).
category: identidad
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/didset
amendment: DID
level: basic
---

## What it does

`DIDSet` publishes or updates the [DID](/objects/DID) object associated with your account: at most one per account, in the form `did:xrpl:1:<your-address>`. It's the XRPL's implementation of the W3C decentralized identifiers (DID) standard: an identifier you control, without depending on a central registrar, to which you can anchor a DID document, a URI to external documentation, or arbitrary data.

Think of it as a minimal ID card living in your account: it doesn't by itself contain any verified claim (that's provided by the [Credential](/objects/Credential) objects from the [Credentials](/amendments/Credentials) amendment), but it gives a stable root to link that information to. The first time you send `DIDSet` it creates the object; subsequent times it updates it field by field.

## When to use it

- Publishing a complete DID document (`DIDDocument`) following the W3C specification, so external applications can resolve it.
- Pointing with `URI` to a DID document hosted off-chain (IPFS, your own server) instead of embedding it.
- Storing arbitrary `Data` linked to your on-chain identity (attestations, organizational metadata).
- Laying the identity foundation before issuing or receiving [Credential](/objects/Credential) objects.

## How it works inside

**`DIDSet::preflight`** requires at least one of `URI`, `DIDDocument`, or `Data` to be present; if none is, `temEMPTY_DID`. If all three fields are present but all empty, also `temEMPTY_DID`. Each field has its own length limit; exceeding it gives `temMALFORMED`.

**`DIDSet::doApply`** distinguishes two paths. If a `DID` already exists for your account, it updates it: for each field (`URI`, `DIDDocument`, `Data`) you send empty, it removes it from the object; if you send it with content, it overwrites it; if you don't send it, it leaves it as is. With [fixEmptyDID](/amendments/fixEmptyDID) active, if the resulting update leaves the object with no fields at all, it fails with `tecEMPTY_DID` instead of leaving an empty DID on the ledger. If it didn't exist, it creates the object: it checks that your account has sufficient reserve for one more object (`tecINSUFFICIENT_RESERVE` if not), inserts it into your owner directory, and increases your owner count by 1.

## Key fields

- **DIDDocument** — hex of the complete DID document, following the W3C format. Intended for small documents; for large documents use `URI`.
- **URI** — hex of an address (IPFS, HTTPS...) where the DID document is hosted off-chain.
- **Data** — free-form hex for any additional data you want to associate with your identity (attestations, metadata).

All three are individually optional, but at least one must have content in every `DIDSet` (whether creating it, or, after an update, in the final result).

## Common errors

- **temEMPTY_DID** — you didn't include any field with content, or all three are empty.
- **tecEMPTY_DID** — an update that clears all existing fields would leave the DID empty; add or keep at least one.
- **temMALFORMED** — some field exceeds its maximum length.
- **tecINSUFFICIENT_RESERVE** — you don't have XRP above the reserve to create the `DID` object (only applies the first time).
- **tecDIR_FULL** — your owner directory is at its limit (very rare in practice).

## Example

```json
{
  "TransactionType": "DIDSet",
  "Account": "rXXXX_YOUR_ACCOUNT",
  "URI": "697066733A2F2F6578616D706C65",
  "Data": "7B7D"
}
```

Creates (or updates) your DID, pointing with `URI` to an IPFS resource and with `Data` to an example empty JSON object.

## Try it on testnet

1. Sign and send the example as-is.
2. Query `account_objects` with `type: "did"` on your account: you'll see the `DID` object with `URI` and `Data` decodable from hex.
3. Send a second `DIDSet` changing only `Data` (without repeating `URI`): check that `URI` stays the same and `Data` gets updated.
4. Send a third `DIDSet` with `URI: ""` and no other fields: if it's the only field present in the object, it will fail with `tecEMPTY_DID`.
5. Delete the object with [DIDDelete](/tx/DIDDelete) and confirm with `account_objects` that it no longer appears.

## Related

- [DIDDelete](/tx/DIDDelete) — deletes the DID.
- [CredentialCreate](/tx/CredentialCreate) — adds verifiable claims that can be linked to your identity.
- [AccountDelete](/tx/AccountDelete) — requires deleting the DID before removing the account.
- Objects: [DID](/objects/DID).
- Amendments: [DID](/amendments/DID).
