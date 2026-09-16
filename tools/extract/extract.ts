/**
 * Protocol extractor: reads the rippled source code (vendor/rippled)
 * and generates src/data/protocol.json with everything the UI and docs need:
 *   - transactions (fields, optionality, MPT support, delegability, amendment, privileges)
 *   - analysis of each transactor (TER codes by phase, amendments checked, flags, fields)
 *   - transaction flags (tf*), AccountSet flags (asf*) and ledger object flags (lsf*)
 *   - ledger objects (ledger entries) with their fields
 *   - amendments (features/fixes) with support and default vote
 *   - result codes (TER) with description
 *   - serialized fields (sfields) with type
 *   - granular permissions (delegation)
 *
 * Usage: pnpm extract   (requires vendor/rippled; see pnpm rippled:fetch)
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RIPPLED = process.env.RIPPLED_DIR ?? path.join(ROOT, "vendor/rippled");
const OUT = path.join(ROOT, "src/data/protocol.json");

const read = (rel: string) => fs.readFileSync(path.join(RIPPLED, rel), "utf8");

// ---------- parsing utilities ----------

/** Returns the text of a `NAME(` macro call up to the balanced closing parenthesis. */
function* scanMacroCalls(src: string, name: string) {
  const re = new RegExp(`^\\s*${name}\\(`, "gm");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    yield { index: m.index, body: src.slice(start, i - 1), end: i };
    re.lastIndex = i;
  }
}

/** Documentation comment `/** ... *\/` immediately preceding `index` (ignoring #if/#include). */
function docCommentBefore(src: string, index: number): string | undefined {
  const before = src.slice(0, index);
  const tail = before.slice(-2500);
  // remove #if TRANSACTION_INCLUDE ... #endif blocks and trailing empty lines
  const stripped = tail
    .replace(/#if [^\n]*\n(?:#[^\n]*\n)*#endif\s*$/g, "")
    .replace(/(?:\/\/[^\n]*\n\s*)+$/g, "")
    .trimEnd();
  if (!stripped.endsWith("*/")) return undefined;
  const open = stripped.lastIndexOf("/**");
  if (open < 0) return undefined;
  const m = [null, stripped.slice(open + 3, -2)] as const;
  return m[1]
    .split("\n")
    .map((l) => l.replace(/^\s*\*\s?/, "").trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function includeBefore(src: string, index: number): string | undefined {
  const tail = src.slice(Math.max(0, index - 400), index);
  const m = tail.match(/#\s*include\s*<([^>]+)>\s*\n#endif\s*$/);
  return m?.[1];
}

/** Parses a field list `({ {sfX, SoeRequired, SoeMptSupported}, ... })`. */
function parseFieldList(body: string) {
  const fields: { name: string; optionality: "required" | "optional" | "default"; mptSupported: boolean }[] = [];
  const re = /\{\s*sf(\w+)\s*,\s*Soe(Required|Optional|Default)\s*(?:,\s*Soe(MptSupported|MptNotSupported))?\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    fields.push({
      name: m[1],
      optionality: m[2].toLowerCase() as "required" | "optional" | "default",
      mptSupported: m[3] === "MptSupported",
    });
  }
  return fields;
}

/** Splits a macro's top-level arguments while respecting parentheses and braces. */
function splitTopLevelArgs(body: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of body) {
    if (c === "(" || c === "{") depth++;
    if (c === ")" || c === "}") depth--;
    if (c === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

// ---------- 1. Transactions ----------

type Optionality = "required" | "optional" | "default";
interface TxField { name: string; optionality: Optionality; mptSupported: boolean }

interface TransactorAnalysis {
  file: string;
  headerFile?: string;
  functions: Record<string, { line: number; ter: string[]; features: string[]; flags: string[]; fields: string[] }>;
  allTer: string[];
  allFeatures: string[];
  allFlags: string[];
  allFields: string[];
  lines: number;
  /** Charges the incremental owner reserve as a fee (calculateOwnerReserveFee). */
  ownerReserveFee: boolean;
  /** Defines its own calculateBaseFee (fee different from the base). */
  customBaseFee: boolean;
  /** increaseOwnerCount/decreaseOwnerCount/adjustOwnerCount calls found (evidence of reserve). */
  ownerCountCalls: string[];
}

interface Transaction {
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

function extractTransactions(): Transaction[] {
  const src = read("include/xrpl/protocol/detail/transactions.macro");
  const out: Transaction[] = [];
  for (const call of scanMacroCalls(src, "TRANSACTION")) {
    const args = splitTopLevelArgs(call.body);
    const [tag, value, name, settings, fieldsArg] = args;
    const delegable = /Delegation::Delegable/.test(settings);
    const amendment = settings.match(/\.amendment\s*=\s*(feature\w+|fix\w+)/)?.[1];
    const privileges = [...settings.matchAll(/Privilege::(\w+)/g)].map((m) => m[1]).filter((p) => p !== "NoPriv");
    const header = includeBefore(src, call.index);
    const pseudo = /^tt(AMENDMENT|FEE|UNL_MODIFY)$/.test(tag);
    out.push({
      tag,
      value: Number(value),
      name,
      doc: docCommentBefore(src, call.index),
      delegable,
      amendment: amendment?.replace(/^feature/, "").replace(/^fix/, "fix"),
      privileges,
      fields: parseFieldList(fieldsArg ?? ""),
      pseudo,
      transactor: analyzeTransactor(header ?? findTransactorHeader(name), name),
    });
  }
  return out;
}

// ---------- 2. Transactor analysis ----------

const TER_RE = /\b(tem|tef|tel|ter|tec|tes)[A-Z][A-Z_0-9]*\b/g;
const FEATURE_RE = /\b(?:feature|fix)[A-Z][A-Za-z0-9_]*\b/g;
const FLAG_RE = /\b(?:tf|asf|lsf)[A-Z][A-Za-z0-9_]*\b/g;
const SFIELD_RE = /\bsf[A-Z][A-Za-z0-9_]*\b/g;

const uniq = (arr: Iterable<string>) => [...new Set(arr)].sort();
const matches = (s: string, re: RegExp) => uniq([...s.matchAll(re)].map((m) => m[0]));

function stripComments(s: string) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Finds the .cpp that defines `Name::preflight` when the macro has no #include (XChain*, pseudo-tx). */
function findTransactorHeader(className: string): string | undefined {
  const dir = path.join(RIPPLED, "src/libxrpl/tx/transactors");
  const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".cpp") ? [path.join(d, e.name)] : []));
  const re = new RegExp(`^${className}::(preflight|doApply|preclaim)\\(`, "m");
  const cls = className === "SetFee" || className === "UNLModify" || className === "EnableAmendment" ? "Change" : className;
  const re2 = new RegExp(`^${cls}::(preflight|doApply|preclaim)\\(`, "m");
  const files = walk(dir);
  for (const f of files) {
    const txt = fs.readFileSync(f, "utf8");
    if (re.test(txt) || re2.test(txt)) return "xrpl/" + path.relative(path.join(RIPPLED, "src/libxrpl"), f).replace(/\.cpp$/, ".h");
  }
  // Aliases in headers (e.g. `using XChainModifyBridge = BridgeModify;`).
  const hdir = path.join(RIPPLED, "include/xrpl/tx/transactors");
  const walkH = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walkH(path.join(d, e.name)) : e.name.endsWith(".h") ? [path.join(d, e.name)] : []));
  const aliasRe = new RegExp(`(using\\s+${className}\\s*=|class\\s+${className}\\b)`);
  for (const f of walkH(hdir)) if (aliasRe.test(fs.readFileSync(f, "utf8"))) return path.relative(path.join(RIPPLED, "include"), f);
  return undefined;
}

function analyzeTransactor(header: string | undefined, className: string): TransactorAnalysis | undefined {
  if (!header) return undefined;
  if (className === "SetFee" || className === "UNLModify" || className === "EnableAmendment") className = "Change";
  // header: xrpl/tx/transactors/payment/Payment.h  -> src/libxrpl/tx/transactors/payment/Payment.cpp
  const rel = header.replace(/^xrpl\//, "").replace(/\.h$/, ".cpp");
  const cppPath = path.join("src/libxrpl", rel);
  const hPath = path.join("include", header);
  if (!fs.existsSync(path.join(RIPPLED, cppPath))) return undefined;
  const cpp = read(cppPath);
  const h = fs.existsSync(path.join(RIPPLED, hPath)) ? read(hPath) : "";
  const code = stripComments(cpp);
  // Alias `using XChainModifyBridge = BridgeModify;` in the header: analyze the real class.
  const alias = h.match(new RegExp(`using\\s+${className}\\s*=\\s*(\\w+)\\s*;`))?.[1];
  if (alias) className = alias;

  // Locates `ClassName::fn(` definitions and takes the body up to the next definition.
  const fnRe = new RegExp(`^${className}::(\\w+)\\(`, "gm");
  const positions: { name: string; start: number; line: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(code))) {
    positions.push({ name: m[1], start: m.index, line: code.slice(0, m.index).split("\n").length });
  }
  const functions: TransactorAnalysis["functions"] = {};
  positions.forEach((p, i) => {
    const end = positions[i + 1]?.start ?? code.length;
    const body = code.slice(p.start, end);
    const prev = functions[p.name];
    const entry = {
      line: prev?.line ?? p.line,
      ter: uniq([...(prev?.ter ?? []), ...matches(body, TER_RE)]),
      features: uniq([...(prev?.features ?? []), ...matches(body, FEATURE_RE)]),
      flags: uniq([...(prev?.flags ?? []), ...matches(body, FLAG_RE)]),
      fields: uniq([...(prev?.fields ?? []), ...matches(body, SFIELD_RE)]).map((f) => f.slice(2)),
    };
    functions[p.name] = entry;
  });
  // Functions only declared in the .h (e.g. checkExtraFeatures inline) also count.
  const all = code + "\n" + stripComments(h);
  return {
    file: cppPath,
    headerFile: hPath,
    functions,
    allTer: matches(all, TER_RE),
    allFeatures: matches(all, FEATURE_RE),
    allFlags: matches(all, FLAG_RE),
    allFields: matches(all, SFIELD_RE).map((f) => f.slice(2)),
    lines: cpp.split("\n").length,
    ownerReserveFee: /calculateOwnerReserveFee/.test(code),
    customBaseFee: /::calculateBaseFee\(/.test(code),
    ownerCountCalls: uniq([...code.matchAll(/\b(increaseOwnerCount|decreaseOwnerCount|adjustOwnerCount)\s*\(([^;]*)\)/g)].map((m) => `${m[1]}(${m[2].replace(/\s+/g, " ").trim()})`)),
  };
}

// ---------- 3. Flags ----------

interface FlagDef { name: string; value: number; hex: string; doc?: string }

function extractTxFlags() {
  const src = read("include/xrpl/protocol/TxFlags.h");
  const byTx: Record<string, { flags: FlagDef[]; maskAdj: string[] }> = {};
  // Main XMACRO block
  const block = src.slice(src.indexOf("#define XMACRO(TRANSACTION, TF_FLAG, TF_FLAG2, MASK_ADJ)"), src.indexOf("// clang-format on", src.indexOf("#define XMACRO(TRANSACTION")));
  const cleaned = block.replace(/\\\s*\n/g, "\n");
  const txRe = /TRANSACTION\((\w+),([\s\S]*?)MASK_ADJ\(([^)]*)\)\)/g;
  let m: RegExpExecArray | null;
  const known: Record<string, number> = {};
  while ((m = txRe.exec(cleaned))) {
    const tx = m[1];
    const flags: FlagDef[] = [];
    for (const f of m[2].matchAll(/TF_FLAG2?\((\w+),\s*(0x[0-9a-fA-F]+|\w+)\)/g)) {
      const value = f[2].startsWith("0x") ? parseInt(f[2], 16) : (known[f[2]] ?? NaN);
      known[f[1]] = value;
      flags.push({ name: f[1], value, hex: "0x" + value.toString(16).padStart(8, "0") });
    }
    byTx[tx] = { flags, maskAdj: m[3].trim() === "0" ? [] : m[3].split("|").map((s) => s.trim()) };
  }
  // asf flags
  const asf: FlagDef[] = [...src.matchAll(/ASF_FLAG\((\w+),\s*(\d+)\)/g)].map((a) => ({ name: a[1], value: Number(a[2]), hex: a[2] }));
  const universal: FlagDef[] = [
    { name: "tfFullyCanonicalSig", value: 0x80000000, hex: "0x80000000", doc: "Requires a fully canonical signature (obsolete, always implicit since RequireFullyCanonicalSig)." },
    { name: "tfInnerBatchTxn", value: 0x40000000, hex: "0x40000000", doc: "Marks a transaction as an inner transaction of a Batch." },
  ];
  return { byTx, asf, universal };
}

function extractLedgerFlags() {
  const src = read("include/xrpl/protocol/LedgerFormats.h");
  const start = src.indexOf("#define XMACRO(LEDGER_OBJECT, LSF_FLAG, LSF_FLAG2)");
  const block = src.slice(start, src.indexOf("// clang-format on", start)).replace(/\\\s*\n/g, "\n");
  const out: Record<string, FlagDef[]> = {};
  const objRe = /LEDGER_OBJECT\((\w+),([\s\S]*?)\)\s*(?=LEDGER_OBJECT\(|$)/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(block))) {
    const flags: FlagDef[] = [];
    for (const f of m[2].matchAll(/LSF_FLAG2?\((\w+),\s*(0x[0-9a-fA-F]+)\)\s*(?:\/\*\s*([^*]*?)\s*\*\/)?/g)) {
      const value = parseInt(f[2], 16);
      flags.push({ name: f[1], value, hex: "0x" + value.toString(16).padStart(8, "0"), doc: f[3]?.trim() });
    }
    out[m[1]] = flags;
  }
  return out;
}

// ---------- 4. Ledger entries ----------

function extractLedgerEntries() {
  const src = read("include/xrpl/protocol/detail/ledger_entries.macro");
  const out: { tag: string; value: number; hex: string; name: string; rpcName: string; doc?: string; fields: TxField[]; duplicateOf?: string }[] = [];
  for (const call of scanMacroCalls(src, "LEDGER_ENTRY")) {
    const [tag, value, name, rpcName, fieldsArg] = splitTopLevelArgs(call.body);
    out.push({ tag, value: parseInt(value, 16), hex: value, name, rpcName, doc: docCommentBefore(src, call.index), fields: parseFieldList(fieldsArg ?? "") });
  }
  for (const call of scanMacroCalls(src, "LEDGER_ENTRY_DUPLICATE")) {
    const [tag, value, name, rpcName, fieldsArg] = splitTopLevelArgs(call.body);
    out.push({ tag, value: parseInt(value, 16), hex: value, name, rpcName, doc: docCommentBefore(src, call.index), fields: parseFieldList(fieldsArg ?? ""), duplicateOf: "see rippled" });
  }
  return out.sort((a, b) => a.value - b.value);
}

// ---------- 5. Amendments ----------

function extractFeatures() {
  const src = read("include/xrpl/protocol/detail/features.macro");
  const out: { name: string; kind: "feature" | "fix"; supported: boolean; defaultVote: "yes" | "no" | "obsolete"; retired: boolean; order: number }[] = [];
  let order = 0;
  for (const line of src.split("\n")) {
    let m = line.match(/^XRPL_(FEATURE|FIX)\s*\(\s*(\w+),\s*Supported::(Yes|No),\s*VoteBehavior::(DefaultYes|DefaultNo|Obsolete)\)/);
    if (m) {
      const kind = m[1] === "FIX" ? "fix" : "feature";
      out.push({ name: kind === "fix" ? "fix" + m[2] : m[2], kind, supported: m[3] === "Yes", defaultVote: m[4] === "DefaultYes" ? "yes" : m[4] === "DefaultNo" ? "no" : "obsolete", retired: false, order: order++ });
      continue;
    }
    m = line.match(/^XRPL_RETIRE_(FEATURE|FIX)\s*\(\s*(\w+)\)/);
    if (m) {
      const kind = m[1] === "FIX" ? "fix" : "feature";
      out.push({ name: kind === "fix" ? "fix" + m[2] : m[2], kind, supported: true, defaultVote: "yes", retired: true, order: order++ });
    }
  }
  return out;
}

// ---------- 6. TER codes ----------

function extractResults() {
  const h = read("include/xrpl/protocol/TER.h");
  const cpp = read("src/libxrpl/protocol/TER.cpp");
  const descriptions: Record<string, string> = {};
  for (const m of cpp.matchAll(/MAKE_ERROR\((\w+),\s*"((?:[^"\\]|\\.)*)"\)/g)) descriptions[m[1]] = m[2];
  const out: { code: string; category: string; value: number; description?: string; comment?: string; unused: boolean }[] = [];
  // Walks the enums; each enum resets the counter with its first `= N`.
  let current = 0;
  for (const line of h.split("\n")) {
    const m = line.match(/^\s+((?:tem|tef|tel|ter|tec|tes)[A-Z][A-Z_0-9]*)\s*(?:=\s*(-?\d+))?\s*,?\s*(?:\/\/\s*(.*))?$/);
    if (!m) continue;
    if (m[2] !== undefined) current = Number(m[2]);
    const code = m[1];
    out.push({ code, category: code.slice(0, 3), value: current, description: descriptions[code], comment: m[3]?.trim(), unused: /unused|legacy|no longer|deprecated/i.test(m[3] ?? "") });
    current++;
  }
  return out;
}

// ---------- 7. SFields ----------

function extractSFields() {
  const src = read("include/xrpl/protocol/detail/sfields.macro");
  const out: { name: string; type: string; nth: number; untyped: boolean; flags?: string }[] = [];
  for (const m of src.matchAll(/^(TYPED_SFIELD|UNTYPED_SFIELD)\s*\(\s*sf(\w+),\s*(\w+),\s*(\d+)(?:,\s*([^)]+))?\)/gm)) {
    out.push({ name: m[2], type: m[3], nth: Number(m[4]), untyped: m[1] === "UNTYPED_SFIELD", flags: m[5]?.trim() });
  }
  return out;
}

// ---------- 8. Granular permissions ----------

function extractPermissions() {
  const src = read("include/xrpl/protocol/detail/permissions.macro");
  const out: { name: string; txType: string; value: number; allowedFlags: string[]; allowedFields: TxField[]; doc?: string }[] = [];
  for (const call of scanMacroCalls(src, "GRANULAR_PERMISSION")) {
    const [name, txType, value, allowedFlags, fieldsArg] = splitTopLevelArgs(call.body);
    out.push({ name, txType, value: Number(value), allowedFlags: allowedFlags.split("|").map((s) => s.trim()), allowedFields: parseFieldList(fieldsArg ?? ""), doc: docCommentBefore(src, call.index) });
  }
  return out;
}

// ---------- 8b. Inner objects and common fields ----------

function extractInnerObjects() {
  const src = read("src/libxrpl/protocol/InnerObjectFormats.cpp");
  const out: { name: string; fields: TxField[] }[] = [];
  const re = /add\(sf(\w+)\.jsonName,\s*sf\w+\.getCode\(\),\s*\{([\s\S]*?)\}\s*\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push({ name: m[1], fields: parseFieldList(m[2]) });
  return out;
}

function extractCommonFields() {
  const src = read("src/libxrpl/protocol/TxFormats.cpp");
  const block = src.slice(src.indexOf("getCommonFields()"), src.indexOf("return kCommonFields"));
  return parseFieldList(block);
}

// ---------- 9. Source metadata ----------

function sourceMeta() {
  const buildInfo = read("src/libxrpl/protocol/BuildInfo.cpp");
  const version = buildInfo.match(/versionString\s*=\s*"([^"]+)"/)?.[1];
  let commit: string | undefined;
  let commitDate: string | undefined;
  let branch: string | undefined;
  try {
    commit = execSync("git rev-parse HEAD", { cwd: RIPPLED }).toString().trim();
    commitDate = execSync("git log -1 --format=%cI", { cwd: RIPPLED }).toString().trim();
    branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: RIPPLED }).toString().trim();
  } catch {}
  return { version, commit, commitDate, branch, repo: "https://github.com/XRPLF/rippled", extractedAt: new Date().toISOString() };
}

// ---------- main ----------

const protocol = {
  source: sourceMeta(),
  transactions: extractTransactions(),
  txFlags: extractTxFlags(),
  ledgerFlags: extractLedgerFlags(),
  ledgerEntries: extractLedgerEntries(),
  features: extractFeatures(),
  results: extractResults(),
  sfields: extractSFields(),
  permissions: extractPermissions(),
  innerObjects: extractInnerObjects(),
  commonFields: extractCommonFields(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(protocol, null, 2));
console.log(
  `protocol.json: ${protocol.transactions.length} tx, ${protocol.ledgerEntries.length} ledger entries, ${protocol.features.length} amendments, ${protocol.results.length} TER, ${protocol.sfields.length} sfields, ${protocol.permissions.length} permissions, ${Object.keys(protocol.txFlags.byTx).length} tx with flags, ${Object.keys(protocol.ledgerFlags).length} objects with flags (rippled ${protocol.source.version} @ ${protocol.source.commit?.slice(0, 8)})`,
);
