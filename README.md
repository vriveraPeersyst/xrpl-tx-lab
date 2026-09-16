# XRPL Tx Lab

Educational website about the **XRPL Testnet**: all transaction types, ledger objects,
amendments, flags, fields and result codes, explained from the **xrpld source code**
(the version running on testnet) and executable from the page itself with **Xaman**.

## How it works

```
vendor/rippled  ──extract──▶  src/data/protocol.json   (fields, transactors, TER, flags, amendments…)
XRPL Testnet    ──snapshot─▶  src/data/testnet.json    (server_definitions + feature: the live truth)
content/**.md   ──lint─────▶  src/data/coverage.json   (does everything have docs and UI?)  → fails the build if not
```

- `tools/extract/extract.ts` parses `transactions.macro`, `ledger_entries.macro`, `features.macro`,
  `sfields.macro`, `permissions.macro`, `TxFlags.h`, `LedgerFormats.h`, `TER.h/.cpp`,
  `InnerObjectFormats.cpp`, `TxFormats.cpp` and each transactor (`preflight`/`preclaim`/`doApply`:
  TER codes, amendments checked, flags and fields).
- `tools/extract/testnet.ts` saves `server_info`, `feature` and `server_definitions` from testnet.
- `tools/lint/coverage.ts` requires, for everything that exists in testnet: a doc in `content/`, an
  entry in `src/lib/tx/registry.ts` (example + hints), a renderer per field type, a description for
  every flag and every TER. It warns (without failing) about source ↔ testnet divergences.
- `tools/sync/sync.ts` does all of the above in a chain, aligns `vendor/rippled` with the testnet
  version (exact tag or `develop`), generates docs for anything new (with `claude -p` if available,
  otherwise a `draft: true` stub) and commits/pushes.

## Getting started

```bash
pnpm install
pnpm rippled:fetch          # clones XRPLF/rippled (develop) into vendor/rippled
pnpm testnet:snapshot       # src/data/testnet.json
pnpm extract                # src/data/protocol.json
pnpm lint:coverage          # coverage check
cp .env.local.example .env.local   # and set NEXT_PUBLIC_XAMAN_API_KEY
pnpm dev
```

Xaman: create an app at https://apps.xaman.dev (type *browser / web3 PKCE*), add the site's
origin and use its public API key. Every payload is forced to `TESTNET`.

## Automatic updates (Mac mini)

Same pattern as `qwen-onehextwo`: a one-shot job with pm2 and `cron_restart`.

```bash
pm2 start ecosystem.config.cjs   # xrpl-tx-lab-sync, 12:00 Europe/Madrid
pm2 save
pm2 logs xrpl-tx-lab-sync
pnpm sync                        # manual run (SYNC_NO_GIT=1 to skip committing)
```

## Content

`content/GUIDE.md` defines the format of `content/tx/*.md`, `content/objects/*.md`,
`content/amendments/*.md` and `content/flags.json`. The UI automatically generates tables of
fields, flags, TER and amendments; the markdown provides the explanation.
