"use client";
/**
 * Un renderer por tipo serializado (nomenclatura de server_definitions.TYPES).
 * El lint de cobertura comprueba que todo tipo usado por algún campo de transacción
 * en testnet tiene entrada aquí. Cada renderer recibe el valor JSON del campo y devuelve
 * el nuevo valor JSON (o undefined para "sin valor").
 */
import type { ReactNode } from "react";

export interface RendererProps {
  field: string;
  value: unknown;
  onChange(v: unknown): void;
  hint?: string;
  required?: boolean;
  /** Para STArray/STObject: nombre del objeto interno y sus campos. */
  inner?: { name: string; fields: { name: string; type: string; optionality: string }[] };
  /** Para Flags: lista de flags de la transacción. */
  flags?: { name: string; value: number; doc?: string }[];
}

export type Renderer = (p: RendererProps) => ReactNode;

const inputCls = "w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent";

function Text({ value, onChange, placeholder, mono = true, pattern }: { value: unknown; onChange(v: unknown): void; placeholder?: string; mono?: boolean; pattern?: RegExp }) {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  const bad = pattern && s && !pattern.test(s);
  return <input className={`${inputCls} ${mono ? "" : "font-sans"} ${bad ? "border-danger" : ""}`} value={s} placeholder={placeholder} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} spellCheck={false} />;
}

function UInt({ value, onChange, max, placeholder }: { value: unknown; onChange(v: unknown): void; max: number; placeholder?: string }) {
  const s = value == null ? "" : String(value);
  return <input className={inputCls} inputMode="numeric" value={s} placeholder={placeholder} onChange={(e) => { const v = e.target.value.trim(); if (v === "") return onChange(undefined); if (!/^\d+$/.test(v)) return; const n = Number(v); if (n <= max) onChange(n); }} />;
}

/** Amount: XRP en drops (string) o {currency, issuer, value} o MPT {mpt_issuance_id, value}. */
function AmountInput({ value, onChange }: RendererProps) {
  const kind = typeof value === "object" && value !== null ? ("mpt_issuance_id" in (value as object) ? "mpt" : "iou") : "xrp";
  const v = (value ?? {}) as Record<string, string>;
  const set = (k: string, val: string) => onChange({ ...(typeof value === "object" && value ? (value as object) : {}), [k]: val });
  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-xs">
        {(["xrp", "iou", "mpt"] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange(k === "xrp" ? "1000000" : k === "iou" ? { currency: "USD", issuer: "", value: "1" } : { mpt_issuance_id: "", value: "1" })} className={`rounded px-2 py-1 ${kind === k ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}>
            {k === "xrp" ? "XRP (drops)" : k === "iou" ? "Token emitido" : "MPT"}
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

/** Issue: {currency} para XRP, {currency, issuer} para IOU, {mpt_issuance_id} para MPT. */
function IssueInput({ value, onChange }: RendererProps) {
  const v = (value ?? { currency: "XRP" }) as Record<string, string>;
  const kind = "mpt_issuance_id" in v ? "mpt" : v.currency === "XRP" ? "xrp" : "iou";
  return (
    <div className="space-y-2">
      <div className="flex gap-1 text-xs">
        {(["xrp", "iou", "mpt"] as const).map((k) => (
          <button key={k} type="button" onClick={() => onChange(k === "xrp" ? { currency: "XRP" } : k === "iou" ? { currency: "USD", issuer: "" } : { mpt_issuance_id: "" })} className={`rounded px-2 py-1 ${kind === k ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"}`}>
            {k === "xrp" ? "XRP" : k === "iou" ? "Token emitido" : "MPT"}
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
          <span><code className="text-accent">{f.name}</code> <span className="text-muted">0x{f.value.toString(16).padStart(8, "0")}</span>{f.doc ? <span className="block text-xs text-muted">{f.doc}</span> : null}</span>
        </label>
      ))}
      <div className="flex items-center gap-2 text-xs text-muted">Valor: <UInt value={n || undefined} onChange={onChange} max={0xffffffff} placeholder="0" /></div>
    </div>
  );
}

function JsonInput({ value, onChange, placeholder }: { value: unknown; onChange(v: unknown): void; placeholder?: string }) {
  const s = value === undefined ? "" : JSON.stringify(value, null, 2);
  return <textarea className={`${inputCls} min-h-24`} value={s} placeholder={placeholder} spellCheck={false} onChange={(e) => { const t = e.target.value; if (!t.trim()) return onChange(undefined); try { onChange(JSON.parse(t)); } catch { /* seguir editando */ } }} />;
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
          <div key={i} className="rounded-md border border-border p-2">
            <div className="mb-1 flex items-center justify-between text-xs text-muted"><span>{inner.name} #{i + 1}</span><button type="button" className="text-danger" onClick={() => p.onChange(arr.filter((_, j) => j !== i))}>quitar</button></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {inner.fields.map((f) => (
                <label key={f.name} className="text-xs">
                  <span className="text-muted">{f.name}{f.optionality === "required" ? " *" : ""}</span>
                  {f.type === "STObject" || f.type === "STArray" ? <JsonInput value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} /> : f.type === "Amount" ? <AmountInput field={f.name} value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} /> : f.type.startsWith("UInt") ? <UInt value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} max={Number.MAX_SAFE_INTEGER} /> : <Text value={obj[f.name]} onChange={(v) => update(i, { ...obj, [f.name]: v })} />}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      <button type="button" className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent" onClick={() => p.onChange([...arr, { [inner.name]: {} }])}>+ añadir {inner.name}</button>
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
      {!isKey && <input className={`${inputCls} font-sans text-xs`} placeholder="…o escribe texto y se convierte a hex" value={asText} onChange={(e) => onChange(e.target.value ? Array.from(new TextEncoder().encode(e.target.value)).map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("") : undefined)} />}
    </div>
  );
}

// eslint-disable-next-line react/display-name
const hashRenderer = (len: number): Renderer => (p) => <Text value={p.value} onChange={p.onChange} placeholder={`${len} caracteres hex`} pattern={new RegExp(`^[0-9a-fA-F]{${len}}$`)} />;

export const renderers: Record<string, Renderer> = {
  AccountID: (p) => <Text value={p.value} onChange={p.onChange} placeholder="r…" pattern={/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/} />,
  Amount: AmountInput,
  Issue: IssueInput,
  Currency: (p) => <Text value={p.value} onChange={p.onChange} placeholder="USD o 40 hex" />,
  UInt8: (p) => <UInt value={p.value} onChange={p.onChange} max={0xff} />,
  UInt16: (p) => <UInt value={p.value} onChange={p.onChange} max={0xffff} />,
  UInt32: (p) => (p.field === "Flags" ? <FlagsInput {...p} /> : <UInt value={p.value} onChange={p.onChange} max={0xffffffff} />),
  UInt64: (p) => <Text value={p.value} onChange={p.onChange} placeholder="entero (decimal o hex) como string" />,
  Int32: (p) => <Text value={p.value} onChange={p.onChange} placeholder="entero con signo" pattern={/^-?\d+$/} />,
  Number: (p) => <Text value={p.value} onChange={p.onChange} placeholder="número decimal como string" />,
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

/** Objeto interno que envuelve cada elemento de un STArray, por nombre de campo. */
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
