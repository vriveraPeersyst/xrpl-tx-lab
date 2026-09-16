import NLink from "@/components/NLink";
import { notFound } from "next/navigation";
import { getNet, availableNetworkIds, featureIdToName } from "@/lib/protocol";
import { readDoc } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { amendmentState } from "@/components/protocol";

export function generateStaticParams() {
  return availableNetworkIds().flatMap((net) => {
    const d = getNet(net);
    const names = new Set([...d.snapshot.amendments.map((a) => a.name), ...d.protocol.features.map((f) => f.name)]);
    return [...names].map((name) => ({ net, name }));
  });
}
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return { title: `${name} (amendment)`, description: readDoc("amendments", name)?.data.summary };
}

export default async function AmendmentPage({ params }: { params: Promise<{ net: string; name: string }> }) {
  const { net, name } = await params;
  const d = getNet(net);
  const s = d.amendmentStatus(name);
  const f = d.getFeature(name);
  if (!s && !f) notFound();
  const doc = readDoc("amendments", name);
  const st = amendmentState(s);
  const txs = d.protocol.transactions.filter((t) => t.amendment === name || t.transactor?.allFeatures.some((x) => featureIdToName(x) === name));
  const pct = s && s.count !== undefined && s.validations ? Math.round((s.count / s.validations) * 100) : undefined;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted"><NLink href="/amendments" className="hover:underline">Amendments</NLink> / {f?.kind === "fix" ? "fix" : "feature"}</div>
        <h1 className="display-lg font-mono font-light">{name}</h1>
        <p className="max-w-3xl text-lg text-muted">{doc?.data.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${st.cls}`}>{st.label} on {d.network.label}</span>
          {f && <span className="badge bg-surface-2 text-muted">source: {f.supported ? "Supported::Yes" : "Supported::No"} · {f.defaultVote === "yes" ? "DefaultYes" : f.defaultVote === "no" ? "DefaultNo" : "Obsolete"}{f.retired ? " · retired" : ""}</span>}
          {doc?.data.xls && <a className="link" href={doc.data.xlsUrl ?? `https://github.com/XRPLF/XRPL-Standards`} target="_blank" rel="noreferrer">{doc.data.xls} ↗</a>}
          {doc?.data.xrplDocs && <a className="link" href={doc.data.xrplDocs} target="_blank" rel="noreferrer">xrpl.org ↗</a>}
          {doc?.data.introducedIn && <span className="badge bg-surface-2 text-muted">rippled {doc.data.introducedIn}</span>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-xs uppercase text-muted">ID</div><div className="break-all font-mono text-xs">{s?.id ?? "—"}</div></div>
        <div className="card"><div className="text-xs uppercase text-muted">{d.network.label} voting</div><div className="text-sm">{s ? (s.enabled ? "active" : s.count !== undefined ? `${s.count} of ${s.validations ?? "?"} validators (${pct ?? "?"}%), threshold ${s.threshold}` : "no voting data") : `does not exist on ${d.network.label}`}</div>{s?.majority ? <div className="text-xs text-muted">majority since {new Date((s.majority + 946684800) * 1000).toLocaleString("en-US")}</div> : null}{s?.vetoed ? <div className="text-xs text-danger">vetoed by this node</div> : null}</div>
        <div className="card"><div className="text-xs uppercase text-muted">Affects</div><div className="flex flex-wrap gap-1">{txs.map((t) => <NLink key={t.name} href={`/tx/${t.name}`} className="tag">{t.name}</NLink>)}{txs.length === 0 && <span className="text-xs text-muted">no transactor queries it directly</span>}</div></div>
      </section>

      {doc ? <section className="max-w-3xl"><Markdown>{doc.body}</Markdown></section> : <section className="card text-sm text-muted">Documentation not written yet.</section>}

      <section className="text-sm text-muted">Declaration: <a className="link" href={d.sourceUrl("include/xrpl/protocol/detail/features.macro")} target="_blank" rel="noreferrer">features.macro</a>{f && ` (position ${f.order + 1}, reverse chronological order)`}. Usage in code: <a className="link" href={`https://github.com/search?q=repo%3AXRPLF%2Frippled+${f?.kind === "fix" ? name : "feature" + name}&type=code`} target="_blank" rel="noreferrer">search on GitHub ↗</a></section>
    </div>
  );
}
