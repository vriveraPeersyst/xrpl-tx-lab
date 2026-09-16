import Link from "next/link";
import { notFound } from "next/navigation";
import { protocol, testnet, featureIdToName, sourceUrl } from "@/lib/protocol";
import { readDoc } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { amendmentState } from "@/components/protocol";

export function generateStaticParams() {
  const names = new Set([...testnet.amendments.map((a) => a.name), ...protocol.features.map((f) => f.name)]);
  return [...names].map((name) => ({ name }));
}
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return { title: `${name} (amendment)`, description: readDoc("amendments", name)?.data.summary };
}

export default async function AmendmentPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const s = testnet.amendments.find((a) => a.name === name);
  const f = protocol.features.find((x) => x.name === name);
  if (!s && !f) notFound();
  const doc = readDoc("amendments", name);
  const st = amendmentState(s);
  const txs = protocol.transactions.filter((t) => t.amendment === name || t.transactor?.allFeatures.some((x) => featureIdToName(x) === name));
  const pct = s && s.count !== undefined && s.validations ? Math.round((s.count / s.validations) * 100) : undefined;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted"><Link href="/amendments" className="hover:underline">Amendments</Link> / {f?.kind === "fix" ? "corrección" : "funcionalidad"}</div>
        <h1 className="display-lg font-mono font-light">{name}</h1>
        <p className="max-w-3xl text-lg text-muted">{doc?.data.summary}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${st.cls}`}>{st.label} en testnet</span>
          {f && <span className="badge bg-surface-2 text-muted">fuente: {f.supported ? "Supported::Yes" : "Supported::No"} · {f.defaultVote === "yes" ? "DefaultYes" : f.defaultVote === "no" ? "DefaultNo" : "Obsolete"}{f.retired ? " · retirado" : ""}</span>}
          {doc?.data.xls && <a className="link" href={doc.data.xlsUrl ?? `https://github.com/XRPLF/XRPL-Standards`} target="_blank" rel="noreferrer">{doc.data.xls} ↗</a>}
          {doc?.data.xrplDocs && <a className="link" href={doc.data.xrplDocs} target="_blank" rel="noreferrer">xrpl.org ↗</a>}
          {doc?.data.introducedIn && <span className="badge bg-surface-2 text-muted">rippled {doc.data.introducedIn}</span>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card"><div className="text-xs uppercase text-muted">ID</div><div className="break-all font-mono text-xs">{s?.id ?? "—"}</div></div>
        <div className="card"><div className="text-xs uppercase text-muted">Votación en testnet</div><div className="text-sm">{s ? (s.enabled ? "activo" : s.count !== undefined ? `${s.count} de ${s.validations ?? "?"} validadores (${pct ?? "?"} %), umbral ${s.threshold}` : "sin datos de votación") : "no existe en testnet"}</div>{s?.majority ? <div className="text-xs text-muted">mayoría desde {new Date((s.majority + 946684800) * 1000).toLocaleString("es-ES")}</div> : null}{s?.vetoed ? <div className="text-xs text-danger">vetado por este nodo</div> : null}</div>
        <div className="card"><div className="text-xs uppercase text-muted">Afecta a</div><div className="flex flex-wrap gap-1">{txs.map((t) => <Link key={t.name} href={`/tx/${t.name}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft hover:text-accent-ink">{t.name}</Link>)}{txs.length === 0 && <span className="text-xs text-muted">ningún transactor lo consulta directamente</span>}</div></div>
      </section>

      {doc ? <section className="max-w-3xl"><Markdown>{doc.body}</Markdown></section> : <section className="card text-sm text-muted">Documentación pendiente de redactar.</section>}

      <section className="text-sm text-muted">Declaración: <a className="link" href={sourceUrl("include/xrpl/protocol/detail/features.macro")} target="_blank" rel="noreferrer">features.macro</a>{f && ` (posición ${f.order + 1}, orden cronológico inverso)`}. Uso en el código: <a className="link" href={`https://github.com/search?q=repo%3AXRPLF%2Frippled+${f?.kind === "fix" ? name : "feature" + name}&type=code`} target="_blank" rel="noreferrer">buscar en GitHub ↗</a></section>
    </div>
  );
}
