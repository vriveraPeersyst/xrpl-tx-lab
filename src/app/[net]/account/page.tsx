"use client";
import Link from "@/components/NLink";
import { useNetId, useNetwork } from "@/lib/net-context";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useXaman } from "@/lib/xaman/provider";
import { accountInfo, accountObjects, accountTx, dropsToXrp, fundFromFaucet, rpc, explorerTx, explorerAccount, type AccountInfo } from "@/lib/xrpl/rpc";
import { getNet } from "@/lib/protocol";
import { RESERVE_RULES, accountReserveXrp, formatXrp } from "@/lib/reserves";
import { actionsFor, nftActions, quickActions, encodePrefill, type WalletAction } from "@/lib/wallet/actions";

type Obj = Record<string, unknown>;

function ActionLink({ a }: { a: WalletAction }) {
  const cls = a.kind === "primary" ? "btn-primary" : a.kind === "danger" ? "btn-secondary text-danger" : "btn-secondary";
  return <Link href={`/tx/${String(a.tx.TransactionType)}?prefill=${encodePrefill(a.tx)}#builder`} className={`${cls} !px-3 !py-1 text-xs`}>{a.label}</Link>;
}

export default function AccountPage() {
  const x = useXaman();
  const net = useNetwork();
  const d = getNet(useNetId());
  const snap = d.snapshot;
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
        accountInfo(net, x.account).catch((e) => { if (String(e?.code) === "actNotFound") return null; throw e; }),
        accountObjects(net, x.account).catch(() => ({ account_objects: [] as Obj[] })),
        accountTx(net, x.account).catch(() => ({ transactions: [] })),
        rpc<{ account_nfts: Obj[] }>(net, "account_nfts", { account: x.account, ledger_index: "validated" }).catch(() => ({ account_nfts: [] as Obj[] })),
        rpc<{ lines: Obj[] }>(net, "account_lines", { account: x.account, ledger_index: "validated" }).catch(() => ({ lines: [] as Obj[] })),
      ]);
      setInfo(i); setObjects(o.account_objects); setTxs(t.transactions); setNfts(n.account_nfts); setLines(l.lines);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [x.account, net]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const byType = useMemo(() => objects.reduce<Record<string, Obj[]>>((acc, o) => { const t = String(o.LedgerEntryType); (acc[t] ??= []).push(o); return acc; }, {}), [objects]);
  const mpts = useMemo(() => objects.filter((o) => o.LedgerEntryType === "MPToken"), [objects]);

  if (!x.configured) return <div className="card">Missing <code>NEXT_PUBLIC_XAMAN_API_KEY</code>. Create an app at <a className="link" href="https://apps.xaman.dev" target="_blank" rel="noreferrer">apps.xaman.dev</a>, add this site&apos;s origin and set the public API key in <code>.env.local</code>.</div>;
  if (!x.account) return <div className="card space-y-3"><p>Connect your Xaman account to use the wallet on {net.label}: balances, objects and an action for everything you own.</p><button className="btn-primary" onClick={x.connect} disabled={!x.ready || x.connecting}>Connect Xaman</button>{x.error && <p className="text-sm text-danger">{x.error}</p>}<p className="text-xs text-muted">{net.xaman ? <>In the Xaman app enable the <b>{net.label}</b> network (Settings → Advanced → Network). This site&apos;s payloads are forced to {net.xaman} regardless.</> : <>Xaman cannot sign on {net.label}; you can still browse your account and simulate transactions.</>}</p></div>;

  const fund = async () => { setFunding(true); try { await fundFromFaucet(net, x.account!); await new Promise((r) => setTimeout(r, 5000)); await load(); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setFunding(false); } };
  const flags = info ? d.protocol.ledgerFlags.AccountRoot?.filter((f) => (info.account_data.Flags & f.value) === f.value) ?? [] : [];
  const balance = info ? Number(info.account_data.Balance) / 1e6 : 0;
  const reserve = info ? accountReserveXrp(snap, info.account_data.OwnerCount) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline gap-3"><h1 className="display-lg">My wallet</h1>{explorerAccount(net, x.account) ? <a className="link font-mono text-sm" href={explorerAccount(net, x.account)} target="_blank" rel="noreferrer">{x.account} ↗</a> : <span className="font-mono text-sm">{x.account}</span>}<button className="btn-secondary ml-auto" onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
      {err && <p className="text-sm text-danger">{err}</p>}
      {!info ? (
        <div className="card space-y-2"><p>This account <b>does not exist on {net.label} yet</b>. {net.faucet ? "Request XRP from the faucet to activate it" : "This network has no public faucet configured; fund it from another account"} (base reserve: {formatXrp(snap.reserves.baseXrp)}).</p>{net.faucet && <button className="btn-primary" disabled={funding} onClick={fund}>{funding ? "Requesting from the faucet…" : `Fund from the ${net.label} faucet`}</button>}</div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card"><div className="text-xs uppercase text-muted">XRP balance</div><div className="text-2xl font-semibold">{dropsToXrp(info.account_data.Balance)}</div><div className="text-xs text-muted">available: {formatXrp(Math.max(0, balance - reserve))}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Locked reserve</div><div className="text-2xl font-semibold">{formatXrp(reserve)}</div><div className="text-xs text-muted">{formatXrp(snap.reserves.baseXrp)} base + {info.account_data.OwnerCount} objects × {formatXrp(snap.reserves.incXrp)} · <Link href="/reserves" className="link">details</Link></div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Sequence</div><div className="text-2xl font-semibold">{info.account_data.Sequence}</div><div className="text-xs text-muted">{Object.entries(byType).map(([t, n]) => `${n.length} ${t}`).join(" · ") || "no objects"}</div></div>
            <div className="card"><div className="text-xs uppercase text-muted">Faucet</div>{net.faucet ? <button className="btn-secondary mt-1" disabled={funding} onClick={fund}>{funding ? "…" : `+ ${net.label} XRP`}</button> : <p className="mt-1 text-xs text-muted">no public faucet</p>}</div>
          </section>

          <section className="card">
            <h2 className="mb-2 font-semibold">Quick actions</h2>
            <div className="flex flex-wrap gap-2">{quickActions(x.account).map((a) => <ActionLink key={a.label} a={a} />)}</div>
            <p className="mt-2 text-xs text-muted">Each action opens the builder with the transaction prefilled; from there you can adjust fields, simulate and sign with Xaman. For the rest of the types, go to <Link href="/tx" className="link">Transactions</Link>.</p>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Tokens (trust lines) — {lines.length}</h2>
              {lines.length === 0 && <p className="text-sm text-muted">None. Open one with <Link className="link" href="/tx/TrustSet">TrustSet</Link>.</p>}
              <ul className="space-y-2 text-sm">
                {lines.map((l, i) => {
                  const o = objects.find((ob) => ob.LedgerEntryType === "RippleState" && ((ob.HighLimit as Obj)?.issuer === l.account || (ob.LowLimit as Obj)?.issuer === l.account) && (ob.Balance as Obj)?.currency === l.currency);
                  return (
                    <li key={i} className="border-b border-border pb-2">
                      <div className="flex items-baseline justify-between"><span><b className="font-mono">{String(l.currency).length > 3 ? String(l.currency).slice(0, 8) + "…" : String(l.currency)}</b> <span className="font-mono">{String(l.balance)}</span> <span className="text-xs text-muted">limit {String(l.limit)}</span></span><span className="font-mono text-xs text-muted" title={String(l.account)}>{String(l.account).slice(0, 8)}…</span></div>
                      <div className="mt-1 flex flex-wrap gap-1">{(o ? actionsFor(o, x.account!) : []).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">NFTs — {nfts.length} · MPT — {mpts.length}</h2>
              {nfts.length === 0 && mpts.length === 0 && <p className="text-sm text-muted">None. Mint one with <Link className="link" href="/tx/NFTokenMint">NFTokenMint</Link> or issue an <Link className="link" href="/tx/MPTokenIssuanceCreate">MPT</Link>.</p>}
              <ul className="space-y-2 text-sm">
                {nfts.map((n) => (
                  <li key={String(n.NFTokenID)} className="border-b border-border pb-2">
                    <div className="font-mono text-xs" title={String(n.NFTokenID)}>{String(n.NFTokenID).slice(0, 20)}… <span className="text-muted">taxon {String(n.NFTokenTaxon)} · flags {String(n.Flags)}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">{nftActions(n, x.account!).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                  </li>
                ))}
                {mpts.map((m, i) => (
                  <li key={i} className="border-b border-border pb-2">
                    <div className="font-mono text-xs" title={String(m.MPTokenIssuanceID)}>MPT {String(m.MPTokenIssuanceID).slice(0, 16)}… <span className="text-muted">balance {String(m.MPTAmount ?? 0)}</span></div>
                    <div className="mt-1 flex flex-wrap gap-1">{actionsFor(m, x.account!).map((a) => <ActionLink key={a.label} a={a} />)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card">
            <div className="mb-2 flex flex-wrap items-center gap-2"><h2 className="font-semibold">Ledger objects ({objects.length})</h2>
              <select className="input ml-auto !w-auto text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">all types</option>{Object.keys(byType).sort().map((t) => <option key={t} value={t}>{t} ({byType[t].length})</option>)}</select>
            </div>
            {objects.length === 0 && <p className="text-sm text-muted">No objects. Every object you create will lock {formatXrp(snap.reserves.incXrp)} of reserve.</p>}
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
                      {r && <span className="badge bg-surface-2 text-muted">{formatXrp(r.units * snap.reserves.incXrp)} reserve</span>}
                      <span className="text-xs text-muted">{summary}</span>
                      <span className="ml-auto font-mono text-xs text-muted" title={String(o.index ?? "")}>{String(o.index ?? "").slice(0, 12)}…</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">{acts.map((a) => <ActionLink key={a.label} a={a} />)}{acts.length === 0 && <span className="text-xs text-muted">no direct actions</span>}</div>
                    <details className="mt-1"><summary className="cursor-pointer text-xs text-muted">JSON</summary><pre className="code-block mt-2 max-h-60">{JSON.stringify(o, null, 2)}</pre></details>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="card">
              <h2 className="mb-2 font-semibold">Account flags (<Link href="/objects/AccountRoot" className="link">AccountRoot</Link>)</h2>
              {flags.length ? <ul className="text-sm">{flags.map((f) => <li key={f.name} className="font-mono">{f.name}</li>)}</ul> : <p className="text-sm text-muted">None.</p>}
              <div className="mt-2 flex flex-wrap gap-1">
                <ActionLink a={{ label: "Change flags (AccountSet)", tx: { TransactionType: "AccountSet", Account: x.account, SetFlag: 8 } }} />
                <ActionLink a={{ label: "Regular key", tx: { TransactionType: "SetRegularKey", Account: x.account, RegularKey: "{{other}}" } }} />
                <ActionLink a={{ label: "Signer list", tx: { TransactionType: "SignerListSet", Account: x.account, SignerQuorum: 1, SignerEntries: [{ SignerEntry: { Account: "{{other}}", SignerWeight: 1 } }] } }} />
                <ActionLink a={{ label: "Delete account", tx: { TransactionType: "AccountDelete", Account: x.account, Destination: "{{other}}" }, kind: "danger" }} />
              </div>
              {info.account_data.RegularKey && <p className="mt-2 text-xs">RegularKey: <span className="font-mono">{String(info.account_data.RegularKey)}</span></p>}
              {info.account_data.Domain && <p className="text-xs">Domain: <span className="font-mono">{String(info.account_data.Domain)}</span></p>}
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">Latest transactions</h2>
              <table className="tbl"><thead><tr><th>Type</th><th>Result</th><th>Ledger</th><th>Hash</th></tr></thead><tbody>{txs.map((t, i) => { const tj = (t.tx_json ?? t.tx ?? {}) as Obj; const res = String((t.meta as Obj)?.TransactionResult ?? ""); const h = String(t.hash ?? tj.hash ?? ""); return <tr key={i}><td><Link href={`/tx/${String(tj.TransactionType)}`} className="font-mono hover:underline">{String(tj.TransactionType)}</Link></td><td><Link href={`/results#${res}`} className={`font-mono text-xs ${res === "tesSUCCESS" ? "text-success" : "text-warning"}`}>{res}</Link></td><td className="text-xs text-muted">{String(tj.ledger_index ?? "")}</td><td>{explorerTx(net, h) ? <a className="link font-mono text-xs" href={explorerTx(net, h)} target="_blank" rel="noreferrer">{h.slice(0, 12)}…</a> : <span className="font-mono text-xs">{h.slice(0, 12)}…</span>}</td></tr>; })}</tbody></table>
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
    case "Offer": return `gives ${amt(o.TakerGets)} for ${amt(o.TakerPays)} · seq ${o.Sequence}`;
    case "Escrow": return `${amt(o.Amount)} → ${String(o.Destination).slice(0, 8)}… · seq ${o.Sequence}`;
    case "PayChannel": return `${amt(o.Amount)} (used ${amt(o.Balance)}) → ${String(o.Destination).slice(0, 8)}…`;
    case "Check": return `up to ${amt(o.SendMax)} → ${String(o.Destination).slice(0, 8)}…`;
    case "Ticket": return `TicketSequence ${o.TicketSequence}`;
    case "SignerList": return `quorum ${o.SignerQuorum}, ${(o.SignerEntries as unknown[])?.length ?? 0} signers`;
    case "NFTokenPage": return `${(o.NFTokens as unknown[])?.length ?? 0} NFTs on this page`;
    case "NFTokenOffer": return `${amt(o.Amount)} for ${String(o.NFTokenID).slice(0, 10)}…`;
    case "Credential": return `${hexToText(String(o.CredentialType))} from ${String(o.Issuer).slice(0, 8)}… ${(Number(o.Flags) & 0x10000) ? "(accepted)" : "(pending)"}`;
    case "MPTokenIssuance": return `issuance ${String(o.mpt_issuance_id ?? o.index).slice(0, 10)}… · outstanding ${o.OutstandingAmount ?? 0}`;
    case "DID": return hexToText(String(o.URI ?? "")).slice(0, 40);
    case "Oracle": return `${(o.PriceDataSeries as unknown[])?.length ?? 0} prices · id ${o.OracleDocumentID}`;
    default: return "";
  }
}
function hexToText(h: string): string {
  try { return /^[0-9a-fA-F]+$/.test(h) ? decodeURIComponent(h.replace(/(..)/g, "%$1")) : h; } catch { return h; }
}
