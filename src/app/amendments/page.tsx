import Link from "next/link";
import { protocol, testnet, featureIdToName } from "@/lib/protocol";
import { readDoc } from "@/lib/content";
import { amendmentState } from "@/components/protocol";

export const metadata = { title: "Amendments" };

export default function AmendmentsIndex() {
  const tn = testnet.amendments;
  const enabled = tn.filter((a) => a.enabled);
  const voting = tn.filter((a) => !a.enabled);
  const sourceOnly = protocol.features.filter((f) => !f.retired && !tn.some((a) => a.name === f.name));
  const usedBy = (name: string) => protocol.transactions.filter((t) => t.amendment === name || t.transactor?.allFeatures.some((f) => featureIdToName(f) === name)).map((t) => t.name);
  const Row = ({ name }: { name: string }) => {
    const s = tn.find((a) => a.name === name);
    const f = protocol.features.find((x) => x.name === name);
    const doc = readDoc("amendments", name);
    const st = amendmentState(s);
    const txs = usedBy(name);
    return (
      <tr>
        <td><Link href={`/amendments/${name}`} className="font-mono font-medium hover:underline">{name}</Link></td>
        <td><span className={`badge ${st.cls}`}>{st.label}</span>{s && !s.enabled && s.count !== undefined && <span className="ml-1 text-xs text-muted">{s.count}/{s.validations ?? "?"} votos (umbral {s.threshold})</span>}</td>
        <td className="text-xs text-muted">{f ? `${f.supported ? "soportado" : "no soportado"} · voto por defecto: ${f.defaultVote}` : "no está en la fuente"}</td>
        <td className="text-muted">{doc?.data.summary ?? ""}</td>
        <td className="text-xs">{txs.slice(0, 6).map((t) => <Link key={t} href={`/tx/${t}`} className="mr-1 font-mono hover:underline">{t}</Link>)}{txs.length > 6 && <span className="text-muted">+{txs.length - 6}</span>}</td>
      </tr>
    );
  };
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Amendments</h1>
        <p className="text-muted">Estado real en la testnet (RPC <code>feature</code>) frente a lo que declara el código fuente (<code>features.macro</code>). Un amendment se activa cuando mantiene &gt; 80 % de los votos de los validadores durante dos semanas.</p>
      </div>
      <section>
        <h2 className="mb-2 text-lg font-semibold">En votación o pendientes en testnet ({voting.length})</h2>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Estado testnet</th><th>Fuente</th><th>Resumen</th><th>Transacciones</th></tr></thead><tbody>{voting.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Solo en el código fuente, aún no en testnet ({sourceOnly.length})</h2>
        <p className="mb-2 text-sm text-muted">Propuestas que ya están en la rama <code>{protocol.source.branch}</code> de rippled ({protocol.source.version}) pero que el binario de testnet ({testnet.buildVersion}) todavía no conoce.</p>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Estado testnet</th><th>Fuente</th><th>Resumen</th><th>Transacciones</th></tr></thead><tbody>{sourceOnly.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Activos en testnet ({enabled.length})</h2>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Estado testnet</th><th>Fuente</th><th>Resumen</th><th>Transacciones</th></tr></thead><tbody>{enabled.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Retirados (integrados en el protocolo base)</h2>
        <p className="text-sm text-muted">{protocol.features.filter((f) => f.retired).map((f) => f.name).join(", ")}</p>
      </section>
    </div>
  );
}
