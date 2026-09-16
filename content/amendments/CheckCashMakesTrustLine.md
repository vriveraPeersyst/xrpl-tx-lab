---
title: CheckCashMakesTrustLine
summary: CheckCash automatically creates the trust line needed to cash a check for an issued token, without a prior TrustSet.
xrplDocs: https://xrpl.org/resources/known-amendments#checkcashmakestrustline
introducedIn: 1.8.0
---

## What changes

When you cash a [Check](/objects/Check) for an issued token and you don't yet have a trust line with the issuer, `CheckCash` creates one for you with a limit of 0, just as `OfferCreate` does when you buy a token on the DEX. Previously, cashing the check failed with `tecNO_LINE` and you had to send a separate `TrustSet`.

The automatic trust line counts as an object owned by the recipient, so you must cover the additional owner reserve; otherwise `CheckCash` fails with `tecNO_LINE_INSUF_RESERVE`. Checks in XRP are not affected.

## Affected transactions and objects

- Modified: [CheckCash](/tx/CheckCash).
- Objects: can create a [RippleState](/objects/RippleState) when settling a [Check](/objects/Check).

## Status and context

Checks were designed as a form of "deferred payment" in which the recipient decides when to cash it. Requiring a trust line to be set up before cashing it broke that idea, especially for users receiving a token for the first time. This change aligns `CheckCash` with DEX behavior: accepting an asset implies consent to hold the line. It remains impossible to force anyone to receive a token they don't want, because cashing is always initiated by the recipient.

This amendment is retired in rippled: its behavior is part of the base protocol and can no longer be disabled.
