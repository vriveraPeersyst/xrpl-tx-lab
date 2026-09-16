"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useXaman } from "@/lib/xaman/provider";
import { useXamanSign } from "@/lib/xaman/use-sign";
import { rendererFor, ARRAY_INNER } from "@/lib/form/renderers";
import { fillPlaceholders } from "@/lib/form/placeholders";
import { accountInfo, simulate, txByHash, TESTNET_EXPLORER, RpcError } from "@/lib/xrpl/rpc";
import { TxResult } from "./TxResult";

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
}

const HIDDEN_COMMON = new Set(["TransactionType", "Account", "SigningPubKey", "TxnSignature", "Signers", "Fee", "Sequence", "LastLedgerSequence", "PreviousTxnID", "NetworkID", "OperationLimit", "SponsorSignature", "SponsorFlags", "AccountTxnID"]);

export function TxBuilder(p: BuilderProps) {
  const xaman = useXaman();
  const signer = useXamanSign();
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
    accountInfo(xaman.account).then((r) => setSeq(r.account_data.Sequence)).catch(() => setSeq(undefined));
  }, [xaman.account]);

  const loadExample = useCallback(() => {
    const filled = fillPlaceholders(p.example, { account: xaman.account, seq });
    setTx({ ...filled, TransactionType: p.name, Account: xaman.account ?? filled.Account });
    setSim({ loading: false });
    setFinal({ loading: false });
    signer.reset();
  }, [p.example, p.name, xaman.account, seq, signer]);

  useEffect(() => { loadExample(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [xaman.account, seq]);

  const set = (k: string, v: unknown) => setTx((t) => { const n = { ...t }; if (v === undefined || v === "" ) delete n[k]; else n[k] = v; return n; });
  const json = useMemo(() => JSON.stringify(tx, null, 2), [tx]);
  useEffect(() => { if (!raw) setRawText(json); }, [json, raw]);

  const missing = p.fields.filter((f) => f.optionality === "required" && f.inTestnet && tx[f.name] === undefined).map((f) => f.name);
  const problems: string[] = [];
  if (!xaman.account) problems.push("Conecta Xaman para rellenar Account y firmar.");
  if (missing.length) problems.push(`Faltan campos obligatorios: ${missing.join(", ")}.`);
  if (p.amendmentGate && !p.amendmentGate.enabled) problems.push(`El amendment ${p.amendmentGate.name} no está activo en testnet: el nodo devolverá temDISABLED.`);

  const runSimulate = async () => {
    setSim({ loading: true });
    try {
      const r = await simulate(tx);
      setSim({ loading: false, result: r });
    } catch (e) {
      setSim({ loading: false, error: e instanceof RpcError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : String(e) });
    }
  };

  const runSign = async () => {
    setFinal({ loading: false });
    const res = await signer.sign(tx, `${p.name} · XRPL Tx Lab (testnet)`);
    if (res?.meta.signed && res.response.txid) {
      setFinal({ loading: true });
      // El tx tarda unos segundos en validarse; reintentamos.
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const t = await txByHash(res.response.txid);
          if (t.validated) { setFinal({ loading: false, tx: t }); return; }
        } catch { /* txnNotFound todavía */ }
      }
      setFinal({ loading: false, error: "No se encontró la transacción validada tras 30 s. Consulta el explorador." });
    }
  };

  if (p.pseudo) return <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">Esta es una pseudo-transacción: la emite la propia red durante el cierre del ledger y no puede enviarla ninguna cuenta.</div>;

  const visibleFields = p.fields.filter((f) => f.inTestnet);
  const commonVisible = p.commonFields.filter((f) => !HIDDEN_COMMON.has(f.name));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" className="btn-secondary" onClick={loadExample}>Cargar ejemplo</button>
          <button type="button" className="btn-secondary" onClick={() => { setRaw(!raw); setRawErr(null); }}>{raw ? "Formulario" : "Editar JSON"}</button>
          <button type="button" className="btn-secondary" onClick={() => setShowCommon(!showCommon)}>{showCommon ? "Ocultar comunes" : "Campos comunes"}</button>
        </div>
        {p.prerequisites?.length ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><b>Antes de enviar:</b><ul className="ml-4 list-disc">{p.prerequisites.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ) : null}
        {raw ? (
          <div>
            <textarea className="min-h-80 w-full rounded-md border border-border bg-surface p-3 font-mono text-xs" value={rawText} spellCheck={false} onChange={(e) => { setRawText(e.target.value); try { const v = JSON.parse(e.target.value); setTx(v); setRawErr(null); } catch (err) { setRawErr(err instanceof Error ? err.message : "JSON inválido"); } }} />
            {rawErr && <p className="text-xs text-danger">{rawErr}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleFields.map((f) => <FieldRow key={f.name} f={f} value={tx[f.name]} onChange={(v) => set(f.name, v)} flags={p.flags} innerObjects={p.innerObjects} />)}
            {showCommon && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs text-muted">Campos comunes a todas las transacciones. Fee, Sequence y LastLedgerSequence los rellena Xaman automáticamente.</p>
                {commonVisible.map((f) => <FieldRow key={f.name} f={f} value={tx[f.name]} onChange={(v) => set(f.name, v)} flags={p.flags} innerObjects={p.innerObjects} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <pre className="max-h-96 overflow-auto rounded-md border border-border bg-surface-2 p-3 text-xs">{json}</pre>
        {problems.length > 0 && <ul className="space-y-1 text-sm text-warning">{problems.map((x) => <li key={x}>⚠ {x}</li>)}</ul>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={sim.loading} onClick={runSimulate}>{sim.loading ? "Simulando…" : "Simular (sin firmar)"}</button>
          {xaman.account ? (
            <button type="button" className="btn-primary" disabled={signer.status === "creating" || signer.status === "awaiting" || missing.length > 0} onClick={runSign}>{signer.status === "creating" ? "Creando payload…" : signer.status === "awaiting" ? "Esperando firma…" : "Firmar y enviar con Xaman"}</button>
          ) : (
            <button type="button" className="btn-primary" disabled={!xaman.configured || xaman.connecting} onClick={xaman.connect}>{xaman.configured ? "Conectar Xaman" : "Xaman no configurado"}</button>
          )}
          <button type="button" className="btn-secondary" onClick={() => navigator.clipboard.writeText(json)}>Copiar JSON</button>
        </div>

        {sim.error && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">Error al simular: {sim.error}</div>}
        {sim.result && (
          <div className="rounded-lg border border-border p-3">
            <h4 className="mb-2 text-sm font-semibold">Simulación (RPC <code>simulate</code>, sin firma ni fee)</h4>
            <TxResult engineResult={sim.result.engine_result} message={sim.result.engine_result_message} meta={sim.result.meta} txJson={sim.result.tx_json} />
          </div>
        )}

        {signer.status === "awaiting" && signer.created && (
          <div className="rounded-lg border border-accent/50 bg-surface p-4">
            <p className="mb-2 text-sm font-semibold">Firma en Xaman</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <img src={signer.created.refs.qr_png} alt="QR de firma Xaman" className="h-44 w-44 rounded bg-white p-1" />
              <div className="space-y-2 text-sm">
                <p>Escanea el QR con la app Xaman (red <b>Testnet</b>) o abre el enlace en el móvil.</p>
                <a className="btn-primary inline-block" href={signer.created.next.always} target="_blank" rel="noreferrer">Abrir en Xaman</a>
                <button type="button" className="btn-secondary block" onClick={signer.cancel}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        {(signer.status === "rejected" || signer.status === "expired" || signer.status === "error") && <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm">{signer.error}</div>}
        {signer.status === "signed" && signer.txid && (
          <div className="rounded-lg border border-success/50 p-3 text-sm">
            <p>Firmada y enviada. Hash: <a className="link" href={`${TESTNET_EXPLORER}/transactions/${signer.txid}`} target="_blank" rel="noreferrer">{signer.txid}</a></p>
            {signer.resolved?.response.dispatched_result && <p className="text-muted">Resultado preliminar del nodo: <code>{signer.resolved.response.dispatched_result}</code></p>}
            {final.loading && <p className="text-muted">Esperando validación…</p>}
            {final.error && <p className="text-warning">{final.error}</p>}
            {final.tx && <TxResult engineResult={String((final.tx.meta as Record<string, unknown>)?.TransactionResult ?? "")} meta={final.tx.meta as Record<string, unknown>} txJson={(final.tx.tx_json ?? final.tx) as Record<string, unknown>} validated hash={signer.txid} />}
          </div>
        )}
        <p className="text-xs text-muted">Todo se firma y envía a la <b>XRPL Testnet</b> (force_network=TESTNET). Las sesiones de Xaman viven en tu navegador. <Link href="/account" className="link">Ver mi cuenta</Link>.</p>
      </div>
    </div>
  );
}

function FieldRow({ f, value, onChange, flags, innerObjects }: { f: BuilderField; value: unknown; onChange(v: unknown): void; flags: BuilderProps["flags"]; innerObjects: BuilderProps["innerObjects"] }) {
  const R = rendererFor(f.type);
  const innerName = ARRAY_INNER[f.name];
  const inner = innerName && innerObjects[innerName] ? { name: innerName, fields: innerObjects[innerName] } : innerName === "Memo" ? { name: "Memo", fields: [{ name: "MemoType", type: "Blob", optionality: "optional" }, { name: "MemoData", type: "Blob", optionality: "optional" }, { name: "MemoFormat", type: "Blob", optionality: "optional" }] } : innerName === "RawTransaction" ? { name: "RawTransaction", fields: [] } : undefined;
  return (
    <div>
      <label className="mb-1 flex items-baseline justify-between text-sm">
        <span><Link className="font-mono hover:underline" href={`/fields/${f.name}`}>{f.name}</Link>{f.optionality === "required" ? <span className="ml-1 text-danger">*</span> : null}{f.optionality === "default" ? <span className="ml-1 text-xs text-muted">(por defecto)</span> : null}</span>
        <span className="text-xs text-muted">{f.type}{f.mptSupported ? " · MPT" : ""}</span>
      </label>
      <R field={f.name} value={value} onChange={onChange} hint={f.hint} required={f.optionality === "required"} flags={f.name === "Flags" ? flags : undefined} inner={inner?.fields.length ? inner : undefined} />
      {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
    </div>
  );
}
