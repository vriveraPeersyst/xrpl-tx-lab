/**
 * Acceso tipado a los datos generados por las herramientas:
 *   - src/data/protocol.json  (extraído del código fuente de rippled)
 *   - src/data/testnet.json   (snapshot vivo de la XRPL Testnet: server_definitions + feature)
 *
 * Regla: para "qué existe en testnet" manda testnet.json; para "cómo funciona" manda protocol.json.
 */
import protocolJson from "@/data/protocol.json";
import testnetJson from "@/data/testnet.json";

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

export interface TestnetAmendment { id: string; name: string; enabled: boolean; supported: boolean; vetoed?: boolean | string; majority?: number; count?: number; threshold?: number; validations?: number }
export interface FieldDef { nth: number; type: string; isVLEncoded: boolean; isSerialized: boolean; isSigningField: boolean }
export interface Testnet {
  rpc: string;
  fetchedAt: string;
  buildVersion: string;
  networkId: number;
  validatedLedger: { seq: number; hash: string; base_fee_xrp: number; reserve_base_xrp: number; reserve_inc_xrp: number };
  completeLedgers: string;
  amendmentBlocked: boolean;
  reserves: { baseXrp: number; incXrp: number; baseFeeXrp: number; loadFactor: number };
  amendments: TestnetAmendment[];
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

export const protocol = protocolJson as unknown as Protocol;
export const testnet = testnetJson as unknown as Testnet;

export const PSEUDO_TX = new Set(["EnableAmendment", "SetFee", "UNLModify"]);

/** Nombres de transacción que existen en el xrpld de testnet (orden alfabético). */
export function testnetTxNames(): string[] {
  return Object.keys(testnet.definitions.TRANSACTION_TYPES).filter((n) => n !== "Invalid").sort();
}

export function getTx(name: string): Transaction | undefined {
  return protocol.transactions.find((t) => t.name === name);
}

export function getLedgerEntry(name: string): LedgerEntry | undefined {
  return protocol.ledgerEntries.find((e) => e.name === name);
}

export function testnetLedgerEntryNames(): string[] {
  return Object.keys(testnet.definitions.LEDGER_ENTRY_TYPES).filter((n) => !["Invalid", "Any", "Child"].includes(n)).sort();
}

export function getField(name: string): (SField & { def?: FieldDef }) | undefined {
  const sf = protocol.sfields.find((s) => s.name === name);
  const def = testnet.definitions.FIELDS[name];
  if (!sf && !def) return undefined;
  return { name, type: sf?.type ?? def?.type ?? "?", nth: sf?.nth ?? def?.nth ?? 0, untyped: sf?.untyped ?? false, flags: sf?.flags, def };
}

/** Tipo JSON (nomenclatura server_definitions) de un campo: AccountID, Amount, UInt32, Blob… */
export function fieldType(name: string): string {
  return testnet.definitions.FIELDS[name]?.type ?? normalizeType(protocol.sfields.find((s) => s.name === name)?.type ?? "Unknown");
}

const TYPE_MAP: Record<string, string> = { ACCOUNT: "AccountID", AMOUNT: "Amount", UINT8: "UInt8", UINT16: "UInt16", UINT32: "UInt32", UINT64: "UInt64", INT32: "Int32", HASH128: "Hash128", HASH160: "Hash160", HASH192: "Hash192", HASH256: "Hash256", VL: "Blob", STARRAY: "STArray", STOBJECT: "STObject", PATHSET: "PathSet", VECTOR256: "Vector256", ISSUE: "Issue", CURRENCY: "Currency", NUMBER: "Number", XCHAIN_BRIDGE: "XChainBridge" };
export function normalizeType(t: string) {
  return TYPE_MAP[t] ?? t;
}

/**
 * Campos efectivos de una transacción en testnet, con la información de la fuente
 * (soporte MPT, opcionalidad "default") y marcando los que solo existen en la fuente.
 */
export interface MergedField extends TxField { type: string; inTestnet: boolean; inSource: boolean; common: boolean }
export function mergedFields(name: string): MergedField[] {
  const src = getTx(name);
  const tn = testnet.definitions.TRANSACTION_FORMATS[name] ?? [];
  const out: MergedField[] = [];
  const seen = new Set<string>();
  for (const f of tn) {
    const s = src?.fields.find((x) => x.name === f.name);
    out.push({ name: f.name, optionality: s?.optionality ?? (f.optionality === 0 ? "required" : "optional"), mptSupported: s?.mptSupported ?? false, type: fieldType(f.name), inTestnet: true, inSource: !!s, common: false });
    seen.add(f.name);
  }
  for (const s of src?.fields ?? []) if (!seen.has(s.name)) out.push({ ...s, type: fieldType(s.name), inTestnet: false, inSource: true, common: false });
  return out;
}

export function commonFields(): MergedField[] {
  return protocol.commonFields.map((f) => ({ ...f, type: fieldType(f.name), inTestnet: true, inSource: true, common: true }));
}

/** Flags válidos para una transacción según testnet (con hex y doc de la fuente si existe). */
export function txFlags(name: string): FlagDef[] {
  const tn = testnet.definitions.TRANSACTION_FLAGS[name] ?? {};
  const src = protocol.txFlags.byTx[name]?.flags ?? [];
  return Object.entries(tn).map(([n, v]) => ({ name: n, value: v, hex: "0x" + v.toString(16).padStart(8, "0"), doc: src.find((f) => f.name === n)?.doc }));
}

export function amendmentStatus(name: string): TestnetAmendment | undefined {
  return testnet.amendments.find((a) => a.name === name);
}

export function getFeature(name: string): Feature | undefined {
  return protocol.features.find((f) => f.name === name);
}

/** Convierte `featureFoo` / `fixBar` (identificadores C++) al nombre de amendment. */
export function featureIdToName(id: string): string {
  return id.startsWith("feature") ? id.slice(7) : id;
}

export function getResult(code: string): TerCode | undefined {
  return protocol.results.find((r) => r.code === code);
}

export const TER_CATEGORIES: Record<string, { label: string; meaning: string; claimsFee: boolean; applied: boolean }> = {
  tes: { label: "Éxito", meaning: "La transacción se aplicó al ledger.", claimsFee: true, applied: true },
  tec: { label: "Fallo con fee", meaning: "La transacción falló pero se incluyó en el ledger: cobra el fee y consume el Sequence.", claimsFee: true, applied: true },
  tem: { label: "Malformada", meaning: "La transacción está mal construida: nunca se aplica ni cobra fee.", claimsFee: false, applied: false },
  tef: { label: "Fallo definitivo", meaning: "No se puede aplicar (por ejemplo, ya se aplicó antes). No cobra fee.", claimsFee: false, applied: false },
  tel: { label: "Error local", meaning: "El servidor que la recibió la rechazó (cola llena, fee insuficiente…). Otro servidor podría aceptarla.", claimsFee: false, applied: false },
  ter: { label: "Reintentable", meaning: "Todavía no se puede aplicar (p. ej. Sequence futuro). Se reintenta en ledgers siguientes.", claimsFee: false, applied: false },
};

/** URL a GitHub para un fichero de la fuente en el commit exacto extraído. */
export function sourceUrl(file: string, line?: number): string {
  const ref = protocol.source.commit ?? protocol.source.branch ?? "develop";
  return `${protocol.source.repo}/blob/${ref}/${file}${line ? `#L${line}` : ""}`;
}

/** Amendments que el transactor consulta en el código (rules.enabled(...)). */
export function txAmendments(t: Transaction): { name: string; status?: TestnetAmendment; gate: boolean }[] {
  const names = new Set<string>();
  if (t.amendment) names.add(t.amendment);
  for (const f of t.transactor?.allFeatures ?? []) names.add(featureIdToName(f));
  return [...names].sort().map((n) => ({ name: n, status: amendmentStatus(n), gate: n === t.amendment }));
}

/** Transacciones que devuelven un TER dado (para "quién puede devolver tecNO_DST"). */
export function txReturning(code: string): string[] {
  return protocol.transactions.filter((t) => t.transactor?.allTer.includes(code)).map((t) => t.name);
}

/** Transacciones y objetos que usan un campo. */
export function fieldUsage(name: string) {
  return {
    transactions: protocol.transactions.filter((t) => t.fields.some((f) => f.name === name)).map((t) => t.name),
    ledgerEntries: protocol.ledgerEntries.filter((e) => e.fields.some((f) => f.name === name)).map((e) => e.name),
    innerObjects: protocol.innerObjects.filter((o) => o.fields.some((f) => f.name === name)).map((o) => o.name),
  };
}
