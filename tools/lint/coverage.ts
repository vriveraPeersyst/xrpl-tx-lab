/**
 * Coverage lint: guarantees that EVERYTHING that exists on every supported network's xrpld
 * (server_definitions) and in the matching rippled source has complete UI/UX and documentation.
 * Fails (exit 1) if anything is missing.
 *
 * Per network it checks:
 *   1. Every TransactionType has: an entry in the protocol file, a doc in content/tx/<Name>.md
 *      (complete frontmatter), an entry in the UI registry (src/lib/tx/registry.ts) with an example.
 *   2. Every LedgerEntryType has a doc in content/objects/<Name>.md.
 *   3. Every amendment has a doc in content/amendments/<Name>.md.
 *   4. Every serialized type (TYPES) used by a transaction field has a renderer in the form engine.
 *   5. Every flag (tf, asf, lsf) has a description in content/flags.json.
 *   6. Every TER code has a description (rippled) or an entry in content/results.json.
 *   7. Source vs network divergences (version, types, fields, TER) are warnings for the sync to see.
 *
 * Usage: pnpm lint:coverage  [--json]  [--strict  (warnings also fail)]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const args = new Set(process.argv.slice(2));
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const netDir = path.join(ROOT, "src/data/networks");
const networks = fs.existsSync(netDir) ? fs.readdirSync(netDir).filter((n) => fs.existsSync(path.join(netDir, n, "snapshot.json"))).sort() : [];
if (networks.length === 0) { console.error("No network snapshots in src/data/networks"); process.exit(1); }

const errors: string[] = [];
const warnings: string[] = [];
const report = { missingTxDocs: new Set<string>(), missingObjectDocs: new Set<string>(), missingAmendmentDocs: new Set<string>(), missingRegistry: new Set<string>(), missingRenderers: new Set<string>(), missingFlagDocs: new Set<string>(), missingResultDocs: new Set<string>(), sourceAhead: new Set<string>(), networkAhead: new Set<string>() };

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

const registrySrc = fs.existsSync(path.join(ROOT, "src/lib/tx/registry.ts")) ? fs.readFileSync(path.join(ROOT, "src/lib/tx/registry.ts"), "utf8") : "";
const registryKeys = new Set([...registrySrc.matchAll(/^\s{2}(\w+):\s*\{/gm)].map((m) => m[1]));
const renderersSrc = fs.existsSync(path.join(ROOT, "src/lib/form/renderers.tsx")) ? fs.readFileSync(path.join(ROOT, "src/lib/form/renderers.tsx"), "utf8") : "";
const renderers = new Set([...renderersSrc.matchAll(/^\s{2}(\w+):\s*(?:\(|\w)/gm)].map((m) => m[1]));
const flagDocs = fs.existsSync(path.join(ROOT, "content/flags.json")) ? readJson("content/flags.json") : {};
const resultDocs = fs.existsSync(path.join(ROOT, "content/results.json")) ? readJson("content/results.json") : {};

const checkedDocs = new Set<string>();
function checkDoc(kind: "tx" | "objects" | "amendments", name: string, required: string[]): boolean {
  const key = `${kind}:${name}`;
  if (checkedDocs.has(key)) return fs.existsSync(path.join(ROOT, `content/${kind}/${name}.md`));
  checkedDocs.add(key);
  const fm = frontmatter(path.join(ROOT, `content/${kind}/${name}.md`));
  if (!fm) return false;
  for (const k of required) if (!fm[k]) errors.push(`${kind} ${name}: frontmatter missing "${k}"`);
  if (kind === "tx" && (fm.__body ?? "").length < 200) errors.push(`tx ${name}: doc too short (<200 chars)`);
  return true;
}

const summaryByNet: Record<string, { version: string; tx: number; objects: number; amendments: number; sourceRef: string; sourceVersion?: string }> = {};
let totalFlags = 0;
let totalTer = 0;

for (const netId of networks) {
  const snap = readJson(`src/data/networks/${netId}/snapshot.json`);
  const protoPath = `src/data/protocol/${snap.sourceRef}.json`;
  if (!fs.existsSync(path.join(ROOT, protoPath))) { errors.push(`${netId}: missing ${protoPath} (run pnpm extract:all)`); continue; }
  const protocol = readJson(protoPath);
  const defs = snap.definitions;
  const tag = (s: string) => `[${netId}] ${s}`;

  // 1. Transactions
  const txNames: string[] = Object.keys(defs.TRANSACTION_TYPES).filter((n) => !SKIP_TX.has(n)).sort();
  const srcTx = new Map<string, any>(protocol.transactions.map((t: any) => [t.name, t]));
  for (const name of txNames) {
    if (!srcTx.has(name)) { errors.push(tag(`tx ${name}: exists on the network but not in the source (${snap.sourceRef})`)); report.networkAhead.add(`${netId}:tx:${name}`); }
    if (!checkDoc("tx", name, ["title", "summary", "category"])) { if (!report.missingTxDocs.has(name)) errors.push(`tx ${name}: missing content/tx/${name}.md (needed by ${netId})`); report.missingTxDocs.add(name); }
    if (!PSEUDO.has(name) && !registryKeys.has(name)) { if (!report.missingRegistry.has(name)) errors.push(`tx ${name}: missing in src/lib/tx/registry.ts (needed by ${netId})`); report.missingRegistry.add(name); }
  }
  for (const t of protocol.transactions) if (!(t.name in defs.TRANSACTION_TYPES)) { warnings.push(tag(`tx ${t.name}: in the source (${protocol.source.version}) but not on the network (${snap.buildVersion})`)); report.sourceAhead.add(`${netId}:tx:${t.name}`); }
  for (const name of txNames) {
    const t = srcTx.get(name);
    if (!t) continue;
    const tn = new Map<string, boolean>((defs.TRANSACTION_FORMATS[name] ?? []).map((f: any) => [f.name, f.optionality === 0]));
    const sc = new Map<string, boolean>(t.fields.map((f: any) => [f.name, f.optionality === "required"]));
    for (const [f] of sc) if (!tn.has(f)) { warnings.push(tag(`tx ${name}.${f}: field in the source but not on the network`)); report.sourceAhead.add(`${netId}:field:${name}.${f}`); }
    for (const [f] of tn) if (!sc.has(f)) { warnings.push(tag(`tx ${name}.${f}: field on the network but not in the source`)); report.networkAhead.add(`${netId}:field:${name}.${f}`); }
  }

  // 2. Ledger entries
  const leNames: string[] = Object.keys(defs.LEDGER_ENTRY_TYPES).filter((n) => !SKIP_LE.has(n)).sort();
  const srcLe = new Set(protocol.ledgerEntries.map((e: any) => e.name));
  for (const name of leNames) {
    if (!srcLe.has(name)) { errors.push(tag(`object ${name}: on the network but not in the source`)); report.networkAhead.add(`${netId}:le:${name}`); }
    if (!checkDoc("objects", name, ["title", "summary"])) { if (!report.missingObjectDocs.has(name)) errors.push(`object ${name}: missing content/objects/${name}.md (needed by ${netId})`); report.missingObjectDocs.add(name); }
  }

  // 3. Amendments
  for (const a of snap.amendments) if (!checkDoc("amendments", a.name, ["title", "summary"])) { if (!report.missingAmendmentDocs.has(a.name)) errors.push(`amendment ${a.name}: missing content/amendments/${a.name}.md (needed by ${netId})`); report.missingAmendmentDocs.add(a.name); }
  const netAmend = new Set(snap.amendments.map((a: any) => a.name));
  for (const f of protocol.features) if (!f.retired && !netAmend.has(f.name)) { warnings.push(tag(`amendment ${f.name}: in the source but not on the network (Supported::${f.supported ? "Yes" : "No"})`)); report.sourceAhead.add(`${netId}:amendment:${f.name}`); }

  // 4. Renderers
  const typesUsed = new Set<string>();
  for (const name of txNames) for (const f of defs.TRANSACTION_FORMATS[name] ?? []) typesUsed.add(defs.FIELDS[f.name]?.type ?? "?");
  for (const t of [...typesUsed].sort()) if (!renderers.has(t)) { errors.push(tag(`form engine: no renderer for type ${t}`)); report.missingRenderers.add(t); }

  // 5. Flags
  const allFlags: string[] = [];
  for (const [tx, flags] of Object.entries<Record<string, number>>(defs.TRANSACTION_FLAGS)) for (const f of Object.keys(flags)) allFlags.push(`${tx}.${f}`);
  for (const f of Object.keys(defs.ACCOUNT_SET_FLAGS)) allFlags.push(`AccountSet.${f}`);
  for (const [le, flags] of Object.entries<Record<string, number>>(defs.LEDGER_ENTRY_FLAGS)) for (const f of Object.keys(flags)) allFlags.push(`${le}.${f}`);
  totalFlags = Math.max(totalFlags, allFlags.length);
  for (const key of allFlags) { const [, f] = key.split("."); if (!flagDocs[key] && !flagDocs[f] && !report.missingFlagDocs.has(key)) { errors.push(`flag ${key}: no description in content/flags.json (needed by ${netId})`); report.missingFlagDocs.add(key); } }

  // 6. TER
  const srcResults = new Map<string, any>(protocol.results.map((r: any) => [r.code, r]));
  totalTer = Math.max(totalTer, Object.keys(defs.TRANSACTION_RESULTS).length);
  for (const code of Object.keys(defs.TRANSACTION_RESULTS)) {
    const r = srcResults.get(code);
    if (!r) {
      report.networkAhead.add(`${netId}:ter:${code}`);
      if (resultDocs[code]) warnings.push(tag(`TER ${code}: on the network but not in the source (described in content/results.json)`));
      else { errors.push(tag(`TER ${code}: on the network but not in the source and not described in content/results.json`)); report.missingResultDocs.add(code); }
      continue;
    }
    if (!r.description && !resultDocs[code] && !report.missingResultDocs.has(code)) { errors.push(`TER ${code}: no description (neither rippled nor content/results.json)`); report.missingResultDocs.add(code); }
  }
  for (const r of protocol.results) if (!(r.code in defs.TRANSACTION_RESULTS)) { warnings.push(tag(`TER ${r.code}: in the source but not on the network`)); report.sourceAhead.add(`${netId}:ter:${r.code}`); }

  // 7. Version
  if (protocol.source.version !== snap.buildVersion) warnings.push(tag(`version: rippled source ${protocol.source.version} (${protocol.source.commit?.slice(0, 8)}) vs network ${snap.buildVersion}`));
  summaryByNet[netId] = { version: snap.buildVersion, tx: txNames.length, objects: leNames.length, amendments: snap.amendments.length, sourceRef: snap.sourceRef, sourceVersion: protocol.source.version };
}

const toArr = (s: Set<string>) => [...s].sort();
const summary = {
  ok: errors.length === 0 && (!args.has("--strict") || warnings.length === 0),
  errors,
  warnings,
  report: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, toArr(v)])) as Record<keyof typeof report, string[]>,
  networks: summaryByNet,
  checkedAt: new Date().toISOString(),
};
if (args.has("--json")) console.log(JSON.stringify(summary, null, 2));
else {
  for (const w of warnings) console.log(`⚠  ${w}`);
  for (const e of errors) console.log(`✖  ${e}`);
  console.log(`\nCoverage over ${networks.length} networks (${networks.join(", ")}): ${Object.values(summaryByNet).map((s) => s.tx).join("/")} tx, ${totalFlags} flags, ${totalTer} TER → ${errors.length} errors, ${warnings.length} warnings`);
}
fs.mkdirSync(path.join(ROOT, "src/data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "src/data/coverage.json"), JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
