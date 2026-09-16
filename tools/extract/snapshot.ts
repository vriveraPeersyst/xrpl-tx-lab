/**
 * Snapshot of one or all XRPL test networks: server version, server_definitions (the live truth
 * of which types/fields/flags/codes exist in the running binary) and amendment (feature) status.
 * Writes src/data/networks/<id>/snapshot.json. Unreachable networks keep their previous snapshot.
 *
 * Usage: pnpm snapshot [--network testnet]
 */
import fs from "node:fs";
import path from "node:path";
import { NETWORKS } from "../lib/networks";

const ROOT = path.resolve(import.meta.dirname, "../..");
const argNet = process.argv.indexOf("--network") >= 0 ? process.argv[process.argv.indexOf("--network") + 1] : undefined;

async function rpcAt(url: string, method: string, params: Record<string, unknown> = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, params: [params] }), signal: ctrl.signal });
    if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
    const json = (await res.json()) as { result: any };
    if (json.result?.status === "error") throw new Error(`${method}: ${json.result.error} ${json.result.error_message ?? ""}`);
    return json.result;
  } finally {
    clearTimeout(t);
  }
}

async function snapshot(net: { id: string; label: string; rpc: string[] }) {
  let lastErr: unknown;
  for (const url of net.rpc) {
    try {
      const rpc = (m: string, p?: Record<string, unknown>) => rpcAt(url, m, p);
      const info = await rpc("server_info");
      const features = await rpc("feature");
      const defs = await rpc("server_definitions");
      const state = await rpc("server_state");
      const amendments = Object.entries<any>(features.features)
        .map(([id, f]) => ({ id, name: f.name, enabled: f.enabled, supported: f.supported, vetoed: f.vetoed, majority: f.majority, count: f.count, threshold: f.threshold, validations: f.validations }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const vl = info.info.validated_ledger;
      const out = {
        network: net.id,
        rpc: url,
        fetchedAt: new Date().toISOString(),
        buildVersion: info.info.build_version as string,
        networkId: info.info.network_id ?? 0,
        validatedLedger: vl,
        completeLedgers: info.info.complete_ledgers,
        amendmentBlocked: info.info.amendment_blocked ?? false,
        reserves: { baseXrp: vl.reserve_base_xrp, incXrp: vl.reserve_inc_xrp, baseFeeXrp: vl.base_fee_xrp, loadFactor: state.state.load_factor },
        amendments,
        definitions: {
          hash: defs.hash,
          TYPES: defs.TYPES,
          FIELDS: Object.fromEntries(defs.FIELDS),
          TRANSACTION_TYPES: defs.TRANSACTION_TYPES,
          LEDGER_ENTRY_TYPES: defs.LEDGER_ENTRY_TYPES,
          TRANSACTION_RESULTS: defs.TRANSACTION_RESULTS,
          TRANSACTION_FORMATS: defs.TRANSACTION_FORMATS ?? {},
          LEDGER_ENTRY_FORMATS: defs.LEDGER_ENTRY_FORMATS ?? {},
          TRANSACTION_FLAGS: defs.TRANSACTION_FLAGS ?? {},
          ACCOUNT_SET_FLAGS: defs.ACCOUNT_SET_FLAGS ?? {},
          LEDGER_ENTRY_FLAGS: defs.LEDGER_ENTRY_FLAGS ?? {},
        },
      };
      const dir = path.join(ROOT, "src/data/networks", net.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "snapshot.json"), JSON.stringify(out, null, 2));
      console.log(`${net.id}: rippled ${out.buildVersion} (net ${out.networkId}), ledger ${vl.seq}, ${amendments.length} amendments (${amendments.filter((a) => a.enabled).length} enabled), ${Object.keys(defs.TRANSACTION_TYPES).length} tx types, definitions ${String(defs.hash).slice(0, 8)}`);
      return true;
    } catch (e) {
      lastErr = e;
    }
  }
  const prev = path.join(ROOT, "src/data/networks", net.id, "snapshot.json");
  console.log(`${net.id}: UNREACHABLE (${lastErr instanceof Error ? lastErr.message : lastErr}); ${fs.existsSync(prev) ? "keeping previous snapshot" : "no previous snapshot"}`);
  return false;
}

let ok = true;
for (const net of NETWORKS.filter((n) => !argNet || n.id === argNet)) ok = (await snapshot(net)) && ok;
process.exit(0);
