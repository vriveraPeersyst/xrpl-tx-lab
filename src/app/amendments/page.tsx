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
        <td><span className={`badge ${st.cls}`}>{st.label}</span>{s && !s.enabled && s.count !== undefined && <span className="ml-1 text-xs text-muted">{s.count}/{s.validations ?? "?"} votes (threshold {s.threshold})</span>}</td>
        <td className="whitespace-nowrap text-xs text-muted">{f ? `${f.supported ? "supported" : "not supported"} · default vote: ${f.defaultVote}` : "not in source"}</td>
        <td className="min-w-72 text-muted">{doc?.data.summary ?? ""}</td>
        <td className="text-xs">{txs.slice(0, 6).map((t) => <Link key={t} href={`/tx/${t}`} className="mr-1 font-mono hover:underline">{t}</Link>)}{txs.length > 6 && <span className="text-muted">+{txs.length - 6}</span>}</td>
      </tr>
    );
  };
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Amendments</h1>
        <p className="text-muted">Actual state on testnet (RPC <code>feature</code>) versus what the source code declares (<code>features.macro</code>). An amendment activates when it holds &gt; 80% of validator votes for two weeks.</p>
      </div>
      <section>
        <h2 className="mb-2 display-md">Voting or pending on testnet ({voting.length})</h2>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Testnet status</th><th>Source</th><th>Summary</th><th>Transactions</th></tr></thead><tbody>{voting.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 display-md">Source code only, not yet on testnet ({sourceOnly.length})</h2>
        <p className="mb-2 text-sm text-muted">Proposals already on rippled&apos;s <code>{protocol.source.branch}</code> branch ({protocol.source.version}) but that the testnet binary ({testnet.buildVersion}) doesn&apos;t know about yet.</p>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Testnet status</th><th>Source</th><th>Summary</th><th>Transactions</th></tr></thead><tbody>{sourceOnly.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 display-md">Active on testnet ({enabled.length})</h2>
        <table className="tbl"><thead><tr><th>Amendment</th><th>Testnet status</th><th>Source</th><th>Summary</th><th>Transactions</th></tr></thead><tbody>{enabled.map((a) => <Row key={a.name} name={a.name} />)}</tbody></table>
      </section>
      <section>
        <h2 className="mb-2 display-md">Retired (merged into the base protocol)</h2>
        <p className="text-sm text-muted">{protocol.features.filter((f) => f.retired).map((f) => f.name).join(", ")}</p>
      </section>
    </div>
  );
}
