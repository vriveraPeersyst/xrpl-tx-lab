---
title: fixSTAmountCanonicalize
summary: Fixes an edge case in STAmount canonicalization that could cause overflow when deserializing valid amounts.
xrplDocs: https://xrpl.org/resources/known-amendments#fixstamountcanonicalize
---

## What changes

`STAmount` is the internal type rippled uses to represent XRP or issued token amounts, storing mantissa and exponent separately for IOU amounts. When a value is deserialized, it is "canonicalized": the mantissa is normalized to the expected range by adjusting the exponent accordingly. Before this fix, in extreme cases that adjustment could cause a valid serialized amount to overflow during deserialization, instead of being reconstructed correctly.

With fixSTAmountCanonicalize enabled, the canonicalization logic fixes that edge case, so valid amounts no longer overflow when read back from their serialized form.

## Affected transactions and objects

- Any transaction with Amount-type fields in issued tokens (for example [Payment](/tx/Payment), [OfferCreate](/tx/OfferCreate), [TrustSet](/tx/TrustSet)): deserialization of those fields goes through `STAmount::canonicalize`.
- Ledger objects that store balances or limits in issued tokens, such as [RippleState](/objects/RippleState).

## Status and context

This is a low-level fix to the data type that represents all token amounts in the protocol: it fixes a serialization edge case, not a business rule. Without it, certain extreme but legitimate values could fail to be reconstructed instead of being processed normally.
