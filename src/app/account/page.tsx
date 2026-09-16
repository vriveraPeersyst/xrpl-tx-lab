"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useXaman } from "@/lib/xaman/provider";
import { accountInfo, accountObjects, accountTx, dropsToXrp, fundFromFaucet, rpc, TESTNET_EXPLORER, type AccountInfo } from "@/lib/xrpl/rpc";
import { testnet, protocol } from "@/lib/protocol";
import { RESERVE_RULES, accountReserveXrp, formatXrp } from "@/lib/reserves";
import { actionsFor, nftActions, quickActions, encodePrefill, type WalletAction } from "@/lib/wallet/actions";

type Obj = Record<string, unknown>;

function ActionLink({ a }: { a: WalletAction }) {
  const cls = a.kind === "primary" ? "btn-primary" : a.kind === "danger" ? "btn-secondary text-danger" : "btn-secondary";
  return <Link href={`/tx/${String(a.tx.TransactionType)}?prefill=${encodePrefill(a.tx)}#builder`} className={`${cls} !px-2 !py-1 text-xs`}>{a.label}</Link>;
}

export default function AccountPage() {
  const x = useXaman();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [objects, setObjects] = useState<Obj[]>([]);
  const [nfts, setNfts] = useState<Obj[]>([]);
  const [lines, setLines] = useState<Obj[]>([]);
  const [txs, setTxs] = useState<{ tx_json?: Obj; tx?: Obj; meta?: Obj; hash?: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    if (!x.account) return;
    setErr(null);
    setLoading(true);
    try {
      const [i, o, t, n, l] = await Promise.all([
        accountInfo(x.account).catch((e) => { if (String(e?.code) === "actNotFound") return null; throw e; }),
        accountObjects(x.account).catch(() => ({ account_objects: [] as Obj[] })),
        accountTx(x.account).catch(() => ({ transactions: [] })),
        rpc<{ account_nfts: Obj[] }>("account_nfts", { account: x.account, ledger_index: "validated" }).catch(() => ({ account_nfts: [] as Obj[] })),
        rpc<{ lines: Obj[] }>("account_lines", { account: x.account, ledger_index: "validated" }).catch(() => ({ lines: [] as Obj[] })),
      ]);
      setInfo(i); setObjects(o.account_objects); setTxs(t.transactions); setNfts(n.account_nfts); setLines(l.lines);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [x.account]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const byType = useMemo(() => objects.reduce<Record<string, Obj[]>>((acc, o) => { const t = String(o.LedgerEntryType); (acc[t] ??= []).push(o); return acc; }, {}), [objects]);
  const mpts = useMemo(() => objects.filter((o) => o.LedgerEntryType === "MPToken"), [objects]);

  if (!x.configured) return <div className="card">Falta <code>NEXT_PUBLIC_XAMAN_API_KEY</code>. Crea una app en <a className="link" href="https://apps.xaman.dev" target="_blank" rel="noreferrer">apps.xaman.dev</a>, añade el origen de esta web y pon la API key pública en <code>.env.local</code>.</div>;
  if (!x.account) return <div className="card space-y-3"><p>Conecta tu cuenta de Xaman para usar la wallet en testnet: saldos, objetos y una acción para cada cosa que poseas.</p><button className="btn-primary" onClick={x.connect} disabled={!x.ready || x.connecting}>Conectar Xaman</button>{x.error && <p className="text-sm text-danger">{x.error}</p>}<p className="text-xs text-muted">En la app Xaman activa la red <b>Testnet</b> (Ajustes → Avanzado → Red). Los payloads de esta web se fuerzan a testnet igualmente.</p></div>;

  const fund = async () => { setFunding(true); try { await fundFromFaucet(x.account!); await new Promise((r) => setTimeout(r, 5000)); await load(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setFunding(false); } };
  const flags = info ? protocol.ledgerFlags.AccountRoot?.filter((f) => (info.account_data.Flags & f.value) === f.value) ?? [] : [];
  const balance = info ? Number(info.account_data.Balance) / 1e6 : 0;
  const reserve = info ? accountReserveXrp(info.account_data.OwnerCount) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-3"><h1 className="display-lg">Mi wallet</h1><a className="link font-mono text-sm" href={`${TESTNET_EXPLORER}/accounts/${x.account}`} target="_blank" rel="noreferrer">{x.account} ↗</a><button className="btn-secondary ml-auto" onClick={load} disabled={loading}>{loading ? "Cargando…" : "Actualizar"}</button></div>
      {err && <p className="text-sm text-danger">{err}</p>}
      {!info ? (
        <div className="card space-y-2"><p>Esta cuenta <b>no existe todavía en testnet</b>. Pide XRP al faucet para activarla (reserva base: {formatXrp(testnet.reserves.baseXrp)}).</p><button className="btn-primary" disabled={funding} onClick={fund}>{funding ? "Pidiendo al faucet…" : "Financiar con el faucet de testnet"}</button></div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card"><div className="text-xs uppercase text-muted">Saldo XRP</div><div className="text-2xl font-semibold">{dropsToXrp(info.account_data.Balance)}</div><div className="text-xs text-muted">disponible: {formatXrp(Math.max(0, balance - reserve))}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Reserva bloqueada</div><div className="text-2xl font-semibold">{formatXrp(reserve)}</div><div className="text-xs text-muted">{formatXrp(testnet.reserves.baseXrp)} base + {info.account_data.OwnerCount} objetos × {formatXrp(testnet.reserves.incXrp)} · <Link href="/reserves" className="link">detalle</Link></div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Sequence</div><div className="text-2xl font-semibold">{info.account_data.Sequence}</div><div className="text-xs text-muted">{Object.entries(byType).map(([t, n]) => `${n.length} ${t}`).join(" · ") || "sin objetos"}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Faucet</div><button className="btn-secondary mt-1" disabled={funding} onClick={fund}>{funding ? "…" : "+ XRP de testnet"}</button></div>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold">Acciones rápidas</h2>
            <div className="flex flex-wrap gap-2">{quickActions(x.account).map((a) => <ActionLink key={a.label} a={a} />)}</div>
            <p className="mt-2 text-xs text-muted">Cada acción abre el builder con la transacción prerrellenada; ahí puedes ajustar campos, simular y firmar con Xaman. Para el resto de tipos, ve a <Link href="/tx" className="link">Transacciones</Link>.</p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Tokens (trust lines) — {lines.length}</h2>
              {lines.length === 0 && <p className="text-sm text-muted">Ninguna. Abre una con <Link className="link" href="/tx/TrustSet">TrustSet</Link>.</p>}
              <ul className="space-y-2 text-sm">
                {lines.map((l, i) => {
                  const o = objects.find((ob) => ob.LedgerEntryType === "RippleState" && ((ob.HighLimit as Obj)?.issuer === l.account || (ob.LowLimit as Obj)?.issuer === l.account) && (ob.Balance as Obj)?.currency === l.currency);
                  return (
                    <li key={i} className="border-b border-border pb-2">
                      <div className="flex items-baseline justify-between"><span><b className="font-mono">{String(l.currency).length > 3 ? String(l.currency).slice(0, 8) + "…" : String(l.currency)}</b> <span className="font-mono">{String(l.balance)}</span> <span className="text-xs text-muted">límite {String(l.limit)}</span></span><span className="font-mono text-xs text-muted" title={String(l.account)}>{String(l.account).slice(0, 8)}…</span></div>
                      <div className="mt-1 flex flex-wrap gap-1">{(o ? actionsFor(o, x.account!) : []).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">NFTs — {nfts.length} · MPT — {mpts.length}</h2>
              {nfts.length === 0 && mpts.length === 0 && <p className="text-sm text-muted">Ninguno. Acuña uno con <Link className="link" href="/tx/NFTokenMint">NFTokenMint</Link> o emite un <Link className="link" href="/tx/MPTokenIssuanceCreate">MPT</Link>.</p>}
              <ul className="space-y-2 text-sm">
                {nfts.map((n) => (
                  <li key={String(n.NFTokenID)} className="border-b border-border pb-2">
                    <div className="font-mono text-xs" title={String(n.NFTokenID)}>{String(n.NFTokenID).slice(0, 20)}… <span className="text-muted">taxon {String(n.NFTokenTaxon)} · flags {String(n.Flags)}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">{nftActions(n, x.account!).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                  </li>
                ))}
                {mpts.map((m, i) => (
                  <li key={i} className="border-b border-border pb-2">
                    <div className="font-mono text-xs" title={String(m.MPTokenIssuanceID)}>MPT {String(m.MPTokenIssuanceID).slice(0, 16)}… <span className="text-muted">saldo {String(m.MPTAmount ?? 0)}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">{actionsFor(m, x.account!).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card">
            <div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="font-semibold">Objetos del ledger ({objects.length})</h2>
              <select className="ml-auto rounded border border-border bg-surface px-2 py-1 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">todos los tipos</option>{Object.keys(byType).sort().map((t) => <option key={t} value={t}>{t} ({byType[t].length})</option>)}</select>
            </div>
            {objects.length === 0 && <p className="text-sm text-muted">Sin objetos. Cada objeto que crees bloqueará {formatXrp(testnet.reserves.incXrp)} de reserva.</p>}
            <ul className="space-y-2">
              {objects.filter((o) => !filter || o.LedgerEntryType === filter).map((o, i) => {
                const type = String(o.LedgerEntryType);
                const r = RESERVE_RULES[type];
                const acts = actionsFor(o, x.account!);
                const summary = summarize(o);
                return (
                  <li key={i} className="rounded-[2px] border border-border p-2 text-sm">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link href={`/objects/${type}`} className="font-mono font-semibold hover:underline">{type}</Link>
                      {r && <span className="badge bg-surface-2 text-muted">{formatXrp(r.units * testnet.reserves.incXrp)} reserva</span>}
                      <span className="text-xs text-muted">{summary}</span>
                      <a className="ml-auto font-mono text-xs text-muted hover:underline" href={`${TESTNET_EXPLORER}/ledger-entries/${String(o.index ?? "")}`} target="_blank" rel="noreferrer" title={String(o.index ?? "")}>{String(o.index ?? "").slice(0, 12)}…</a>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">{acts.map((a) => <ActionLink key={a.label} a={a} />)}{acts.length === 0 && <span className="text-xs text-muted">sin acciones directas</span>}</div>
                    <details className="mt-1"><summary className="cursor-pointer text-xs text-muted">JSON</summary><pre className="mt-1 max-h-60 overflow-auto rounded bg-surface-2 p-2 text-xs">{JSON.stringify(o, null, 2)}</pre></details>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Flags de la cuenta (<Link href="/objects/AccountRoot" className="link">AccountRoot</Link>)</h2>
              {flags.length ? <ul className="text-sm">{flags.map((f) => <li key={f.name} className="font-mono">{f.name}</li>)}</ul> : <p className="text-sm text-muted">Ninguno.</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                <ActionLink a={{ label: "Cambiar flags (AccountSet)", tx: { TransactionType: "AccountSet", Account: x.account, SetFlag: 8 } }} />
                <ActionLink a={{ label: "Clave regular", tx: { TransactionType: "SetRegularKey", Account: x.account, RegularKey: "{{other}}" } }} />
                <ActionLink a={{ label: "Lista de firmantes", tx: { TransactionType: "SignerListSet", Account: x.account, SignerQuorum: 1, SignerEntries: [{ SignerEntry: { Account: "{{other}}", SignerWeight: 1 } }] } }} />
                <ActionLink a={{ label: "Borrar cuenta", tx: { TransactionType: "AccountDelete", Account: x.account, Destination: "{{other}}" }, kind: "danger" }} />
              </div>
              {info.account_data.RegularKey && <p className="mt-2 text-xs">RegularKey: <span className="font-mono">{String(info.account_data.RegularKey)}</span></p>}
              {info.account_data.Domain && <p className="text-xs">Domain: <span className="font-mono">{String(info.account_data.Domain)}</span></p>}
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">Últimas transacciones</h2>
              <table className="tbl"><thead><tr><th>Tipo</th><th>Resultado</th><th>Ledger</th><th>Hash</th></tr></thead><tbody>{txs.map((t, i) => { const tj = (t.tx_json ?? t.tx ?? {}) as Obj; const res = String((t.meta as Obj)?.TransactionResult ?? ""); const h = String(t.hash ?? tj.hash ?? ""); return <tr key={i}><td><Link href={`/tx/${String(tj.TransactionType)}`} className="font-mono hover:underline">{String(tj.TransactionType)}</Link></td><td><Link href={`/results#${res}`} className={`font-mono text-xs ${res === "tesSUCCESS" ? "text-success" : "text-warning"}`}>{res}</Link></td><td className="text-xs text-muted">{String(tj.ledger_index ?? "")}</td><td><a className="link font-mono text-xs" href={`${TESTNET_EXPLORER}/transactions/${h}`} target="_blank" rel="noreferrer">{h.slice(0, 12)}…</a></td></tr>; })}</tbody></table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function summarize(o: Obj): string {
  const amt = (v: unknown) => (typeof v === "string" ? `${Number(v) / 1e6} XRP` : v && typeof v === "object" ? `${(v as Obj).value} ${(v as Obj).currency ?? "MPT"}` : "");
  switch (o.LedgerEntryType) {
    case "RippleState": return `${(o.Balance as Obj)?.value} ${(o.Balance as Obj)?.currency}`;
    case "Offer": return `da ${amt(o.TakerGets)} por ${amt(o.TakerPays)} · seq ${o.Sequence}`;
    case "Escrow": return `${amt(o.Amount)} → ${String(o.Destination).slice(0, 8)}… · seq ${o.Sequence}`;
    case "PayChannel": return `${amt(o.Amount)} (usado ${amt(o.Balance)}) → ${String(o.Destination).slice(0, 8)}…`;
    case "Check": return `hasta ${amt(o.SendMax)} → ${String(o.Destination).slice(0, 8)}…`;
    case "Ticket": return `TicketSequence ${o.TicketSequence}`;
    case "SignerList": return `quorum ${o.SignerQuorum}, ${(o.SignerEntries as unknown[])?.length ?? 0} firmantes`;
    case "NFTokenPage": return `${(o.NFTokens as unknown[])?.length ?? 0} NFTs en esta página`;
    case "NFTokenOffer": return `${amt(o.Amount)} por ${String(o.NFTokenID).slice(0, 10)}…`;
    case "Credential": return `${hexToText(String(o.CredentialType))} de ${String(o.Issuer).slice(0, 8)}… ${(Number(o.Flags) & 0x10000) ? "(aceptada)" : "(pendiente)"}`;
    case "MPTokenIssuance": return `emisión ${String(o.mpt_issuance_id ?? o.index).slice(0, 10)}… · circulante ${o.OutstandingAmount ?? 0}`;
    case "DID": return hexToText(String(o.URI ?? "")).slice(0, 40);
    case "Oracle": return `${(o.PriceDataSeries as unknown[])?.length ?? 0} precios · id ${o.OracleDocumentID}`;
    default: return "";
  }
}
function hexToText(h: string): string {
  try { return /^[0-9a-fA-F]+$/.test(h) ? decodeURIComponent(h.replace(/(..)/g, "%$1")) : h; } catch { return h; }
}
