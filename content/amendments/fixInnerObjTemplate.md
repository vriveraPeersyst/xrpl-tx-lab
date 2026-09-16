---
title: fixInnerObjTemplate
summary: Fixes the creation of inner objects (nested STObjects) so they correctly apply their field template, specifically in the AMM auction slot.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinnerobjtemplate
---

## What changes

Several ledger objects contain nested inner objects (an `STObject` inside another `STObject`), such as `AuctionSlot` or `VoteEntry` in an [AMM](/objects/AMM), or `SignerEntry`, `Majority`, and `DisabledValidator` in other contexts. Each of these inner objects has a template (`SOTemplate`) defining which fields are required, optional, or carry a default value.

Before the fix, when a new inner object was constructed its template was not always applied, which could leave fields with a default value unset — for example `sfTradingFee` or `sfDiscountedFee` in an AMM's auction slot — and cause errors when trying to read them. `fixInnerObjTemplate` adds an `STObject` constructor that applies the corresponding template (`STObject::makeInnerObject`) when creating these inner objects, ensuring that fields with default values are initialized from the start.

It was the first of two fixes for the same problem: the later `fixInnerObjTemplate2` extends template application to the remaining inner objects left out of this first fix.

## Affected transactions and objects

- [AMM](/objects/AMM): inner `AuctionSlot` and `VoteEntry` fields.
- Indirectly, any transactor that builds or reads these inner objects, such as those related to AMM.

## Status and context

This is a targeted fix to `STObject`/`InnerObjectFormats`: it does not add new functionality, it corrects inner objects to behave as their template requires from creation, avoiding inconsistent states or exceptions when accessing uninitialized default-value fields. The amendment is already retired in the code (`XRPL_RETIRE_FIX`): the corrected behavior is now the only one that exists, with no alternative branch.
