/**
 * Snapshot de la XRPL Testnet: versión del servidor, server_definitions (la verdad viva de
 * qué tipos/campos/flags/códigos existen en el binario que corre en testnet) y estado de
 * amendments (feature). Genera src/data/testnet.json.
 *
 * Uso: pnpm testnet:snapshot   [TESTNET_RPC=https://...]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "src/data/testnet.json");
const RPC = process.env.TESTNET_RPC ?? "https://s.altnet.rippletest.net:51234";

async function rpc<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, params: [params] }),
  });
  if (!res.ok) throw new Error(`${method}: HTTP ${res.status}`);
  const json = (await res.json()) as { result: T & { status?: string; error?: string; error_message?: string } };
  if (json.result?.status === "error") throw new Error(`${method}: ${json.result.error} ${json.result.error_message ?? ""}`);
  return json.result;
}

interface ServerInfo { info: { build_version: string; validated_ledger: { seq: number; hash: string; base_fee_xrp: number; reserve_base_xrp: number; reserve_inc_xrp: number }; network_id?: number; complete_ledgers: string; amendment_blocked?: boolean } }
interface Feature { name: string; enabled: boolean; supported: boolean; vetoed?: boolean | string; majority?: number; count?: number; threshold?: number; validations?: number }
interface Definitions {
  hash: string;
  TYPES: Record<string, number>;
  FIELDS: [string, { nth: number; type: string; isVLEncoded: boolean; isSerialized: boolean; isSigningField: boolean }][];
  TRANSACTION_TYPES: Record<string, number>;
  LEDGER_ENTRY_TYPES: Record<string, number>;
  TRANSACTION_RESULTS: Record<string, number>;
  TRANSACTION_FORMATS?: Record<string, { name: string; optionality: number }[]>;
  LEDGER_ENTRY_FORMATS?: Record<string, { name: string; optionality: number }[]>;
  TRANSACTION_FLAGS?: Record<string, Record<string, number>>;
  ACCOUNT_SET_FLAGS?: Record<string, number>;
  LEDGER_ENTRY_FLAGS?: Record<string, Record<string, number>>;
}

const info = await rpc<ServerInfo>("server_info");
const features = await rpc<{ features: Record<string, Feature> }>("feature");
const defs = await rpc<Definitions>("server_definitions");
const state = await rpc<{ state: { validated_ledger: { reserve_base: number; reserve_inc: number; base_fee: number }; load_factor: number } }>("server_state");

const amendments = Object.entries(features.features)
  .map(([id, f]) => ({ id, name: f.name, enabled: f.enabled, supported: f.supported, vetoed: f.vetoed, majority: f.majority, count: f.count, threshold: f.threshold, validations: f.validations }))
  .sort((a, b) => a.name.localeCompare(b.name));

const snapshot = {
  rpc: RPC,
  fetchedAt: new Date().toISOString(),
  buildVersion: info.info.build_version,
  networkId: info.info.network_id ?? 1,
  validatedLedger: info.info.validated_ledger,
  completeLedgers: info.info.complete_ledgers,
  amendmentBlocked: info.info.amendment_blocked ?? false,
  reserves: { baseXrp: info.info.validated_ledger.reserve_base_xrp, incXrp: info.info.validated_ledger.reserve_inc_xrp, baseFeeXrp: info.info.validated_ledger.base_fee_xrp, loadFactor: state.state.load_factor },
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

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(
  `testnet.json: rippled ${snapshot.buildVersion}, ledger ${snapshot.validatedLedger.seq}, ${amendments.length} amendments (${amendments.filter((a) => a.enabled).length} activos), ${Object.keys(defs.TRANSACTION_TYPES).length} tx types, ${Object.keys(defs.LEDGER_ENTRY_TYPES).length} ledger entry types, definitions ${defs.hash.slice(0, 8)}`,
);
