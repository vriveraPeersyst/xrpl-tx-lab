"use client";
/**
 * One renderer per serialized type (server_definitions.TYPES naming).
 * The coverage lint checks that every type used by some transaction field
 * on testnet has an entry here. Each renderer receives the field's JSON value and returns
 * the new JSON value (or undefined for "no value").
 */
import type { ReactNode } from "react";

export interface RendererProps {
  field: string;
  value: unknown;
  onChange(v: unknown): void;
  hint?: string;
  required?: boolean;
  /** For STArray/STObject: inner object name and its fields. */
  inner?: { name: string; fields: { name: string; type: string; optionality: string }[] };
  /** For Flags: list of the transaction's flags. */
  flags?: { name: string; value: number; doc?: string }[];
  /** Enumerated values (e.g. asf* for SetFlag/ClearFlag): rendered as a select. */
  options?: { name: string; value: number; doc?: string }[];
}

export type Renderer = (p: RendererProps) => ReactNode;

const inputCls = "input mono";

function Text({ value, onChange, placeholder, mono = true, pattern }: { value: unknown; onChange(v: unknown): void; placeholder?: string; mono?: boolean; pattern?: RegExp }) {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  const bad = pattern && s && !pattern.test(s);
  return <input className={`${mono ? "input mono" : "input"}`} aria-invalid={bad ? "true" : undefined} value={s} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} spellCheck={false} />;
}

function UInt({ value, onChange, max, placeholder }: { value: unknown; onChange(v: unknown): void; max: number; placeholder?: string }) {
  const s = value == null ? "" : String(value);
  return <input className={inputCls} inputMode="numeric" value={s} placeholder={placeholder} onChange={(e) => { const v = e.target.value.trim(); if (v === "") return onChange(undefined); if (!/^\d+$/.test(v)) return; const n = Number(v); if (n <= max) onChange(n); }} />;
}

/** Amount: XRP in drops (string) or {currency, issuer, value} or MPT {mpt_issuance_id, value}. */
function AmountInput({ value, onChange }: RendererProps) {
  const kind = typeof value === "object" && value !== null ? ("mpt_issuance_id" in (value as object) ? "mpt" : "iou") : "xrp";
  const v = (value ?? {}) as Record<string, string>;
  const set = (k: string, val: string) => onChange({ ...(typeof value === "object" && value ? (value as object) : {}), [k]: val });
  return (
    <div className="space-y-2">
      <div className="seg">
        {(["xrp", "iou", "mpt"] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange(k === "xrp" ? "1000000" : k === "iou" ? { currency: "USD", issuer: "", value: "1" } : { mpt_issuance_id: "", value: "1" })} className="pill" aria-pressed={kind === k}>
            {k === "xrp" ? "XRP (drops)" : k === "iou" ? "Issued token" : "MPT"}
          </button>
        ))}
      </div>
      {kind === "xrp" && <Text value={value} onChange={onChange} placeholder="1000000 (= 1 XRP)" pattern={/^\d+$/} />}
      {kind === "iou" && (
        <div className="grid grid-cols-3 gap-2">
          <input className={inputCls} placeholder="USD" value={v.currency ?? ""} onChange={(e) => set("currency", e.target.value)} />
          <input className={inputCls} placeholder="issuer r…" value={v.issuer ?? ""} onChange={(e) => set("issuer", e.target.value)} />
          <input className={inputCls} placeholder="value" value={v.value ?? ""} onChange={(e) => set("value", e.target.value)} />
        </div>
      )}
      {kind === "mpt" && (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="mpt_issuance_id (48 hex)" value={v.mpt_issuance_id ?? ""} onChange={(e) => set("mpt_issuance_id", e.target.value)} />
          <input className={inputCls} placeholder="value" value={v.value ?? ""} onChange={(e) => set("value", e.target.value)} />
        </div>
      )}
    </div>
  );
}

/** Issue: {currency} for XRP, {currency, issuer} for IOU, {mpt_issuance_id} for MPT. */
function IssueInput({ value, onChange }: RendererProps) {
  const v = (value ?? { currency: "XRP" }) as Record<string, string>;
  const kind = "mpt_issuance_id" in v ? "mpt" : v.currency === "XRP" ? "xrp" : "iou";
  return (
    <div className="space-y-2">
      <div className="seg">
        {(["xrp", "iou", "mpt"] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange(k === "xrp" ? { currency: "XRP" } : k === "iou" ? { currency: "USD", issuer: "" } : { mpt_issuance_id: "" })} className="pill" aria-pressed={kind === k}>
            {k === "xrp" ? "XRP" : k === "iou" ? "Issued token" : "MPT"}
          </button>
        ))}
      </div>
      {kind === "iou" && (
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} placeholder="USD" value={v.currency ?? ""} onChange={(e) => onChange({ ...v, currency: e.target.value })} />
          <input className={inputCls} placeholder="issuer r…" value={v.issuer ?? ""} onChange={(e) => onChange({ ...v, issuer: e.target.value })} />
        </div>
      )}
      {kind === "mpt" && <input className={inputCls} placeholder="mpt_issuance_id (48 hex)" value={v.mpt_issuance_id ?? ""} onChange={(e) => onChange({ mpt_issuance_id: e.target.value })} />}
    </div>
  );
}

function FlagsInput({ value, onChange, flags = [] }: RendererProps) {
  const n = typeof value === "number" ? value : Number(value ?? 0) || 0;
  return (
    <div className="space-y-1">
      {flags.map((f) => (
        <label key={f.name} className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={(n & f.value) === f.value} onChange={(e) => onChange(e.target.checked ? (n | f.value) : (n & ~f.value) >>> 0 || undefined)} />
          <span><code className="mono">{f.name}</code> <span className="text-muted">0x{f.value.toString(16).padStart(8, "0")}</span>{f.doc ? <span className="block text-xs text-muted">{f.doc}</span> : null}</span>
        </label>
      ))}
      <div className="flex items-center gap-2 text-xs text-muted">Value: <UInt value={n || undefined} onChange={onChange} max={0xffffffff} placeholder="0" /></div>
    </div>
  );
}

function SelectInput({ value, onChange, options = [] }: RendererProps) {
  const v = value == null ? "" : String(value);
  const doc = options.find((o) => String(o.value) === v)?.doc;
  return (
    <div>
      <select className="input" value={v} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}>
        <option value="">— none —</option>
        {options.map((o) => <option key={o.name} value={o.value}>{o.value} · {o.name}</option>)}
      </select>
      {doc && <p className="hint">{doc}</p>}
    </div>
  );
}

function JsonInput({ value, onChange, placeholder }: { value: unknown; onChange(v: unknown): void; placeholder?: string }) {
  const s = value === undefined ? "" : JSON.stringify(value, null, 2);
  return <textarea className="input mono" value={s} placeholder={placeholder} spellCheck={false} onChange={(e) => { const t = e.target.value; if (!t.trim()) return onChange(undefined); try { onChange(JSON.parse(t)); } catch { /* keep editing */ } }} />;
}

function ArrayInput(p: RendererProps) {
  const inner = p.inner;
  const arr = Array.isArray(p.value) ? (p.value as Record<string, Record<string, unknown>>[]) : [];
  if (!inner) return <JsonInput value={p.value} onChange={p.onChange} placeholder="[ … ]" />;
  const update = (i: number, obj: Record<string, unknown>) => { const next = [...arr]; next[i] = { [inner.name]: obj }; p.onChange(next); };
  return (
    <div className="space-y-2">
      {arr.map((item, i) => {
        const obj = (item?.[inner.name] ?? {}) as Record<string, unknown>;
        return (
          <div key={i} className="subcard">
            <div className="mb-1 flex items-center justify-between text-xs text-muted"><span>{inner.name} #{i + 1}</span><button type="button" className="text-danger hover:underline" onClick={() => p.onChange(arr.filter((_, j) => j !== i))}>remove</button></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {inner.fields.map((f) => (
                <label key={f.name} className="block text-xs">
                  <span className="mb-1 block text-muted">{f.name}{f.optionality === "required" ? " *" : ""}</span>
                  {f.type === "STObject" || f.type === "STArray" ? <JsonInput value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} /> : f.type === "Amount" ? <AmountInput field={f.name} value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} /> : f.type.startsWith("UInt") ? <UInt value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} max={Number.MAX_SAFE_INTEGER} /> : <Text value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} />}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <button type="button" className="btn-secondary !px-3 !py-1 text-xs" onClick={() => p.onChange([...arr, { [inner.name]: {} }])}>+ add {inner.name}</button>
    </div>
  );
}

function BlobInput({ value, onChange, field }: RendererProps) {
  const s = typeof value === "string" ? value : "";
  const asText = (() => { try { return s && /^[0-9a-fA-F]*$/.test(s) && s.length % 2 === 0 ? decodeURIComponent(s.replace(/(..)/g, "%$1")) : ""; } catch { return ""; } })();
  const isKey = /PublicKey|Signature|Fulfillment|Condition|Proof|Encrypted|ElGamal|Bytecode/.test(field);
  return (
    <div className="space-y-1">
      <Text value={value} onChange={onChange} placeholder="hex" pattern={/^[0-9a-fA-F]*$/} />
      {!isKey && <input className="input text-xs" placeholder="…or type text and it converts to hex" value={asText} onChange={(e) => onChange(e.target.value ? Array.from(new TextEncoder().encode(e.target.value)).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("") : undefined)} />}
    </div>
  );
}

// eslint-disable-next-line react/display-name
const hashRenderer = (len: number): Renderer => (p) => <Text value={p.value} onChange={p.onChange} placeholder={`${len} hex characters`} pattern={new RegExp(`^[0-9a-fA-F]{${len}}$`)} />;

export const renderers: Record<string, Renderer> = {
  AccountID: (p) => <Text value={p.value} onChange={p.onChange} placeholder="r…" pattern={/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/} />,
  Amount: AmountInput,
  Issue: IssueInput,
  Currency: (p) => <Text value={p.value} onChange={p.onChange} placeholder="USD or 40 hex" />,
  UInt8: (p) => <UInt value={p.value} onChange={p.onChange} max={0xff} />,
  UInt16: (p) => <UInt value={p.value} onChange={p.onChange} max={0xffff} />,
  UInt32: (p) => (p.field === "Flags" ? <FlagsInput {...p} /> : p.options?.length ? <SelectInput {...p} /> : <UInt value={p.value} onChange={p.onChange} max={0xffffffff} />),
  UInt64: (p) => <Text value={p.value} onChange={p.onChange} placeholder="integer (decimal or hex) as string" />,
  Int32: (p) => <Text value={p.value} onChange={p.onChange} placeholder="signed integer" pattern={/^-?\d+$/} />,
  Number: (p) => <Text value={p.value} onChange={p.onChange} placeholder="decimal number as string" />,
  Hash128: hashRenderer(32),
  Hash160: hashRenderer(40),
  Hash192: hashRenderer(48),
  Hash256: hashRenderer(64),
  Blob: BlobInput,
  STArray: ArrayInput,
  STObject: (p) => <JsonInput value={p.value} onChange={p.onChange} placeholder='{ "…": … }' />,
  PathSet: (p) => <JsonInput value={p.value} onChange={p.onChange} placeholder='[[{"currency":"USD","issuer":"r…"}]]' />,
  Vector256: (p) => <JsonInput value={p.value} onChange={p.onChange} placeholder='["<hash 64 hex>", …]' />,
  XChainBridge: (p) => <JsonInput value={p.value} onChange={p.onChange} placeholder='{"LockingChainDoor":"r…","LockingChainIssue":{"currency":"XRP"},"IssuingChainDoor":"r…","IssuingChainIssue":{"currency":"XRP"}}' />,
  Unknown: (p) => <JsonInput value={p.value} onChange={p.onChange} />,
};

export function rendererFor(type: string): Renderer {
  return renderers[type] ?? renderers.Unknown;
}

/** Inner object that wraps each element of an STArray, by field name. */
export const ARRAY_INNER: Record<string, string> = {
  Memos: "Memo",
  Signers: "Signer",
  SignerEntries: "SignerEntry",
  AuthAccounts: "AuthAccount",
  BatchSigners: "BatchSigner",
  RawTransactions: "RawTransaction",
  Permissions: "Permission",
  AuthorizeCredentials: "Credential",
  UnauthorizeCredentials: "Credential",
  AcceptedCredentials: "Credential",
  PriceDataSeries: "PriceData",
  NFTokens: "NFToken",
  Majorities: "Majority",
  DisabledValidators: "DisabledValidator",
  VoteSlots: "VoteEntry",
};
