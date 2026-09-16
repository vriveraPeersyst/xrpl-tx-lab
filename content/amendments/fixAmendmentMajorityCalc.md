---
title: fixAmendmentMajorityCalc
summary: Fixes the calculation of the 80% majority in amendment voting, which could be accepted with slightly less than 80%.
xrplDocs: https://xrpl.org/resources/known-amendments#fixamendmentmajoritycalc
introducedIn: 1.7.0
---

## What changes

An amendment is activated when at least 80% of trusted validators support it continuously for two weeks. The code that decided whether that majority had been reached made the comparison using an integer division that rounded incorrectly: with certain UNL sizes, support slightly below 80% (for example 79.9%) was enough for the amendment to obtain a majority and, two weeks later, become activated.

fixAmendmentMajorityCalc changes the formula so that the threshold is exactly "at least 80%", with no margin from rounding.

## Affected transactions and objects

- [EnableAmendment](/tx/EnableAmendment): the pseudo-transaction that records `tfGotMajority`, `tfLostMajority`, and the final activation is emitted by the system based on this calculation.
- [Amendments](/objects/Amendments): the singleton ledger object where ongoing majorities (`Majorities`) and active amendments are recorded.

## Status and context

It was introduced in rippled 1.7.0 and is retired in the current code (`XRPL_RETIRE_FIX(AmendmentMajorityCalc)`). It is a governance fix: it does not touch user transactions, but since it alters when any other amendment gets activated, it had to be activated itself through the same procedure so that all validators used the same rule at the same time. In this site's UI, the voting status you see for each amendment is calculated using this corrected rule.
