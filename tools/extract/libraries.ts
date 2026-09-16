/**
 * Client library status: for every official/community XRPL library, fetch its binary-codec
 * definitions.json (the objective list of transaction types, ledger entries, fields and result
 * codes it can encode), its published version and repo activity, and compare it with every
 * network snapshot. Writes src/data/libraries.json.
 *
 * Usage: pnpm libraries   (uses `gh` for repo metadata if available; works without it)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");

interface Lib {
  id: string;
  name: string;
  language: string;
  repo: string;
  definitions: string;
  registry: { kind: "npm" | "pypi" | "maven" | "go" | "crates" | "packagist"; id: string };
  docs?: string;
  official: boolean;
}

const LIBS: Lib[] = [
  { id: "xrpl-js", name: "xrpl.js", language: "TypeScript / JavaScript", repo: "XRPLF/xrpl.js", definitions: "packages/ripple-binary-codec/src/enums/definitions.json", registry: { kind: "npm", id: "xrpl" }, docs: "https://js.xrpl.org", official: true },
  { id: "xrpl-py", name: "xrpl-py", language: "Python", repo: "XRPLF/xrpl-py", definitions: "xrpl/core/binarycodec/definitions/definitions.json", registry: { kind: "pypi", id: "xrpl-py" }, docs: "https://xrpl-py.readthedocs.io", official: true },
  { id: "xrpl4j", name: "xrpl4j", language: "Java", repo: "XRPLF/xrpl4j", definitions: "xrpl4j-core/src/main/resources/definitions.json", registry: { kind: "maven", id: "org.xrpl:xrpl4j-core" }, docs: "https://javadoc.io/doc/org.xrpl/xrpl4j-core", official: true },
  { id: "xrpl-go", name: "xrpl-go", language: "Go", repo: "XRPLF/xrpl-go", definitions: "binary-codec/definitions/definitions.json", registry: { kind: "go", id: "github.com/Peersyst/xrpl-go" }, docs: "https://xrplf.github.io/xrpl-go/docs/installation", official: true },
  { id: "xrpl-rust", name: "xrpl-rust", language: "Rust", repo: "sephynox/xrpl-rust", definitions: "src/core/binarycodec/definitions/definitions.json", registry: { kind: "crates", id: "xrpl" }, docs: "https://docs.rs/xrpl", official: false },
  { id: "xrpl-php", name: "xrpl-php", language: "PHP", repo: "AlexanderBuzz/xrpl-php", definitions: "src/Core/RippleBinaryCodec/Definitions/definitions.json", registry: { kind: "packagist", id: "hardcastle/xrpl_php" }, official: false },
];

const gh = (p: string) => { try { return JSON.parse(execSync(`gh api ${JSON.stringify(p)}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { return undefined; } };
async function json(url: string) { const r = await fetch(url, { headers: { "user-agent": "xrpl-tx-lab" } }); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return r.json(); }

async function version(l: Lib): Promise<{ version?: string; date?: string; url?: string }> {
  try {
    switch (l.registry.kind) {
      case "npm": { const d = await json(`https://registry.npmjs.org/${l.registry.id}`); const v = d["dist-tags"].latest; return { version: v, date: d.time?.[v]?.slice(0, 10), url: `https://www.npmjs.com/package/${l.registry.id}` }; }
      case "pypi": { const d = await json(`https://pypi.org/pypi/${l.registry.id}/json`); return { version: d.info.version, date: d.urls?.[0]?.upload_time?.slice(0, 10), url: `https://pypi.org/project/${l.registry.id}` }; }
      case "maven": { const [g, a] = l.registry.id.split(":"); const d = await json(`https://search.maven.org/solrsearch/select?q=g:${g}+AND+a:${a}&rows=1&wt=json`); const doc = d.response.docs[0]; return { version: doc?.latestVersion, date: doc ? new Date(doc.timestamp).toISOString().slice(0, 10) : undefined, url: `https://central.sonatype.com/artifact/${g}/${a}` }; }
      case "crates": { const rel = gh(`repos/${l.repo}/releases/latest`); return { version: rel?.tag_name, date: rel?.published_at?.slice(0, 10), url: `https://github.com/${l.repo}/releases` }; }
      case "packagist": { const d = await json(`https://repo.packagist.org/p2/${l.registry.id}.json`); const v = d.packages[l.registry.id]?.[0]; return { version: v?.version, date: v?.time?.slice(0, 10), url: `https://packagist.org/packages/${l.registry.id}` }; }
      case "go": { const rel = gh(`repos/${l.repo}/releases/latest`); return { version: rel?.tag_name, date: rel?.published_at?.slice(0, 10), url: `https://pkg.go.dev/${l.registry.id}` }; }
    }
  } catch (e) { return { version: undefined }; }
}

const netDir = path.join(ROOT, "src/data/networks");
const networks = fs.readdirSync(netDir).filter((n) => fs.existsSync(path.join(netDir, n, "snapshot.json"))).sort();
const snaps = Object.fromEntries(networks.map((n) => [n, JSON.parse(fs.readFileSync(path.join(netDir, n, "snapshot.json"), "utf8"))]));
const protocols: Record<string, any> = {};
for (const n of networks) { const ref = snaps[n].sourceRef; protocols[ref] ??= JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/protocol", `${ref}.json`), "utf8")); }

const out: any[] = [];
for (const l of LIBS) {
  const url = `https://raw.githubusercontent.com/${l.repo}/HEAD/${l.definitions}`;
  let defs: any;
  try { defs = await json(url); } catch (e) { console.log(`${l.id}: cannot fetch definitions (${e instanceof Error ? e.message : e})`); continue; }
  const txTypes = new Set(Object.keys(defs.TRANSACTION_TYPES ?? {}).filter((k) => k !== "Invalid"));
  const leTypes = new Set(Object.keys(defs.LEDGER_ENTRY_TYPES ?? {}).filter((k) => !["Invalid", "Any", "Child"].includes(k)));
  const fields = new Set((defs.FIELDS ?? []).map((f: any) => f[0]));
  const results = new Set(Object.keys(defs.TRANSACTION_RESULTS ?? {}));
  const repo = gh(`repos/${l.repo}`);
  const lastCommit = gh(`repos/${l.repo}/commits?per_page=1`)?.[0];
  const ver = await version(l);
  const perNetwork: Record<string, any> = {};
  for (const n of networks) {
    const s = snaps[n];
    const p = protocols[s.sourceRef];
    const netTx = Object.keys(s.definitions.TRANSACTION_TYPES).filter((k) => k !== "Invalid");
    const netLe = Object.keys(s.definitions.LEDGER_ENTRY_TYPES).filter((k) => !["Invalid", "Any", "Child"].includes(k));
    const netFields = Object.keys(s.definitions.FIELDS);
    const netResults = Object.keys(s.definitions.TRANSACTION_RESULTS);
    const missingTx = netTx.filter((t) => !txTypes.has(t));
    const missingLe = netLe.filter((t) => !leTypes.has(t));
    const missingFields = netFields.filter((f) => !fields.has(f));
    const missingResults = netResults.filter((r) => !results.has(r));
    // Amendments whose gated transaction types are all encodable by the library.
    const gates: Record<string, string[]> = {};
    for (const t of p.transactions) if (t.amendment && netTx.includes(t.name)) (gates[t.amendment] ??= []).push(t.name);
    const supportedAmendments = Object.entries(gates).filter(([, txs]) => txs.every((t) => txTypes.has(t))).map(([a]) => a);
    const unsupportedAmendments = Object.entries(gates).filter(([, txs]) => !txs.every((t) => txTypes.has(t))).map(([a, txs]) => ({ name: a, missing: txs.filter((t) => !txTypes.has(t)) }));
    perNetwork[n] = { txSupported: netTx.length - missingTx.length, txTotal: netTx.length, missingTx, leSupported: netLe.length - missingLe.length, leTotal: netLe.length, missingLe, fieldsSupported: netFields.length - missingFields.length, fieldsTotal: netFields.length, missingFields: missingFields.slice(0, 60), resultsSupported: netResults.length - missingResults.length, resultsTotal: netResults.length, missingResults, supportedAmendments, unsupportedAmendments, definitionsMatch: defs.hash ? defs.hash === s.definitions.hash : undefined };
  }
  const extraTx = [...txTypes].filter((t) => !networks.some((n) => t in snaps[n].definitions.TRANSACTION_TYPES));
  out.push({ ...l, definitionsUrl: `https://github.com/${l.repo}/blob/HEAD/${l.definitions}`, definitionsHash: defs.hash, txTypes: [...txTypes].sort(), extraTx, counts: { tx: txTypes.size, le: leTypes.size, fields: fields.size, results: results.size }, version: ver, repoInfo: repo ? { stars: repo.stargazers_count, openIssues: repo.open_issues_count, pushedAt: repo.pushed_at, license: repo.license?.spdx_id, description: repo.description, defaultBranch: repo.default_branch, archived: repo.archived } : undefined, lastCommit: lastCommit ? { sha: lastCommit.sha?.slice(0, 8), date: lastCommit.commit?.committer?.date, message: lastCommit.commit?.message?.split("\n")[0] } : undefined, perNetwork });
  console.log(`${l.id}: ${ver.version ?? "?"} · ${txTypes.size} tx types · ${networks.map((n) => `${n} ${perNetwork[n].txSupported}/${perNetwork[n].txTotal}`).join(", ")}`);
}
fs.writeFileSync(path.join(ROOT, "src/data/libraries.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), libraries: out }, null, 2));
console.log(`libraries.json: ${out.length} libraries`);
