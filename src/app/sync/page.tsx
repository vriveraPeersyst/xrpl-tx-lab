import { protocol, testnet } from "@/lib/protocol";
import { readCoverage, readSyncLog } from "@/lib/content";
import { Stat } from "@/components/protocol";

export const metadata = { title: "Sync" };

export default function SyncPage() {
  const cov = readCoverage();
  const log = readSyncLog();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Sync with testnet</h1>
        <p className="text-muted">A daily job (pm2, 12:00 Europe/Madrid) takes a testnet snapshot, aligns the rippled code with the deployed version, re-extracts the data and runs the coverage lint. If a new type, object or amendment appears, it generates its documentation and marks it as a draft.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="xrpld on testnet" value={testnet.buildVersion} sub={new Date(testnet.fetchedAt).toLocaleString("en-US")} />
        <Stat label="rippled source" value={protocol.source.version ?? "?"} sub={`${protocol.source.branch} @ ${protocol.source.commit?.slice(0, 8)} · ${protocol.source.commitDate ? new Date(protocol.source.commitDate).toLocaleDateString("en-US") : ""}`} />
        <Stat label="Coverage" value={cov ? (cov.ok ? "complete" : `${cov.errors.length} errors`) : "—"} sub={cov ? `${cov.warnings.length} warnings` : ""} />
        <Stat label="server_definitions" value={testnet.definitions.hash.slice(0, 8)} sub="hash of the binary's definitions" />
      </section>
      {cov && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card"><h2 className="mb-2 font-semibold">Coverage errors ({cov.errors.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.errors.map((e) => <li key={e} className="text-danger">{e}</li>)}{cov.errors.length === 0 && <li className="text-success">Everything covered.</li>}</ul></div>
          <div className="card"><h2 className="mb-2 font-semibold">Warnings: source vs testnet ({cov.warnings.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.warnings.map((w) => <li key={w} className="text-warning">{w}</li>)}</ul></div>
        </section>
      )}
      <section>
        <h2 className="mb-2 display-md">Sync history ({log.length})</h2>
        {log.length === 0 && <p className="text-sm text-muted">No automatic sync has run yet.</p>}
        <ul className="space-y-2">{log.map((e) => <li key={e.at} className="card text-sm"><div className="flex flex-wrap gap-2"><b>{new Date(e.at).toLocaleString("en-US")}</b><span className="text-muted">testnet {e.testnet}</span><span className={e.coverageOk ? "text-success" : "text-danger"}>{e.coverageOk ? "coverage OK" : `${e.errors.length} errors`}</span></div>{e.changes.length > 0 && <ul className="ml-4 mt-1 list-disc">{e.changes.map((c) => <li key={c}>{c}</li>)}</ul>}{e.generated.length > 0 && <p className="mt-1 text-xs text-muted">Generated: {e.generated.join(", ")}</p>}</li>)}</ul>
      </section>
    </div>
  );
}
