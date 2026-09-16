---
title: TickSize
summary: Allows an issuer to set TickSize in AccountSet to round the quality of offers on its token to a number of significant digits.
xrplDocs: https://xrpl.org/resources/known-amendments#ticksize
---

## What changes

Adds the `TickSize` field to [AccountSet](/tx/AccountSet): a token issuer can set between 3 and 15 significant digits (or 0 to disable it) as the precision with which the "quality" (the price, `TakerPays`/`TakerGets`) of offers involving its token is expressed in the order book. The value is stored in the issuer's `AccountRoot`.

When an offer crosses or is inserted into the book, the DEX engine rounds the offer's quality to the number of significant digits set by the `TickSize` of the token's issuer involved (if two tokens issued by different accounts with different `TickSize` values appear in the same offer, the more restrictive one, i.e. the one with fewer digits, is used). This groups together offers that would previously have had different prices due to minimal differences in the last decimal, within the same price "tick," so that they compete by arrival order instead of by insignificant price fractions.

## Affected transactions and objects

- [AccountSet](/tx/AccountSet): new `TickSize` field.
- [AccountRoot](/objects/AccountRoot): stores the `TickSize` configured by the issuer.
- [OfferCreate](/tx/OfferCreate): the offer's quality is rounded according to the token issuer's `TickSize` before being inserted into the order book.

## Status and context

Without a minimum tick, market makers can improve an existing offer by an arbitrarily small price difference (for example, one unit in the last representable decimal), which in practice amounts to a "penny war" that adds no real liquidity and clutters the order book with nearly identical offers competing for microscopic price advantages. Setting a reasonable `TickSize` forces a new offer to improve on the previous one by a significant price step in order to move ahead of it, which favors deeper, more stable order books for the issuer's token.
