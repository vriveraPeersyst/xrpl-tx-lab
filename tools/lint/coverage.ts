/**
 * Lint de cobertura: garantiza que TODO lo que existe en el xrpld de testnet
 * (server_definitions) y en el código fuente de rippled tiene UI/UX y documentación
 * completa en esta web. Falla (exit 1) si falta algo.
 *
 * Comprueba:
 *   1. Cada TransactionType de testnet tiene: entrada en protocol.json, doc en content/tx/<Name>.md
 *      (con frontmatter completo), entrada en el registro de UI (src/lib/tx/registry.ts) con ejemplo.
 *   2. Cada LedgerEntryType de testnet tiene doc en content/objects/<Name>.md.
 *   3. Cada amendment de testnet tiene doc en content/amendments/<Name>.md.
 *   4. Cada tipo serializado (TYPES) usado por algún campo de transacción tiene renderer en el form engine.
 *   5. Cada flag (tf, asf, lsf) de testnet tiene descripción en content/flags.json.
 *   6. Cada código TER de testnet tiene descripción (rippled) o entrada en content/results.json.
 *   7. Divergencias fuente ↔ testnet (versión, tipos, campos, TER) → aviso (no error) para que el sync las vea.
 *
 * Uso: pnpm lint:coverage  [--json]  [--strict  (avisos también fallan)]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const args = new Set(process.argv.slice(2));
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const protocol = readJson("src/data/protocol.json");
const testnet = readJson("src/data/testnet.json");
const defs = testnet.definitions;

const errors: string[] = [];
const warnings: string[] = [];
const report = { missingTxDocs: [] as string[], missingObjectDocs: [] as string[], missingAmendmentDocs: [] as string[], missingRegistry: [] as string[], missingRenderers: [] as string[], missingFlagDocs: [] as string[], missingResultDocs: [] as string[], sourceAhead: [] as string[], testnetAhead: [] as string[] };

const PSEUDO = new Set(["EnableAmendment", "SetFee", "UNLModify"]);
const SKIP_TX = new Set(["Invalid"]);
const SKIP_LE = new Set(["Invalid", "Any", "Child"]);

function frontmatter(file: string): Record<string, string> | undefined {
  if (!fs.existsSync(file)) return undefined;
  const txt = fs.readFileSync(file, "utf8");
  const m = txt.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (mm) out[mm[1]] = mm[2].trim();
  }
  out.__body = txt.slice(m[0].length).trim();
  return out;
}

// ---------- 1. Transacciones ----------
const txNames = Object.keys(defs.TRANSACTION_TYPES).filter((n) => !SKIP_TX.has(n)).sort();
const registrySrc = fs.existsSync(path.join(ROOT, "src/lib/tx/registry.ts")) ? fs.readFileSync(path.join(ROOT, "src/lib/tx/registry.ts"), "utf8") : "";
const registryKeys = new Set([...registrySrc.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((m) => m[1]));
const srcTx = new Map<string, any>(protocol.transactions.map((t: any) => [t.name, t]));

for (const name of txNames) {
  if (!srcTx.has(name)) { errors.push(`tx ${name}: existe en testnet pero no en protocol.json (¿fuente de rippled desactualizada?)`); report.testnetAhead.push(`tx:${name}`); }
  const fm = frontmatter(path.join(ROOT, `content/tx/${name}.md`));
  if (!fm) { errors.push(`tx ${name}: falta content/tx/${name}.md`); report.missingTxDocs.push(name); }
  else {
    for (const k of ["title", "summary", "category"]) if (!fm[k]) errors.push(`tx ${name}: frontmatter sin "${k}"`);
    if ((fm.__body ?? "").length < 200) errors.push(`tx ${name}: doc demasiado corta (<200 caracteres)`);
  }
  if (!PSEUDO.has(name) && !registryKeys.has(name)) { errors.push(`tx ${name}: falta en src/lib/tx/registry.ts (ejemplo/UI)`); report.missingRegistry.push(name); }
}
for (const t of protocol.transactions) if (!(t.name in defs.TRANSACTION_TYPES)) { warnings.push(`tx ${t.name}: existe en la fuente (${protocol.source.version}) pero aún no en testnet (${testnet.buildVersion})`); report.sourceAhead.push(`tx:${t.name}`); }

// Campos: fuente vs testnet
for (const name of txNames) {
  const t = srcTx.get(name);
  if (!t) continue;
  const tn = new Map<string, boolean>((defs.TRANSACTION_FORMATS[name] ?? []).map((f: any) => [f.name, f.optionality === 0]));
  const sc = new Map<string, boolean>(t.fields.map((f: any) => [f.name, f.optionality === "required"]));
  for (const [f] of sc) if (!tn.has(f)) { warnings.push(`tx ${name}.${f}: campo en la fuente pero no en testnet`); report.sourceAhead.push(`field:${name}.${f}`); }
  for (const [f] of tn) if (!sc.has(f)) { errors.push(`tx ${name}.${f}: campo en testnet pero no en la fuente`); report.testnetAhead.push(`field:${name}.${f}`); }
}

// ---------- 2. Ledger entries ----------
const leNames = Object.keys(defs.LEDGER_ENTRY_TYPES).filter((n) => !SKIP_LE.has(n)).sort();
const srcLe = new Set(protocol.ledgerEntries.map((e: any) => e.name));
for (const name of leNames) {
  if (!srcLe.has(name)) { errors.push(`objeto ${name}: en testnet pero no en protocol.json`); report.testnetAhead.push(`le:${name}`); }
  const fm = frontmatter(path.join(ROOT, `content/objects/${name}.md`));
  if (!fm) { errors.push(`objeto ${name}: falta content/objects/${name}.md`); report.missingObjectDocs.push(name); }
  else if (!fm.title || !fm.summary) errors.push(`objeto ${name}: frontmatter incompleto`);
}

// ---------- 3. Amendments ----------
for (const a of testnet.amendments) {
  const fm = frontmatter(path.join(ROOT, `content/amendments/${a.name}.md`));
  if (!fm) { errors.push(`amendment ${a.name}: falta content/amendments/${a.name}.md`); report.missingAmendmentDocs.push(a.name); }
  else if (!fm.title || !fm.summary) errors.push(`amendment ${a.name}: frontmatter incompleto`);
}
const tnAmend = new Set(testnet.amendments.map((a: any) => a.name));
for (const f of protocol.features) if (!f.retired && !tnAmend.has(f.name)) { warnings.push(`amendment ${f.name}: en la fuente pero no en testnet (Supported::${f.supported ? "Yes" : "No"})`); report.sourceAhead.push(`amendment:${f.name}`); }

// ---------- 4. Renderers por tipo ----------
const renderersSrc = fs.existsSync(path.join(ROOT, "src/lib/form/renderers.tsx")) ? fs.readFileSync(path.join(ROOT, "src/lib/form/renderers.tsx"), "utf8") : "";
const renderers = new Set([...renderersSrc.matchAll(/^\s{2}(\w+):\s*(?:\(|\w)/gm)].map((m) => m[1]));
const typesUsed = new Set<string>();
for (const name of txNames) for (const f of defs.TRANSACTION_FORMATS[name] ?? []) typesUsed.add(defs.FIELDS[f.name]?.type ?? "?");
for (const t of [...typesUsed].sort()) if (!renderers.has(t)) { errors.push(`form engine: sin renderer para el tipo ${t}`); report.missingRenderers.push(t); }

// ---------- 5. Flags ----------
const flagDocs = fs.existsSync(path.join(ROOT, "content/flags.json")) ? readJson("content/flags.json") : {};
const allFlags: string[] = [];
for (const [tx, flags] of Object.entries<Record<string, number>>(defs.TRANSACTION_FLAGS)) for (const f of Object.keys(flags)) allFlags.push(`${tx}.${f}`);
for (const f of Object.keys(defs.ACCOUNT_SET_FLAGS)) allFlags.push(`AccountSet.${f}`);
for (const [le, flags] of Object.entries<Record<string, number>>(defs.LEDGER_ENTRY_FLAGS)) for (const f of Object.keys(flags)) allFlags.push(`${le}.${f}`);
for (const key of allFlags) { const [, f] = key.split("."); if (!flagDocs[key] && !flagDocs[f]) { errors.push(`flag ${key}: sin descripción en content/flags.json`); report.missingFlagDocs.push(key); } }

// ---------- 6. Resultados TER ----------
const resultDocs = fs.existsSync(path.join(ROOT, "content/results.json")) ? readJson("content/results.json") : {};
const srcResults = new Map<string, any>(protocol.results.map((r: any) => [r.code, r]));
for (const code of Object.keys(defs.TRANSACTION_RESULTS)) {
  const r = srcResults.get(code);
  if (!r) { errors.push(`TER ${code}: en testnet pero no en la fuente`); report.testnetAhead.push(`ter:${code}`); continue; }
  if (!r.description && !resultDocs[code]) { errors.push(`TER ${code}: sin descripción (ni rippled ni content/results.json)`); report.missingResultDocs.push(code); }
}
for (const r of protocol.results) if (!(r.code in defs.TRANSACTION_RESULTS)) { warnings.push(`TER ${r.code}: en la fuente pero no en testnet`); report.sourceAhead.push(`ter:${r.code}`); }

// ---------- 7. Versión ----------
if (protocol.source.version !== testnet.buildVersion) warnings.push(`versión: fuente rippled ${protocol.source.version} (${protocol.source.commit?.slice(0, 8)}) vs testnet ${testnet.buildVersion}`);

// ---------- salida ----------
const summary = { ok: errors.length === 0 && (!args.has("--strict") || warnings.length === 0), errors, warnings, report, testnet: { version: testnet.buildVersion, ledger: testnet.validatedLedger?.seq, fetchedAt: testnet.fetchedAt }, source: protocol.source };
if (args.has("--json")) console.log(JSON.stringify(summary, null, 2));
else {
  for (const w of warnings) console.log(`⚠  ${w}`);
  for (const e of errors) console.log(`✖  ${e}`);
  console.log(`\nCobertura: ${txNames.length} tx, ${leNames.length} objetos, ${testnet.amendments.length} amendments, ${allFlags.length} flags, ${Object.keys(defs.TRANSACTION_RESULTS).length} TER → ${errors.length} errores, ${warnings.length} avisos`);
}
fs.mkdirSync(path.join(ROOT, "src/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src/data/coverage.json"), JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
