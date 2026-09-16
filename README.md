# XRPL Tx Lab

Web educativa sobre la **XRPL Testnet**: todos los tipos de transacción, objetos del ledger,
amendments, flags, campos y códigos de resultado, explicados a partir del **código fuente de
xrpld** (la versión que corre en testnet) y ejecutables desde la propia página con **Xaman**.

## Cómo funciona

```
vendor/rippled  ──extract──▶  src/data/protocol.json   (campos, transactores, TER, flags, amendments…)
XRPL Testnet    ──snapshot─▶  src/data/testnet.json    (server_definitions + feature: la verdad viva)
content/**.md   ──lint─────▶  src/data/coverage.json   (¿todo tiene doc y UI?)  → falla el build si no
```

- `tools/extract/extract.ts` parsea `transactions.macro`, `ledger_entries.macro`, `features.macro`,
  `sfields.macro`, `permissions.macro`, `TxFlags.h`, `LedgerFormats.h`, `TER.h/.cpp`,
  `InnerObjectFormats.cpp`, `TxFormats.cpp` y cada transactor (`preflight`/`preclaim`/`doApply`:
  códigos TER, amendments consultados, flags y campos).
- `tools/extract/testnet.ts` guarda `server_info`, `feature` y `server_definitions` de testnet.
- `tools/lint/coverage.ts` exige, para todo lo que exista en testnet: doc en `content/`, entrada en
  `src/lib/tx/registry.ts` (ejemplo + pistas), renderer por tipo de campo, descripción de cada flag y
  de cada TER. Avisa (sin fallar) de las divergencias fuente ↔ testnet.
- `tools/sync/sync.ts` hace todo lo anterior en cadena, alinea `vendor/rippled` con la versión de
  testnet (tag exacto o `develop`), genera docs para lo nuevo (con `claude -p` si está disponible,
  si no un stub `draft: true`) y hace commit/push.

## Arranque

```bash
pnpm install
pnpm rippled:fetch          # clona XRPLF/rippled (develop) en vendor/rippled
pnpm testnet:snapshot       # src/data/testnet.json
pnpm extract                # src/data/protocol.json
pnpm lint:coverage          # cobertura
cp .env.local.example .env.local   # y pon NEXT_PUBLIC_XAMAN_API_KEY
pnpm dev
```

Xaman: crea una app en https://apps.xaman.dev (tipo *browser / web3 PKCE*), añade el origen de la
web y usa su API key pública. Todo payload se fuerza a `TESTNET`.

## Actualización automática (Mac mini)

Mismo patrón que `qwen-onehextwo`: job one-shot con pm2 y `cron_restart`.

```bash
pm2 start ecosystem.config.cjs   # xrpl-tx-lab-sync, 12:00 Europe/Madrid
pm2 save
pm2 logs xrpl-tx-lab-sync
pnpm sync                        # ejecución manual (SYNC_NO_GIT=1 para no commitear)
```

## Contenido

`content/GUIDE.md` define el formato de `content/tx/*.md`, `content/objects/*.md`,
`content/amendments/*.md` y `content/flags.json`. La UI genera automáticamente tablas de campos,
flags, TER y amendments; el markdown aporta la explicación.
