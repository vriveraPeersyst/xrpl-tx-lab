"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useXaman } from "@/lib/xaman/provider";
import { accountInfo, accountObjects, accountTx, dropsToXrp, fundFromFaucet, TESTNET_EXPLORER, type AccountInfo } from "@/lib/xrpl/rpc";
import { testnet, protocol } from "@/lib/protocol";

export default function AccountPage() {
  const x = useXaman();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [objects, setObjects] = useState<Record<string, unknown>[]>([]);
  const [txs, setTxs] = useState<{ tx_json?: Record<string, unknown>; tx?: Record<string, unknown>; meta?: Record<string, unknown>; hash?: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);

  const load = useCallback(async () => {
    if (!x.account) return;
    setErr(null);
    try {
      const [i, o, t] = await Promise.all([accountInfo(x.account).catch((e) => { if (String(e?.code) === "actNotFound") return null; throw e; }), accountObjects(x.account).catch(() => ({ account_objects: [] })), accountTx(x.account).catch(() => ({ transactions: [] }))]);
      setInfo(i);
      setObjects(o.account_objects);
      setTxs(t.transactions);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [x.account]);
  useEffect(() => { void load(); }, [load]);

  if (!x.configured) return <div className="card">Falta <code>NEXT_PUBLIC_XAMAN_API_KEY</code>. Crea una app en <a className="link" href="https://apps.xaman.dev" target="_blank" rel="noreferrer">apps.xaman.dev</a>, añade el origen de esta web y pon la API key pública en <code>.env.local</code>.</div>;
  if (!x.account) return <div className="card space-y-3"><p>Conecta tu cuenta de Xaman para ver saldo, objetos y transacciones en testnet.</p><button className="btn-primary" onClick={x.connect} disabled={!x.ready || x.connecting}>Conectar Xaman</button>{x.error && <p className="text-sm text-danger">{x.error}</p>}<p className="text-xs text-muted">En la app Xaman, activa la red <b>Testnet</b> (Ajustes → Avanzado → Red). Los payloads de esta web se fuerzan a testnet igualmente.</p></div>;

  const fund = async () => { setFunding(true); try { await fundFromFaucet(x.account!); await new Promise((r) => setTimeout(r, 5000)); await load(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setFunding(false); } };
  const byType = objects.reduce<Record<string, number>>((acc, o) => { const t = String(o.LedgerEntryType); acc[t] = (acc[t] ?? 0) + 1; return acc; }, {});
  const flags = info ? protocol.ledgerFlags.AccountRoot?.filter((f) => (info.account_data.Flags & f.value) === f.value) ?? [] : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-3"><h1 className="text-2xl font-bold">Mi cuenta</h1><a className="link font-mono text-sm" href={`${TESTNET_EXPLORER}/accounts/${x.account}`} target="_blank" rel="noreferrer">{x.account} ↗</a><button className="btn-secondary ml-auto" onClick={load}>Actualizar</button></div>
      {err && <p className="text-sm text-danger">{err}</p>}
      {!info ? (
        <div className="card space-y-2"><p>Esta cuenta <b>no existe todavía en testnet</b>. Pide XRP al faucet para activarla (reserva base: {testnet.reserves.baseXrp} XRP).</p><button className="btn-primary" disabled={funding} onClick={fund}>{funding ? "Pidiendo al faucet…" : "Financiar con el faucet de testnet"}</button></div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card"><div className="text-xs uppercase text-muted">Saldo</div><div className="text-2xl font-semibold">{dropsToXrp(info.account_data.Balance)} XRP</div><div className="text-xs text-muted">reserva: {testnet.reserves.baseXrp + info.account_data.OwnerCount * testnet.reserves.incXrp} XRP ({info.account_data.OwnerCount} objetos)</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Sequence</div><div className="text-2xl font-semibold">{info.account_data.Sequence}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Objetos</div><div className="text-2xl font-semibold">{objects.length}</div><div className="text-xs text-muted">{Object.entries(byType).map(([t, n]) => `${n} ${t}`).join(" · ")}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Faucet</div><button className="btn-secondary mt-1" disabled={funding} onClick={fund}>{funding ? "…" : "+ XRP de testnet"}</button></div>
          </section>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Flags de la cuenta (<Link href="/objects/AccountRoot" className="link">AccountRoot</Link>)</h2>
              {flags.length ? <ul className="text-sm">{flags.map((f) => <li key={f.name} className="font-mono">{f.name}</li>)}</ul> : <p className="text-sm text-muted">Ninguno. Prueba <Link className="link" href="/tx/AccountSet">AccountSet</Link>.</p>}
              {info.account_data.RegularKey && <p className="mt-2 text-xs">RegularKey: <span className="font-mono">{String(info.account_data.RegularKey)}</span></p>}
              {info.account_data.Domain && <p className="text-xs">Domain: <span className="font-mono">{String(info.account_data.Domain)}</span></p>}
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">Objetos ({objects.length})</h2>
              <ul className="max-h-72 space-y-1 overflow-auto text-sm">{objects.map((o, i) => <li key={i} className="flex gap-2"><Link href={`/objects/${String(o.LedgerEntryType)}`} className="font-mono hover:underline">{String(o.LedgerEntryType)}</Link><span className="truncate font-mono text-xs text-muted">{String(o.index ?? "").slice(0, 16)}…</span></li>)}{objects.length === 0 && <li className="text-muted">Sin objetos. Crea uno con <Link className="link" href="/tx/EscrowCreate">EscrowCreate</Link> o <Link className="link" href="/tx/TrustSet">TrustSet</Link>.</li>}</ul>
            </div>
          </section>
          <section className="card">
            <h2 className="mb-2 font-semibold">Últimas transacciones</h2>
            <table className="tbl"><thead><tr><th>Tipo</th><th>Resultado</th><th>Ledger</th><th>Hash</th></tr></thead><tbody>{txs.map((t, i) => { const tj = (t.tx_json ?? t.tx ?? {}) as Record<string, unknown>; const res = String((t.meta as Record<string, unknown>)?.TransactionResult ?? ""); return <tr key={i}><td><Link href={`/tx/${String(tj.TransactionType)}`} className="font-mono hover:underline">{String(tj.TransactionType)}</Link></td><td><Link href={`/results#${res}`} className={`font-mono text-xs ${res === "tesSUCCESS" ? "text-success" : "text-warning"}`}>{res}</Link></td><td className="text-xs text-muted">{String(tj.ledger_index ?? "")}</td><td><a className="link font-mono text-xs" href={`${TESTNET_EXPLORER}/transactions/${String(t.hash ?? tj.hash ?? "")}`} target="_blank" rel="noreferrer">{String(t.hash ?? tj.hash ?? "").slice(0, 16)}…</a></td></tr>; })}</tbody></table>
          </section>
        </>
      )}
    </div>
  );
}
