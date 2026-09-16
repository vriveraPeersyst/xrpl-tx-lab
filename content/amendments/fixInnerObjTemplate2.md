---
title: fixInnerObjTemplate2
summary: Extends field template application at creation time to all remaining inner objects.
xrplDocs: https://xrpl.org/resources/known-amendments#fixinnerobjtemplate2
---

## What changes

`fixInnerObjTemplate` had already fixed template application for the inner objects of the AMM auction slot, but left out the rest of the inner objects with a registered template in `InnerObjectFormats` (for example `SignerEntry`, `Signer`, `Majority`, `DisabledValidator`, or `NFToken`). In `STObject::makeInnerObject`, the code only forced the template when no amendment rules were available or when the object was the AMM one; in all other cases, a newly created inner object could end up without its default fields (`SoeDefault`) set until they were explicitly assigned.

With `fixInnerObjTemplate2` active, `makeInnerObject` applies the corresponding template to any inner object with a registered format, not just AMM ones. This standardizes the behavior: every inner object is now created with its required and default fields correctly initialized according to its `SOTemplate`, avoiding inconsistent intermediate states that could cause exceptions when reading unset fields.

## Affected transactions and objects

- Inner objects defined in `InnerObjectFormats`: `SignerEntry` in [SignerListSet](/tx/SignerListSet) and [SignerList](/objects/SignerList), `Majority` and `DisabledValidator` in [Amendments](/objects/Amendments), `NFToken` in NFT pages, and the attestation entries in cross-chain bridges.

## Status and context

This is the second of two consecutive fixes for the same structural problem in `STObject`. It fixes a coverage gap left by the first fix: not all inner objects received the same treatment. The amendment is already retired in the code; universal template application to inner objects is now the only behavior.
