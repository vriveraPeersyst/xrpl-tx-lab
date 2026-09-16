/**
 * Typed access to the generated data, per network:
 *   - src/data/networks/<id>/snapshot.json  (live truth: server_definitions + feature of that network)
 *   - src/data/protocol/<ref>.json          (extracted from the rippled source matching that version)
 *
 * Rule: "what exists on the network" comes from the snapshot; "how it works" from the protocol file.
 * Use `getNet(id)` and call the bound helpers on it.
 */
import { snapshots, protocols } from "@/data/index";
import { getNetwork, DEFAULT_NETWORK, type Network } from "@/lib/networks";

export type Optionality = "required" | "optional" | "default";
export interface TxField { name: string; optionality: Optionality; mptSupported: boolean }
export interface FnAnalysis { line: number; ter: string[]; features: string[]; flags: string[]; fields: string[] }
export interface TransactorAnalysis {
  file: string;
  headerFile?: string;
  functions: Record<string, FnAnalysis>;
  allTer: string[];
  allFeatures: string[];
  allFlags: string[];
  allFields: string[];
  lines: number;
  ownerReserveFee?: boolean;
  customBaseFee?: boolean;
  ownerCountCalls?: string[];
}
export interface Transaction {
  tag: string;
  value: number;
  name: string;
  doc?: string;
  delegable: boolean;
  amendment?: string;
  privileges: string[];
  fields: TxField[];
  pseudo: boolean;
  transactor?: TransactorAnalysis;
}
export interface FlagDef { name: string; value: number; hex: string; doc?: string }
export interface LedgerEntry { tag: string; value: number; hex: string; name: string; rpcName: string; doc?: string; fields: TxField[]; duplicateOf?: string }
export interface Feature { name: string; kind: "feature" | "fix"; supported: boolean; defaultVote: "yes" | "no" | "obsolete"; retired: boolean; order: number }
export interface TerCode { code: string; category: string; value: number; description?: string; comment?: string; unused: boolean }
export interface SField { name: string; type: string; nth: number; untyped: boolean; flags?: string }
export interface Permission { name: string; txType: string; value: number; allowedFlags: string[]; allowedFields: TxField[]; doc?: string }
export interface InnerObject { name: string; fields: TxField[] }

export interface Protocol {
  source: { version?: string; commit?: string; commitDate?: string; branch?: string; repo: string; extractedAt: string };
  transactions: Transaction[];
  txFlags: { byTx: Record<string, { flags: FlagDef[]; maskAdj: string[] }>; asf: FlagDef[]; universal: FlagDef[] };
  ledgerFlags: Record<string, FlagDef[]>;
  ledgerEntries: LedgerEntry[];
  features: Feature[];
  results: TerCode[];
  sfields: SField[];
  permissions: Permission[];
  innerObjects: InnerObject[];
  commonFields: TxField[];
}

export interface SnapshotAmendment { id: string; name: string; enabled: boolean; supported: boolean; vetoed?: boolean | string; majority?: number; count?: number; threshold?: number; validations?: number }
export interface FieldDef { nth: number; type: string; isVLEncoded: boolean; isSerialized: boolean; isSigningField: boolean }
export interface Snapshot {
  network: string;
  rpc: string;
  fetchedAt: string;
  buildVersion: string;
  networkId: number;
  sourceRef: string;
  validatedLedger: { seq: number; hash: string; base_fee_xrp: number; reserve_base_xrp: number; reserve_inc_xrp: number };
  completeLedgers: string;
  amendmentBlocked: boolean;
  reserves: { baseXrp: number; incXrp: number; baseFeeXrp: number; loadFactor: number };
  amendments: SnapshotAmendment[];
  definitions: {
    hash: string;
    TYPES: Record<string, number>;
    FIELDS: Record<string, FieldDef>;
    TRANSACTION_TYPES: Record<string, number>;
    LEDGER_ENTRY_TYPES: Record<string, number>;
    TRANSACTION_RESULTS: Record<string, number>;
    TRANSACTION_FORMATS: Record<string, { name: string; optionality: number }[]>;
    LEDGER_ENTRY_FORMATS: Record<string, { name: string; optionality: number }[]>;
    TRANSACTION_FLAGS: Record<string, Record<string, number>>;
    ACCOUNT_SET_FLAGS: Record<string, number>;
    LEDGER_ENTRY_FLAGS: Record<string, Record<string, number>>;
  };
}

export const PSEUDO_TX = new Set(["EnableAmendment", "SetFee", "UNLModify"]);

export const TER_CATEGORIES: Record<string, { label: string; meaning: string; claimsFee: boolean; applied: boolean }> = {
  tes: { label: "Success", meaning: "The transaction was applied to the ledger.", claimsFee: true, applied: true },
  tec: { label: "Failed, fee claimed", meaning: "The transaction failed but was included in the ledger: it pays the fee and consumes the Sequence.", claimsFee: true, applied: true },
  tem: { label: "Malformed", meaning: "The transaction is badly constructed: it is never applied and pays no fee.", claimsFee: false, applied: false },
  tef: { label: "Failed permanently", meaning: "It cannot be applied (for example, it was already applied). No fee.", claimsFee: false, applied: false },
  tel: { label: "Local error", meaning: "The receiving server rejected it (full queue, insufficient fee…). Another server might accept it.", claimsFee: false, applied: false },
  ter: { label: "Retry", meaning: "Cannot be applied yet (e.g. a future Sequence). It is retried in later ledgers.", claimsFee: false, applied: false },
};

const TYPE_MAP: Record<string, string> = { ACCOUNT: "AccountID", AMOUNT: "Amount", UINT8: "UInt8", UINT16: "UInt16", UINT32: "UInt32", UINT64: "UInt64", INT32: "Int32", HASH128: "Hash128", HASH160: "Hash160", HASH192: "Hash192", HASH256: "Hash256", VL: "Blob", STARRAY: "STArray", STOBJECT: "STObject", PATHSET: "PathSet", VECTOR256: "Vector256", ISSUE: "Issue", CURRENCY: "Currency", NUMBER: "Number", XCHAIN_BRIDGE: "XChainBridge" };
export function normalizeType(t: string) {
  return TYPE_MAP[t] ?? t;
}
/** Converts `featureFoo` / `fixBar` (C++ identifiers) to the amendment name. */
export function featureIdToName(id: string): string {
  return id.startsWith("feature") ? id.slice(7) : id;
}

export interface MergedField extends TxField { type: string; inTestnet: boolean; inSource: boolean; common: boolean }

export class NetData {
  readonly id: string;
  readonly network: Network;
  readonly protocol: Protocol;
  readonly snapshot: Snapshot;
  constructor(id: string) {
    this.id = id;
    this.network = getNetwork(id);
    const snap = (snapshots as Record<string, unknown>)[id] as Snapshot | undefined;
    if (!snap) throw new Error(`No snapshot for network ${id}`);
    this.snapshot = snap;
    this.protocol = (protocols as Record<string, unknown>)[snap.sourceRef] as Protocol;
  }
  get defs() { return this.snapshot.definitions; }

  /** Transaction type names that exist on this network (alphabetical). */
  txNames(): string[] { return Object.keys(this.defs.TRANSACTION_TYPES).filter((n) => n !== "Invalid").sort(); }
  hasTx(name: string) { return name in this.defs.TRANSACTION_TYPES; }
  getTx(name: string): Transaction | undefined { return this.protocol.transactions.find((t) => t.name === name); }
  ledgerEntryNames(): string[] { return Object.keys(this.defs.LEDGER_ENTRY_TYPES).filter((n) => !["Invalid", "Any", "Child"].includes(n)).sort(); }
  hasLedgerEntry(name: string) { return name in this.defs.LEDGER_ENTRY_TYPES; }
  getLedgerEntry(name: string): LedgerEntry | undefined { return this.protocol.ledgerEntries.find((e) => e.name === name); }

  getField(name: string): (SField & { def?: FieldDef }) | undefined {
    const sf = this.protocol.sfields.find((s) => s.name === name);
    const def = this.defs.FIELDS[name];
    if (!sf && !def) return undefined;
    return { name, type: sf?.type ?? def?.type ?? "?", nth: sf?.nth ?? def?.nth ?? 0, untyped: sf?.untyped ?? false, flags: sf?.flags, def };
  }
  /** JSON type (server_definitions naming) of a field: AccountID, Amount, UInt32, Blob… */
  fieldType(name: string): string {
    return this.defs.FIELDS[name]?.type ?? normalizeType(this.protocol.sfields.find((s) => s.name === name)?.type ?? "Unknown");
  }
  /** Effective fields of a transaction on this network, merged with the source (MPT support, "default"), flagging source-only ones. */
  mergedFields(name: string): MergedField[] {
    const src = this.getTx(name);
    const tn = this.defs.TRANSACTION_FORMATS[name] ?? [];
    const out: MergedField[] = [];
    const seen = new Set<string>();
    for (const f of tn) {
      const s = src?.fields.find((x) => x.name === f.name);
      out.push({ name: f.name, optionality: s?.optionality ?? (f.optionality === 0 ? "required" : "optional"), mptSupported: s?.mptSupported ?? false, type: this.fieldType(f.name), inTestnet: true, inSource: !!s, common: false });
      seen.add(f.name);
    }
    for (const s of src?.fields ?? []) if (!seen.has(s.name)) out.push({ ...s, type: this.fieldType(s.name), inTestnet: false, inSource: true, common: false });
    return out;
  }
  commonFields(): MergedField[] {
    return this.protocol.commonFields.map((f) => ({ ...f, type: this.fieldType(f.name), inTestnet: true, inSource: true, common: true }));
  }
  /** Valid flags for a transaction on this network (hex + source doc if any). */
  txFlags(name: string): FlagDef[] {
    const tn = this.defs.TRANSACTION_FLAGS[name] ?? {};
    const src = this.protocol.txFlags.byTx[name]?.flags ?? [];
    return Object.entries(tn).map(([n, v]) => ({ name: n, value: v, hex: "0x" + v.toString(16).padStart(8, "0"), doc: src.find((f) => f.name === n)?.doc }));
  }
  amendmentStatus(name: string): SnapshotAmendment | undefined { return this.snapshot.amendments.find((a) => a.name === name); }
  getFeature(name: string): Feature | undefined { return this.protocol.features.find((f) => f.name === name); }
  getResult(code: string): TerCode | undefined { return this.protocol.results.find((r) => r.code === code); }
  /** GitHub URL to a source file at the exact extracted commit. */
  sourceUrl(file: string, line?: number): string {
    const ref = this.protocol.source.commit ?? this.protocol.source.branch ?? "develop";
    return `${this.protocol.source.repo}/blob/${ref}/${file}${line ? `#L${line}` : ""}`;
  }
  /** Amendments the transactor consults in code (rules.enabled(...)). */
  txAmendments(t: Transaction): { name: string; status?: SnapshotAmendment; gate: boolean }[] {
    const names = new Set<string>();
    if (t.amendment) names.add(t.amendment);
    for (const f of t.transactor?.allFeatures ?? []) names.add(featureIdToName(f));
    return [...names].sort().map((n) => ({ name: n, status: this.amendmentStatus(n), gate: n === t.amendment }));
  }
  /** Transactions that can return a given TER. */
  txReturning(code: string): string[] { return this.protocol.transactions.filter((t) => t.transactor?.allTer.includes(code)).map((t) => t.name); }
  fieldUsage(name: string) {
    return {
      transactions: this.protocol.transactions.filter((t) => t.fields.some((f) => f.name === name)).map((t) => t.name),
      ledgerEntries: this.protocol.ledgerEntries.filter((e) => e.fields.some((f) => f.name === name)).map((e) => e.name),
      innerObjects: this.protocol.innerObjects.filter((o) => o.fields.some((f) => f.name === name)).map((o) => o.name),
    };
  }
  /** Transactions that reference an amendment (gate or consulted in code). */
  txUsingAmendment(name: string): Transaction[] {
    return this.protocol.transactions.filter((t) => t.amendment === name || t.transactor?.allFeatures.some((f) => featureIdToName(f) === name));
  }
}

const cache = new Map<string, NetData>();
export function getNet(id: string = DEFAULT_NETWORK): NetData {
  let d = cache.get(id);
  if (!d) { d = new NetData(id); cache.set(id, d); }
  return d;
}
/** Networks that have data (a snapshot). */
export function availableNetworkIds(): string[] {
  return Object.keys(snapshots);
}
