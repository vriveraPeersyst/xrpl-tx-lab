import NLink from "@/components/NLink";
import { notFound } from "next/navigation";
import { getNet, availableNetworkIds } from "@/lib/protocol";
import { readDoc, flagDoc } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { FieldsTable } from "@/components/protocol";
import { RESERVE_RULES, reserveXrp, formatXrp } from "@/lib/reserves";

export function generateStaticParams() {
  return availableNetworkIds().flatMap((net) => getNet(net).ledgerEntryNames().map((name) => ({ net, name })));
}
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return { title: `${name} (object)`, description: readDoc("objects", name)?.data.summary };
}

export default async function ObjectPage({ params }: { params: Promise<{ net: string; name: string }> }) {
  const { net, name } = await params;
  const d = getNet(net);
  const e = d.getLedgerEntry(name);
  if (!e || !d.hasLedgerEntry(name)) notFound();
  const doc = readDoc("objects", name);
  const tnFields = new Map((d.defs.LEDGER_ENTRY_FORMATS[name] ?? []).map((f) => [f.name, f.optionality === 0]));
  const fields = e.fields.map((f) => ({ ...f, type: d.fieldType(f.name), inTestnet: tnFields.has(f.name), inSource: true, common: false }));
  for (const [n, req] of tnFields) if (!fields.some((f) => f.name === n)) fields.push({ name: n, optionality: req ? "required" : "optional", mptSupported: false, type: d.fieldType(n), inTestnet: true, inSource: false, common: false });
  const flags = Object.entries(d.defs.LEDGER_ENTRY_FLAGS[name] ?? {}).map(([n, v]) => ({ name: n, value: v, doc: flagDoc(name, n) ?? d.protocol.ledgerFlags[name]?.find((f) => f.name === n)?.doc }));
  const creators = d.protocol.transactions.filter((t) => t.transactor?.functions.doApply?.fields.includes("LedgerEntryType") || false);
  void creators;
  const related = (doc?.data.createdBy ?? "").split(",").concat((doc?.data.modifiedBy ?? "").split(",")).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted"><NLink href="/objects" className="hover:underline">Objects</NLink> / <span className="font-mono">{e.tag} · 0x{e.value.toString(16).padStart(4, "0")}</span></div>
        <h1 className="display-lg font-mono font-light">{name}</h1>
        <p className="max-w-3xl text-lg text-muted">{doc?.data.summary ?? e.doc?.replace(/\\sa.*$/, "")}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-surface-2 text-muted">RPC name: {e.rpcName}</span>
          {doc?.data.reserve !== undefined && <span className="badge bg-surface-2 text-muted">reserve: {doc.data.reserve} × {d.snapshot.reserves.incXrp} XRP</span>}
          {related.map((s) => <NLink key={s} href={`/tx/${s}`} className="badge bg-accent-soft text-accent-ink font-mono">{s}</NLink>)}
          {doc?.data.xrplDocs && <a className="link" href={doc.data.xrplDocs} target="_blank" rel="noreferrer">xrpl.org ↗</a>}
        </div>
      </header>
      {RESERVE_RULES[name] && (
        <section className="card">
          <h2 className="mb-1 font-semibold">How much XRP it locks</h2>
          <p className="text-2xl font-semibold">{RESERVE_RULES[name].units}{RESERVE_RULES[name].variable ? "+" : ""} × {formatXrp(d.snapshot.reserves.incXrp)} = {formatXrp(reserveXrp(d.snapshot, RESERVE_RULES[name].units))}</p>
          <p className="text-sm">Paid by: {RESERVE_RULES[name].owner}.</p>
          <p className="text-sm text-muted">{RESERVE_RULES[name].note}</p>
          <p className="mt-1 text-xs text-muted">Released when the object is deleted. <NLink href="/reserves" className="link">Reserves & fees</NLink>.</p>
        </section>
      )}
      {doc ? <section className="max-w-3xl"><Markdown>{doc.body}</Markdown></section> : <section className="card text-sm text-muted">Documentation pending. Data extracted from the code below.</section>}
      <section className="space-y-2">
        <h2 className="display-md">Fields ({fields.length})</h2>
        <FieldsTable fields={fields} />
      </section>
      {flags.length > 0 && (
        <section className="space-y-2">
          <h2 className="display-md">Flags (lsf*)</h2>
          <table className="tbl"><thead><tr><th>Flag</th><th>Value</th><th>Meaning</th></tr></thead><tbody>{flags.map((f) => <tr key={f.name}><td className="font-mono">{f.name}</td><td className="font-mono text-xs">0x{f.value.toString(16).padStart(8, "0")}</td><td className="text-muted">{f.doc ?? ""}</td></tr>)}</tbody></table>
        </section>
      )}
      <section className="text-sm text-muted">Definition: <a className="link" href={d.sourceUrl("include/xrpl/protocol/detail/ledger_entries.macro")} target="_blank" rel="noreferrer">ledger_entries.macro</a> · flags: <a className="link" href={d.sourceUrl("include/xrpl/protocol/LedgerFormats.h")} target="_blank" rel="noreferrer">LedgerFormats.h</a></section>
    </div>
  );
}
