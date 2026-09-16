---
title: MultiSignReserve
summary: Reduces the owner reserve cost of creating a SignerList, charging a fixed 1 unit instead of 2 plus one per signer.
xrplDocs: https://xrpl.org/resources/known-amendments#multisignreserve
introducedIn: 1.3.0
---

## What changes

Before this amendment, `SignerListSet` calculated the `OwnerCount` added based on the number of signers: creating the list cost 2 base units plus 1 unit per `SignerEntries` entry, with a minimum of 3 units for a list of 1 signer and up to 10 for the maximum of 8 signers. Each `OwnerCount` unit locks a full owner reserve, so setting up multisigning with several signers could tie up several times the base reserve just for the signer list.

With MultiSignReserve active, creating a `SignerList` always costs 1 unit of `OwnerCount`, regardless of how many signers it contains. The object is marked with the `lsfOneOwnerCount` flag; when the list is deleted, the transactor checks that flag to decide how to release the reserve: if present, it subtracts 1 unit; if not (lists created before the amendment), it applies the old calculation based on the number of signers that remained. The function that performs that legacy calculation, `signerCountBasedOwnerCountDelta`, is kept in the code only to support those legacy lists.

## Affected transactions and objects

- [SignerListSet](/tx/SignerListSet): calculates and applies the new 1-`OwnerCount` cost when creating the list.
- [SignerList](/objects/SignerList): incorporates the `lsfOneOwnerCount` flag that marks lists created under the new rule.
- [AccountRoot](/objects/AccountRoot): its `OwnerCount` and, consequently, the owner reserve required of the account, are reduced.

## Status and context

Before this change, an account that wanted to protect its funds with multisigning paid a reserve penalty proportional to the number of signers, which discouraged more robust security configurations (for example, 5-of-9 signers) in favor of small lists. The amendment decouples the reserve cost from the size of the signer list, leaving only the fixed cost of having the object on the ledger, making it more affordable to use multisigning with high security thresholds.
