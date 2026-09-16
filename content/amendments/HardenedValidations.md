---
title: HardenedValidations
summary: Hardens the format of UNL validator validation messages, adding diagnostic fields and network protections.
xrplDocs: https://xrpl.org/resources/known-amendments#hardenedvalidations
---

## What changes

Network validators publish "validation" messages for each proposed ledger, and those messages are the basis of consensus: when enough validators from a node's UNL validate the same ledger, that node considers it final. HardenedValidations extends the format of those messages with additional diagnostic fields, including a `Cookie` (an identifier that helps detect whether a validator is running multiple instances with the same key, which is improper) and the `ServerVersion` of the software emitting the validation, useful for monitoring which rippled versions the network is running.

The amendment also hardens the validation rules for those messages themselves: fields with incorrect format or inconsistencies that used to be tolerated are now rejected, reducing the attack surface for malformed or manipulated validation messages that could be used to confuse the consensus mechanism.

## Affected transactions and objects

It does not affect any user transaction or ledger object. It is a change to the peer-to-peer protocol for validation messages between validator nodes, invisible to whoever builds or sends transactions on XRPL.

## Status and context

It was introduced as part of the ongoing effort to harden rippled's consensus layer: the more diagnostic fields a validation carries, the easier it is for validator operators and monitoring tools to detect misconfigurations (such as the same validator key running on two servers at once) before they affect network security. Since it is purely internal to the consensus protocol between servers, it does not change the format of any transaction or the behavior visible from a client application.
