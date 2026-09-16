# Content writing guide (content/)

This site is educational: every page must let someone who doesn't know the XRPL understand
**what** a transaction or object does, **when to use it**, **what can go wrong**, and **how
to try it on testnet** from the page's own builder. Everything in **English**, with
correct spelling and grammar. Technical identifiers (field names, flags,
TER codes, amendment names) are left in English exactly as they appear in rippled.

## Sources of truth, in order

1. `src/data/testnet.json` → what exists TODAY on testnet (types, fields, flags, TER, active amendments).
2. `src/data/protocol.json` → how it works (fields with optionality, transactor: TER by phase,
   amendments consulted, flags, privileges, delegability). Extracted from the code.
3. `vendor/rippled/src/libxrpl/tx/transactors/**` → the actual code. Read it to explain rules
   (preflight = static validation, preclaim = validation against the ledger, doApply = effects).
4. Documentation: https://xrpl.org/docs/references/protocol/transactions/types/<lowercase-name>
   and the XLS at https://github.com/XRPLF/XRPL-Standards (useful for understanding; NOT the source
   of truth if they contradict the code).

What the UI already generates automatically from protocol.json (do NOT repeat it in the markdown):
a table of fields with types/optionality, the list of flags with hex values, the full list of
TER codes the transactor returns, amendments consulted, and links to the source code.

## content/tx/<Name>.md

```
---
title: Payment
summary: Sends XRP, issued tokens, or MPT to another account, with routing (paths) and currency conversion.   # 1 sentence
category: pagos          # one of: cuenta | pagos | dex | tokens | nft | mpt | escrow | canales | cheques | multifirma | identidad | permisos | amm | puente | vault | prestamos | confidencial | batch | oraculos | sistema | otros
xrplDocs: https://xrpl.org/docs/references/protocol/transactions/types/payment
xls: XLS-0033   # optional, the XLS that introduced it (format XLS-00NN)
amendment: MPTokensV1   # optional, amendment that introduced the type (if applicable)
level: basic   # basic | intermediate | advanced
---

## What it does
2-4 clear paragraphs. An analogy if it helps. Which ledger objects it creates/modifies/deletes (link as [Escrow](/objects/Escrow)).

## When to use it
Real-world use cases, as bullet points.

## How it works internally
Explain the transactor's three phases with the relevant parts of the code: what `preflight`
validates (static), what `preclaim` checks against the ledger, what `doApply` does. Cite
concrete rules (e.g. "if the destination doesn't exist and Amount is XRP ≥ the base reserve, the account is created").
Mention which amendments change the behavior (link as [Credentials](/amendments/Credentials)).

## Key fields
Explain only the fields with non-obvious semantics (don't repeat the table). Use a `**Field** — explanation` list.

## Flags
Only if the type has flags: explain the effect of each one in a list. If not, omit this section.

## Common errors
The 4-8 most frequent TER codes with their cause and how to avoid them: `**tecNO_DST** — …`.

## Example
A complete, valid JSON for testnet inside ```json. It should match the `example` in the registry (src/lib/tx/registry.ts) or improve on it.

## Try it on testnet
Concrete (numbered) steps to try it with this page's builder and what to observe afterward
(e.g. "query account_objects and you'll see an Escrow object").

## Related
List of links to other tx/objects/amendments on this site.
```

Suggested length: 400-1200 words. Pseudo-types (EnableAmendment, SetFee, UNLModify)
are documented the same way but without "Try it": explain that the system issues them and they cannot be submitted.

## content/objects/<Name>.md

```
---
title: Escrow
summary: Holds XRP or tokens until a condition or a time is met.
xrplDocs: https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/escrow
createdBy: EscrowCreate          # tx that create it (comma-separated)
modifiedBy: EscrowFinish, EscrowCancel
reserve: 1                       # units of owner reserve it consumes (0 if it doesn't count)
---

## What it represents
## Lifecycle (which tx creates it, modifies it, deletes it; link to /tx/<Name>)
## Key fields (only non-obvious semantics)
## Flags (if it has lsf*)
## How to query it (RPC method: account_objects with type=..., ledger_entry with which parameters, example JSON response)
## Related
```

## content/amendments/<Name>.md

```
---
title: Credentials
summary: Adds verifiable on-chain credentials (CredentialCreate/Accept/Delete) and their use in DepositPreauth and payments.
xls: XLS-0070
xlsUrl: https://github.com/XRPLF/XRPL-Standards/tree/master/XLS-0070-credentials   # if it exists
xrplDocs: https://xrpl.org/resources/known-amendments#credentials
introducedIn: 2.3.0    # rippled version, if known
---

## What it changes
## Affected transactions and objects (links to /tx and /objects)
## Status and context (what it's for, why it was proposed; for fix*: what bug it fixes)
```

The status (active on testnet, voting, veto) is rendered by the UI from testnet.json; don't write it.
Length: 150-500 words. For `fix*`, 150 is enough.

## Style

- Clear, direct tone, second person ("you can", "you send").
- Short sentences. No filler, no marketing language.
- Exact numbers and units: drops vs XRP, Ripple Epoch seconds (2000-01-01) vs Unix.
- When citing code: path and function (`Payment::preclaim`), not line numbers.
- Don't invent fields or rules: if it's not in the code or in protocol.json, it doesn't exist.
