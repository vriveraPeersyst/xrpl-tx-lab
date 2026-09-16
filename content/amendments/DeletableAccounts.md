---
title: DeletableAccounts
summary: Allows accounts to be deleted with AccountDelete and changes the initial Sequence of new accounts to prevent replays.
xls: XLS-0007
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0007-deletable-accounts
xrplDocs: https://xrpl.org/resources/known-amendments#deletableaccounts
introducedIn: 1.4.0
---

## What changes

Adds `AccountDelete`, which removes the `AccountRoot` and sends the remaining XRP to another account. The transaction costs at least the incremental owner reserve (not the base fee) and requires that the account have no objects that cannot be deleted automatically: escrows, payment channels, checks or NFT pages block it with `tecHAS_OBLIGATIONS`, and an account with more than 1000 objects returns `tefTOO_BIG`. There is also a waiting period: the account cannot be deleted if `Sequence + 256 > current ledger` (`tecTOO_SOON`).

The second change is more subtle: new accounts no longer start with `Sequence = 1`, but with the index of the ledger in which they are created. This way, if an account is deleted and recreated, no old transaction signed with low sequence numbers can be applied again.

## Affected transactions and objects

- New: [AccountDelete](/tx/AccountDelete).
- Modified: [Payment](/tx/Payment) assigns the new initial `Sequence` when creating accounts.
- Objects: [AccountRoot](/objects/AccountRoot), the owner's [DirectoryNode](/objects/DirectoryNode), and deletable objects such as [RippleState](/objects/RippleState), [Offer](/objects/Offer), [SignerList](/objects/SignerList), [Ticket](/objects/Ticket) and [DepositPreauth](/objects/DepositPreauth).

## Status and context

Until 2020, an XRPL account was permanent: the base reserve remained locked forever and the ledger state could only grow. XLS-7 allowed most of the reserve to be recovered (one owner reserve unit is burned as a cost) and set the sequence rule so that deletion would not open replay attacks. Later amendments have expanded the list of objects that get deleted or that prevent deletion (for example `fixNFTokenReserve`, [DID](/amendments/DID) or [Credentials](/amendments/Credentials)). Retired in rippled: it is part of the base protocol.
