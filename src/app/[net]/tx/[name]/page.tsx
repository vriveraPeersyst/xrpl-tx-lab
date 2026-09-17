import NLink from "@/components/NLink";
import { notFound } from "next/navigation";
import { getNet, PSEUDO_TX, availableNetworkIds } from "@/lib/protocol";
import { registry, CATEGORIES } from "@/lib/tx/registry";
import { readDoc, flagDoc } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { AmendmentBadge, FieldsTable, TerBadge } from "@/components/protocol";
import { TxBuilder } from "@/components/tx/TxBuilder";
import { Lifecycle } from "@/components/tx/Lifecycle";
import { Suspense } from "react";
import { txFeeRules, TX_CREATES, RESERVE_RULES, reserveXrp, formatXrp } from "@/lib/reserves";

export function generateStaticParams() {
  return availableNetworkIds().flatMap((net) => getNet(net).txNames().map((name) => ({ net, name })));
}

export async function generateMetadata({ params }: { params: Promise<{ net: string; name: string }> }) {
  const { name } = await params;
  const doc = readDoc("tx", name);
  return { title: name, description: doc?.data.summary };
}

export default async function TxPage({ params }: { params: Promise<{ net: string; name: string }> }) {
  const { net, name } = await params;
  const d = getNet(net);
  const t = d.getTx(name);
  if (!t || !d.hasTx(name)) notFound();
  const doc = readDoc("tx", name);
  const spec = registry[name];
  const fields = d.mergedFields(name);
  const flags = d.txFlags(name);
  const amendments = d.txAmendments(t);
  const gate = t.amendment ? { name: t.amendment, enabled: d.amendmentStatus(t.amendment)?.enabled ?? false } : undefined;
  const pseudo = PSEUDO_TX.has(name);
  const inner = Object.fromEntries(d.protocol.innerObjects.map((o) => [o.name, o.fields.map((f) => ({ name: f.name, type: d.protocol.sfields.find((s) => s.name === f.name)?.type ?? "Blob", optionality: f.optionality }))]));
  const normalizedInner = Object.fromEntries(Object.entries(inner).map(([k, fs]) => [k, fs.map((f) => ({ ...f, type: TYPE_MAP[f.type] ?? f.type }))]));
  const perms = d.protocol.permissions.filter((p) => p.txType === t.tag);
  const ter = (t.transactor?.allTer ?? []).filter((c) => c !== "tesSUCCESS");
  const asf = name === "AccountSet" ? d.protocol.txFlags.asf : [];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <NLink href="/tx" className="hover:underline">Transactions</NLink><span>/</span><span>{CATEGORIES[spec?.category ?? (pseudo ? "sistema" : "otros")].label}</span>
          <span className="ml-auto font-mono">type {t.value} · {t.tag}</span>
        </div>
        <h1 className="display-lg font-mono font-light">{name}</h1>
        <p className="max-w-3xl text-lg text-muted">{doc?.data.summary ?? t.doc}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {gate ? <AmendmentBadge d={d} name={gate.name} /> : <span className="badge bg-surface-2 text-muted">no activation amendment</span>}
          {t.delegable && <NLink href="/permissions" className="badge bg-accent-soft text-accent-ink">delegable</NLink>}
          {t.privileges.map((p) => <span key={p} className="badge bg-surface-2 text-muted" title="Privilege declared in TxSettings (enforced by the invariant checks)">{p}</span>)}
          {doc?.data.level && <span className="badge bg-surface-2 text-muted">level: {doc.data.level}</span>}
          {doc?.data.xrplDocs && <a className="link" href={doc.data.xrplDocs} target="_blank" rel="noreferrer">xrpl.org ↗</a>}
          {doc?.data.xls && <a className="link" href={`https://github.com/XRPLF/XRPL-Standards/tree/master/${doc.data.xls}`} target="_blank" rel="noreferrer">{doc.data.xls} ↗</a>}
          {doc?.data.draft && <span className="badge bg-warning/15 text-warning">auto-generated draft</span>}
        </div>
      </header>

      <section id="builder" className="space-y-3">
        <h2 className="display-md">Build and submit on {d.network.label}</h2>
        <Suspense fallback={<div className="text-sm text-muted">Loading builder…</div>}>
        <TxBuilder
          name={name}
          fields={fields.map((f) => ({ name: f.name, type: f.type, optionality: f.optionality, inTestnet: f.inTestnet, hint: spec?.hints?.[f.name], mptSupported: f.mptSupported }))}
          commonFields={d.commonFields().map((f) => ({ name: f.name, type: f.type, optionality: f.optionality, inTestnet: true, common: true }))}
          flags={flags.map((f) => ({ name: f.name, value: f.value, doc: flagDoc(name, f.name) ?? f.doc }))}
          innerObjects={normalizedInner}
          example={spec?.example ?? { TransactionType: name }}
          prerequisites={spec?.prerequisites}
          amendmentGate={gate}
          pseudo={pseudo}
          asf={name === "AccountSet" ? asf.map((f) => ({ name: f.name, value: f.value, doc: flagDoc("AccountSet", f.name) })) : undefined}
        />
        </Suspense>
      </section>

      {!pseudo && (
        <section id="coste" className="space-y-3">
          <h2 className="display-md">How much it costs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="mb-2 font-semibold">Fee (destroyed)</h3>
              <ul className="space-y-2 text-sm">{txFeeRules(d, name).map((r) => <li key={r.label}><b>{r.label}</b>{r.drops !== undefined && <span className="ml-1 font-mono">{r.drops} drops</span>}{r.xrp !== undefined && <span className="ml-1 font-mono">{formatXrp(r.xrp)}</span>}<span className="block text-xs text-muted">{r.note}</span></li>)}</ul>
            </div>
            <div className="card">
              <h3 className="mb-2 font-semibold">Reserve (locked, released on delete)</h3>
              {(TX_CREATES[name] ?? []).length ? (
                <ul className="space-y-2 text-sm">{(TX_CREATES[name] ?? []).map((o) => { const r = RESERVE_RULES[o]; return <li key={o}><NLink href={`/objects/${o}`} className="font-mono hover:underline">{o}</NLink>{r && <span className="ml-1 font-mono">{r.units}{r.variable ? "+" : ""} × {formatXrp(d.snapshot.reserves.incXrp)} = {formatXrp(reserveXrp(d.snapshot, r.units))}</span>}{r && <span className="block text-xs text-muted">{r.note}</span>}</li>; })}</ul>
              ) : (
                <p className="text-sm text-muted">Does not create new objects: no additional reserve is locked.</p>
              )}
              {t.transactor?.ownerCountCalls?.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-muted">Evidence in the code ({t.transactor.ownerCountCalls.length})</summary><ul className="mt-1 space-y-1 font-mono text-xs text-muted">{t.transactor.ownerCountCalls.map((c) => <li key={c}>{c}</li>)}</ul></details> : null}
              <p className="mt-2 text-xs text-muted">{d.network.label} values: base {formatXrp(d.snapshot.reserves.baseXrp)}, increment {formatXrp(d.snapshot.reserves.incXrp)}. <NLink href="/reserves" className="link">Full table and calculator</NLink>.</p>
            </div>
          </div>
        </section>
      )}

      {doc ? (
        <section className="max-w-3xl"><Markdown>{doc.body}</Markdown></section>
      ) : (
        <section className="card text-sm text-muted">Documentation not written yet. Meanwhile, the information below is extracted automatically from the code.</section>
      )}

      <section className="space-y-3">
        <h2 className="display-md">Fields ({fields.filter((f) => f.inTestnet).length} own + {d.protocol.commonFields.length} common)</h2>
        <FieldsTable fields={fields} hints={spec?.hints} />
        <details>
          <summary className="cursor-pointer text-sm text-muted">Fields common to every transaction</summary>
          <div className="mt-2"><FieldsTable fields={d.commonFields()} scope="common" /></div>
        </details>
      </section>

      {(flags.length > 0 || asf.length > 0) && (
        <section className="space-y-3">
          <h2 className="display-md">Flags</h2>
          {flags.length > 0 && (
            <table className="tbl">
              <thead><tr><th>Flag</th><th>Value</th><th>Effect</th></tr></thead>
              <tbody>{flags.map((f) => <tr key={f.name}><td className="font-mono">{f.name}</td><td className="font-mono text-xs">{f.hex} <span className="text-muted">({f.value})</span></td><td className="text-muted">{flagDoc(name, f.name) ?? f.doc ?? ""}</td></tr>)}</tbody>
            </table>
          )}
          {asf.length > 0 && (
            <>
              <h3 className="font-semibold">SetFlag / ClearFlag values (asf*)</h3>
              <table className="tbl">
                <thead><tr><th>Flag</th><th>Value</th><th>Effect</th></tr></thead>
                <tbody>{asf.map((f) => <tr key={f.name}><td className="font-mono">{f.name}</td><td className="font-mono text-xs">{f.value}</td><td className="text-muted">{flagDoc("AccountSet", f.name) ?? ""}</td></tr>)}</tbody>
              </table>
            </>
          )}
          <p className="text-xs text-muted">Universal flags: <code>tfFullyCanonicalSig</code> (0x80000000, obsolete) and <code>tfInnerBatchTxn</code> (0x40000000, only inside a Batch).</p>
        </section>
      )}

      {t.transactor && (
        <section className="space-y-3">
          <h2 className="display-md">How xrpld processes it</h2>
          <Lifecycle t={t.transactor} />
          <p className="text-xs text-muted">Besides these, any transaction can fail with the generic codes (fee, sequence, signature) from <code>Transactor.cpp</code>: <TerBadge d={d} code="telINSUF_FEE_P" /> <TerBadge d={d} code="terPRE_SEQ" /> <TerBadge d={d} code="tefPAST_SEQ" /> <TerBadge d={d} code="tefMAX_LEDGER" /> <TerBadge d={d} code="terINSUF_FEE_B" /> <TerBadge d={d} code="tefBAD_AUTH" />.</p>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="display-md">Possible result codes ({ter.length})</h2>
          <div className="flex flex-wrap gap-1">{ter.map((c) => <TerBadge key={c} d={d} code={c} />)}</div>
          <ul className="mt-2 space-y-1 text-sm">
            {ter.map((c) => { const r = d.protocol.results.find((x) => x.code === c); return <li key={c}><code className="text-xs">{c}</code> <span className="text-muted">— {r?.description ?? r?.comment ?? ""}</span></li>; })}
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="display-md">Amendments that condition it ({amendments.length})</h2>
          <ul className="space-y-1 text-sm">
            {amendments.map((a) => <li key={a.name} className="flex items-center gap-2"><AmendmentBadge d={d} name={a.name} />{a.gate && <span className="text-xs text-muted">activates the type</span>}</li>)}
            {amendments.length === 0 && <li className="text-muted">None: base protocol behavior.</li>}
          </ul>
          {perms.length > 0 && (
            <>
              <h3 className="pt-3 font-semibold">Delegable granular permissions</h3>
              <ul className="space-y-1 text-sm">{perms.map((p) => <li key={p.name}><NLink href="/permissions" className="font-mono hover:underline">{p.name}</NLink> <span className="text-muted">({p.value}) — {p.doc}</span></li>)}</ul>
            </>
          )}
        </div>
      </section>

      {t.transactor && (
        <section className="space-y-2">
          <h2 className="display-md">Source code</h2>
          <p className="text-sm text-muted">Transactor: <a className="link" href={d.sourceUrl(t.transactor.file)} target="_blank" rel="noreferrer">{t.transactor.file}</a> ({t.transactor.lines} lines) · definition: <a className="link" href={d.sourceUrl("include/xrpl/protocol/detail/transactions.macro")} target="_blank" rel="noreferrer">transactions.macro</a></p>
          <table className="tbl">
            <thead><tr><th>Function</th><th>TER codes</th><th>Amendments checked</th><th>Flags</th></tr></thead>
            <tbody>
              {Object.entries(t.transactor.functions).map(([fn, a]) => (
                <tr key={fn}>
                  <td><a className="link font-mono" href={d.sourceUrl(t.transactor!.file, a.line)} target="_blank" rel="noreferrer">{fn}</a></td>
                  <td className="text-xs">{a.ter.filter((c) => c !== "tesSUCCESS").join(", ") || "—"}</td>
                  <td className="text-xs">{a.features.map((f) => f.replace(/^feature/, "")).join(", ") || "—"}</td>
                  <td className="text-xs">{a.flags.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

const TYPE_MAP: Record<string, string> = { ACCOUNT: "AccountID", AMOUNT: "Amount", UINT8: "UInt8", UINT16: "UInt16", UINT32: "UInt32", UINT64: "UInt64", INT32: "Int32", HASH128: "Hash128", HASH160: "Hash160", HASH192: "Hash192", HASH256: "Hash256", VL: "Blob", STARRAY: "STArray", STOBJECT: "STObject", PATHSET: "PathSet", VECTOR256: "Vector256", ISSUE: "Issue", CURRENCY: "Currency", NUMBER: "Number", XCHAIN_BRIDGE: "XChainBridge" };
