import Link from "@/components/NLink";
import { notFound } from "next/navigation";
import { getNet, availableNetworkIds, normalizeType } from "@/lib/protocol";

export function generateStaticParams() {
  return availableNetworkIds().flatMap((net) => getNet(net).protocol.sfields.filter((s) => !s.untyped).map((s) => ({ net, name: s.name })));
}

export default async function FieldPage({ params }: { params: Promise<{ net: string; name: string }> }) {
  const { net, name } = await params;
  const d = getNet(net);
  const f = d.getField(name);
  if (!f) notFound();
  const u = d.fieldUsage(name);
  const type = f.def?.type ?? normalizeType(f.type);
  const txWithOpt = d.protocol.transactions.filter((t) => t.fields.some((x) => x.name === name)).map((t) => ({ name: t.name, f: t.fields.find((x) => x.name === name)! }));
  const common = d.protocol.commonFields.some((c) => c.name === name);
  return (
    <div className="space-y-6">
      <div className="text-xs text-muted"><Link href="/fields" className="hover:underline">Fields</Link></div>
      <h1 className="display-lg font-mono font-light">{name}</h1>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link href={`/fields#${type}`} className="badge bg-accent-soft text-accent-ink font-mono">{type}</Link>
        <span className="badge bg-surface-2 text-muted">nth {f.nth}</span>
        {f.def && <span className="badge bg-surface-2 text-muted">{f.def.isSigningField ? "signed" : "not signed"} · {f.def.isVLEncoded ? "VL" : "fixed"}</span>}
        {common && <span className="badge bg-surface-2 text-muted">field common to all transactions</span>}
        {!(name in d.defs.FIELDS) && <span className="badge bg-[#dbf15e] text-black">source only, not yet on {d.network.label}</span>}
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card"><h2 className="mb-2 font-semibold">Transactions ({txWithOpt.length})</h2><ul className="space-y-1 text-sm">{txWithOpt.map((t) => <li key={t.name}><Link href={`/tx/${t.name}`} className="font-mono hover:underline">{t.name}</Link> <span className="text-xs text-muted">{t.f.optionality}{t.f.mptSupported ? " · MPT" : ""}</span></li>)}{txWithOpt.length === 0 && <li className="text-muted">none</li>}</ul></div>
        <div className="card"><h2 className="mb-2 font-semibold">Ledger objects ({u.ledgerEntries.length})</h2><ul className="space-y-1 text-sm">{u.ledgerEntries.map((t) => <li key={t}><Link href={`/objects/${t}`} className="font-mono hover:underline">{t}</Link></li>)}{u.ledgerEntries.length === 0 && <li className="text-muted">none</li>}</ul></div>
        <div className="card"><h2 className="mb-2 font-semibold">Inner objects ({u.innerObjects.length})</h2><ul className="space-y-1 text-sm">{u.innerObjects.map((t) => <li key={t} className="font-mono">{t}</li>)}{u.innerObjects.length === 0 && <li className="text-muted">none</li>}</ul></div>
      </section>
      <p className="text-sm text-muted">Definition: <a className="link" href={d.sourceUrl("include/xrpl/protocol/detail/sfields.macro")} target="_blank" rel="noreferrer">sfields.macro</a></p>
    </div>
  );
}
