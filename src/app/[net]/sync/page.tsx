import { getNet, availableNetworkIds } from "@/lib/protocol";
import { NETWORKS } from "@/lib/networks";
import { readCoverage, readSyncLog } from "@/lib/content";
import { Stat } from "@/components/protocol";

export const metadata = { title: "Sync" };

export default async function SyncPage({ params }: { params: Promise<{ net: string }> }) {
  const { net } = await params;
  const d = getNet(net);
  const cov = readCoverage();
  const log = readSyncLog();
  const available = availableNetworkIds();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Sync with the networks</h1>
        <p className="text-muted">A daily job (pm2, 12:00 Europe/Madrid) snapshots every network, aligns the rippled source with each deployed version (exact tag when public, otherwise develop), re-extracts the data and runs the coverage lint. If a new type, object or amendment appears, it generates its documentation and marks it as a draft.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`xrpld on ${d.network.label}`} value={d.snapshot.buildVersion} sub={new Date(d.snapshot.fetchedAt).toLocaleString("en-US")} />
        <Stat label="rippled source" value={d.protocol.source.version ?? "?"} sub={`${d.protocol.source.branch} @ ${d.protocol.source.commit?.slice(0, 8)} · ${d.protocol.source.commitDate ? new Date(d.protocol.source.commitDate).toLocaleDateString("en-US") : ""}`} />
        <Stat label="Coverage" value={cov ? (cov.ok ? "complete" : `${cov.errors.length} errors`) : "—"} sub={cov ? `${cov.warnings.length} warnings` : ""} />
        <Stat label="server_definitions" value={d.snapshot.definitions.hash.slice(0, 8)} sub="hash of the binary's definitions" />
      </section>
      <section>
        <h2 className="mb-2 display-md">Networks</h2>
        <table className="tbl">
          <thead><tr><th>Network</th><th>xrpld</th><th>Network id</th><th>Source</th><th>Amendments</th><th>Tx types</th><th>Snapshot</th></tr></thead>
          <tbody>
            {NETWORKS.map((n) => {
              if (!available.includes(n.id)) return <tr key={n.id} className="opacity-60"><td>{n.label}</td><td colSpan={6} className="text-xs text-muted">unreachable at the last sync — no data</td></tr>;
              const s = getNet(n.id).snapshot;
              const p = getNet(n.id).protocol;
              return <tr key={n.id} className={n.id === net ? "font-medium" : ""}><td><a href={`/${n.id}/sync`} className="hover:underline">{n.label}</a></td><td className="font-mono">{s.buildVersion}</td><td className="font-mono">{s.networkId}</td><td className="font-mono text-xs">{s.sourceRef} ({p.source.version})</td><td>{s.amendments.filter((a) => a.enabled).length}/{s.amendments.length}</td><td>{Object.keys(s.definitions.TRANSACTION_TYPES).length - 1}</td><td className="text-xs text-muted">{new Date(s.fetchedAt).toLocaleString("en-US")}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
      {cov && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card"><h2 className="mb-2 font-semibold">Coverage errors ({cov.errors.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.errors.map((e) => <li key={e} className="text-danger">{e}</li>)}{cov.errors.length === 0 && <li className="text-success">Everything covered.</li>}</ul></div>
          <div className="card"><h2 className="mb-2 font-semibold">Warnings: source vs networks ({cov.warnings.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.warnings.map((w) => <li key={w} className="text-warning">{w}</li>)}</ul></div>
        </section>
      )}
      <section>
        <h2 className="mb-2 display-md">Sync history ({log.length})</h2>
        {log.length === 0 && <p className="text-sm text-muted">No automatic sync has run yet.</p>}
        <ul className="space-y-2">{log.map((e) => <li key={e.at} className="card text-sm"><div className="flex flex-wrap gap-2"><b>{new Date(e.at).toLocaleString("en-US")}</b><span className="text-muted">{e.networks ? Object.entries(e.networks).map(([id, n]) => `${id} ${n.version}`).join(" · ") : e.testnet ? `testnet ${e.testnet}` : ""}</span><span className={e.coverageOk ? "text-success" : "text-danger"}>{e.coverageOk ? "coverage OK" : `${e.errors.length} errors`}</span></div>{e.changes.length > 0 && <ul className="ml-4 mt-1 list-disc">{e.changes.map((c) => <li key={c}>{c}</li>)}</ul>}{e.generated.length > 0 && <p className="mt-1 text-xs text-muted">Generated: {e.generated.join(", ")}</p>}</li>)}</ul>
      </section>
    </div>
  );
}
