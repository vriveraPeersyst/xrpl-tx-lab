"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/NLink";
import { useNetwork } from "@/lib/net-context";
import { useXaman } from "@/lib/xaman/provider";
import { useXamanSign } from "@/lib/xaman/use-sign";
import { rendererFor, ARRAY_INNER } from "@/lib/form/renderers";
import { fillPlaceholders } from "@/lib/form/placeholders";
import { accountInfo, simulate, txByHash, explorerTx, RpcError } from "@/lib/xrpl/rpc";
import { TxResult } from "./TxResult";
import { useSearchParams } from "next/navigation";
import { decodePrefill } from "@/lib/wallet/actions";

export interface BuilderField { name: string; type: string; optionality: "required" | "optional" | "default"; inTestnet: boolean; common?: boolean; hint?: string; mptSupported?: boolean }
export interface BuilderProps {
  name: string;
  fields: BuilderField[];
  commonFields: BuilderField[];
  flags: { name: string; value: number; doc?: string }[];
  innerObjects: Record<string, { name: string; type: string; optionality: string }[]>;
  example: Record<string, unknown>;
  prerequisites?: string[];
  amendmentGate?: { name: string; enabled: boolean };
  pseudo?: boolean;
  /** asf* values for AccountSet's SetFlag/ClearFlag. */
  asf?: { name: string; value: number; doc?: string }[];
}

const HIDDEN_COMMON = new Set(["TransactionType", "Account", "SigningPubKey", "TxnSignature", "Signers", "Fee", "Sequence", "LastLedgerSequence", "PreviousTxnID", "NetworkID", "OperationLimit", "SponsorSignature", "SponsorFlags", "AccountTxnID"]);

export function TxBuilder(p: BuilderProps) {
  const xaman = useXaman();
  const net = useNetwork();
  const signer = useXamanSign();
  const params = useSearchParams();
  const prefill = useMemo(() => { const q = params.get("prefill"); return q ? decodePrefill(q) : undefined; }, [params]);
  const [tx, setTx] = useState<Record<string, unknown>>({ TransactionType: p.name });
  const [raw, setRaw] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rawErr, setRawErr] = useState<string | null>(null);
  const [showCommon, setShowCommon] = useState(false);
  const [sim, setSim] = useState<{ loading: boolean; result?: Awaited<ReturnType<typeof simulate>>; error?: string }>({ loading: false });
  const [final, setFinal] = useState<{ loading: boolean; tx?: Record<string, unknown>; error?: string }>({ loading: false });
  const [seq, setSeq] = useState<number | undefined>();

  useEffect(() => {
    if (!xaman.account) return;
    accountInfo(net, xaman.account).then((r) => setSeq(r.account_data.Sequence)).catch(() => setSeq(undefined));
  }, [xaman.account, net]);

  const loadExample = useCallback(() => {
    const filled = fillPlaceholders(prefill ?? p.example, { account: xaman.account, seq });
    setTx({ ...filled, TransactionType: p.name, Account: xaman.account ?? filled.Account });
    setSim({ loading: false });
    setFinal({ loading: false });
    signer.reset();
  }, [p.example, p.name, xaman.account, seq, signer, prefill]);

  useEffect(() => { void Promise.resolve().then(loadExample); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [xaman.account, seq, prefill]);

  const set = (k: string, v: unknown) => setTx((t) => { const n = { ...t }; if (v === undefined || v === "" ) delete n[k]; else n[k] = v; return n; });
  const json = useMemo(() => JSON.stringify(tx, null, 2), [tx]);

  const missing = p.fields.filter((f) => f.optionality === "required" && f.inTestnet && tx[f.name] === undefined).map((f) => f.name);
  const problems: string[] = [];
  if (!xaman.account) problems.push("Connect Xaman to fill in Account and sign.");
  if (missing.length) problems.push(`Missing required fields: ${missing.join(", ")}.`);
  if (p.amendmentGate && !p.amendmentGate.enabled) problems.push(`The ${p.amendmentGate.name} amendment is not active on ${net.label}: the node will return temDISABLED.`);
  if (net.mainnet) problems.push("Mainnet: this transaction is real. Simulate first; Xaman will ask you to confirm on the device as well.");
  if (!net.xaman) problems.push(`Xaman cannot sign on ${net.label}. You can still simulate here, or copy the JSON and sign it with another tool.`);

  const runSimulate = async () => {
    setSim({ loading: true });
    try {
      const r = await simulate(net, tx);
      setSim({ loading: false, result: r });
    } catch (e) {
      setSim({ loading: false, error: e instanceof RpcError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : String(e) });
    }
  };

  const runSign = async () => {
    if (net.mainnet && !window.confirm(`You are about to sign a real ${p.name} on Mainnet. It will cost real XRP and cannot be undone. Continue?`)) return;
    setFinal({ loading: false });
    const res = await signer.sign(tx, `${p.name} · XRPL Tx Lab (${net.label})`, net.xaman);
    if (res?.meta.signed && res.response.txid) {
      setFinal({ loading: true });
      // The tx takes a few seconds to validate; we retry.
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const t = await txByHash(net, res.response.txid);
          if (t.validated) { setFinal({ loading: false, tx: t }); return; }
        } catch { /* txnNotFound still */ }
      }
      setFinal({ loading: false, error: "The validated transaction was not found after 30s. Check the explorer." });
    }
  };

  if (p.pseudo) return <div className="rounded-[2px] border border-border bg-surface p-4 text-sm text-muted">This is a pseudo-transaction: the network itself emits it during ledger close, and no account can send it.</div>;

  const visibleFields = p.fields.filter((f) => f.inTestnet);
  const commonVisible = p.commonFields.filter((f) => !HIDDEN_COMMON.has(f.name));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="btn-secondary" onClick={loadExample}>Load example</button>
          <button type="button" className="btn-secondary" onClick={() => { setRawText(json); setRaw(!raw); setRawErr(null); }}>{raw ? "Form" : "Edit JSON"}</button>
          <button type="button" className="btn-secondary" onClick={() => setShowCommon(!showCommon)}>{showCommon ? "Hide common" : "Common fields"}</button>
        </div>
        {p.prerequisites?.length ? (
          <div className="notice notice-warn"><b>Before sending:</b><ul className="ml-4 list-disc">{p.prerequisites.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ) : null}
        {raw ? (
          <div>
            <textarea className="input mono min-h-80 text-xs" value={rawText} spellCheck={false} onChange={(e) => { setRawText(e.target.value); try { const v = JSON.parse(e.target.value); setTx(v); setRawErr(null); } catch (err) { setRawErr(err instanceof Error ? err.message : "Invalid JSON"); } }} />
            {rawErr && <p className="text-xs text-danger">{rawErr}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleFields.map((f) => <FieldRow key={f.name} f={f} value={tx[f.name]} onChange={(v) => set(f.name, v)} flags={p.flags} innerObjects={p.innerObjects} options={f.name === "SetFlag" || f.name === "ClearFlag" ? p.asf : undefined} />)}
            {showCommon && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted">Fields common to all transactions. Xaman fills Fee, Sequence and LastLedgerSequence automatically.</p>
                {commonVisible.map((f) => <FieldRow key={f.name} f={f} value={tx[f.name]} onChange={(v) => set(f.name, v)} flags={p.flags} innerObjects={p.innerObjects} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <pre className="code-block-dark max-h-96">{json}</pre>
        {problems.length > 0 && <ul className="notice notice-warn space-y-1">{problems.map((x) => <li key={x}>⚠ {x}</li>)}</ul>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={sim.loading} onClick={runSimulate}>{sim.loading ? "Simulating…" : "Simulate (no signing)"}</button>
          {xaman.account ? (
            <button type="button" className="btn-primary" disabled={!net.xaman || signer.status === "creating" || signer.status === "awaiting" || missing.length > 0} onClick={runSign} title={net.xaman ? undefined : `Xaman cannot sign on ${net.label}`}>{signer.status === "creating" ? "Creating payload…" : signer.status === "awaiting" ? "Waiting for signature…" : "Sign and submit with Xaman"}</button>
          ) : (
            <button type="button" className="btn-primary" disabled={!xaman.configured || xaman.connecting} onClick={xaman.connect}>{xaman.configured ? "Connect Xaman" : "Xaman not configured"}</button>
          )}
          <button type="button" className="btn-secondary" onClick={() => navigator.clipboard.writeText(json)}>Copy JSON</button>
        </div>

        {sim.error && <div className="notice notice-error">Simulation error: {sim.error}</div>}
        {sim.result && (
          <div className="card">
            <h4 className="mb-2 text-sm font-semibold">Simulation (RPC <code>simulate</code>, no signature or fee)</h4>
            <TxResult engineResult={sim.result.engine_result} message={sim.result.engine_result_message} meta={sim.result.meta} txJson={sim.result.tx_json} />
          </div>
        )}

        {signer.status === "awaiting" && signer.created && (
          <div className="card-green grid-lines"><div className="relative">
            <p className="mb-2 text-sm font-semibold">Sign in Xaman</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <img src={signer.created.refs.qr_png} alt="Xaman signing QR" className="h-44 w-44 rounded bg-white p-1" />
              <div className="space-y-2 text-sm">
                <p>Scan the QR with the Xaman app (<b>{net.label}</b> network) or open the link on mobile.</p>
                <a className="btn-primary inline-block" href={signer.created.next.always} target="_blank" rel="noreferrer">Open in Xaman</a>
                <button type="button" className="btn-secondary block" onClick={signer.cancel}>Cancel</button>
              </div>
            </div>
          </div></div>
        )}
        {(signer.status === "rejected" || signer.status === "expired" || signer.status === "error") && <div className="notice notice-error">{signer.error}</div>}
        {signer.status === "signed" && signer.txid && (
          <div className="notice notice-ok">
            <p>Signed and submitted. Hash: {explorerTx(net, signer.txid) ? <a className="link" href={explorerTx(net, signer.txid)} target="_blank" rel="noreferrer">{signer.txid}</a> : <span className="font-mono">{signer.txid}</span>}</p>
            {signer.resolved?.response.dispatched_result && <p className="text-muted">Preliminary node result: <code>{signer.resolved.response.dispatched_result}</code></p>}
            {final.loading && <p className="text-muted">Waiting for validation…</p>}
            {final.error && <p className="text-warning">{final.error}</p>}
            {final.tx && <TxResult engineResult={String((final.tx.meta as Record<string, unknown>)?.TransactionResult ?? "")} meta={final.tx.meta as Record<string, unknown>} txJson={(final.tx.tx_json ?? final.tx) as Record<string, unknown>} validated hash={signer.txid} />}
          </div>
        )}
        <p className="text-xs text-muted">Everything is signed and sent to <b>{net.label}</b>{net.xaman ? ` (force_network=${net.xaman})` : ""}. Xaman sessions live in your browser. <Link href="/account" className="link">View my account</Link>.</p>
      </div>
    </div>
  );
}

function FieldRow({ f, value, onChange, flags, innerObjects, options }: { f: BuilderField; value: unknown; onChange(v: unknown): void; flags: BuilderProps["flags"]; innerObjects: BuilderProps["innerObjects"]; options?: BuilderProps["asf"] }) {
  const R = rendererFor(f.type);
  const innerName = ARRAY_INNER[f.name];
  const inner = innerName && innerObjects[innerName] ? { name: innerName, fields: innerObjects[innerName] } : innerName === "Memo" ? { name: "Memo", fields: [{ name: "MemoType", type: "Blob", optionality: "optional" }, { name: "MemoData", type: "Blob", optionality: "optional" }, { name: "MemoFormat", type: "Blob", optionality: "optional" }] } : innerName === "RawTransaction" ? { name: "RawTransaction", fields: [] } : undefined;
  return (
    <div>
      <label className="field-label">
        <span><Link className="font-mono hover:underline" href={`/fields/${f.name}`}>{f.name}</Link>{f.optionality === "required" ? <span className="ml-1 text-danger">*</span> : null}{f.optionality === "default" ? <span className="ml-1 text-xs text-muted">(default)</span> : null}</span>
        <span className="field-type mono">{f.type}{f.mptSupported ? " · MPT" : ""}</span>
      </label>
      {R({ field: f.name, value, onChange, hint: f.hint, required: f.optionality === "required", flags: f.name === "Flags" ? flags : undefined, inner: inner?.fields.length ? inner : undefined, options })}
      {f.hint && <p className="hint">{f.hint}</p>}
    </div>
  );
}
