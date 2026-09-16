import { protocol, testnet } from "@/lib/protocol";
import { readCoverage, readSyncLog } from "@/lib/content";
import { Stat } from "@/components/protocol";

export const metadata = { title: "Sincronización" };

export default function SyncPage() {
  const cov = readCoverage();
  const log = readSyncLog();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Sincronización con testnet</h1>
        <p className="text-muted">Un job diario (pm2, 12:00 Europe/Madrid) toma un snapshot de la testnet, alinea el código de rippled con la versión desplegada, re-extrae los datos y pasa el lint de cobertura. Si aparece un tipo, objeto o amendment nuevo, genera su documentación y la deja marcada como borrador.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="xrpld en testnet" value={testnet.buildVersion} sub={new Date(testnet.fetchedAt).toLocaleString("es-ES")} />
        <Stat label="Fuente rippled" value={protocol.source.version ?? "?"} sub={`${protocol.source.branch} @ ${protocol.source.commit?.slice(0, 8)} · ${protocol.source.commitDate ? new Date(protocol.source.commitDate).toLocaleDateString("es-ES") : ""}`} />
        <Stat label="Cobertura" value={cov ? (cov.ok ? "completa" : `${cov.errors.length} errores`) : "—"} sub={cov ? `${cov.warnings.length} avisos` : ""} />
        <Stat label="server_definitions" value={testnet.definitions.hash.slice(0, 8)} sub="hash de las definiciones del binario" />
      </section>
      {cov && (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="card"><h2 className="mb-2 font-semibold">Errores de cobertura ({cov.errors.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.errors.map((e) => <li key={e} className="text-danger">{e}</li>)}{cov.errors.length === 0 && <li className="text-success">Todo cubierto.</li>}</ul></div>
          <div className="card"><h2 className="mb-2 font-semibold">Avisos: fuente vs testnet ({cov.warnings.length})</h2><ul className="max-h-80 space-y-1 overflow-auto text-xs">{cov.warnings.map((w) => <li key={w} className="text-warning">{w}</li>)}</ul></div>
        </section>
      )}
      <section>
        <h2 className="mb-2 display-md">Historial de sincronizaciones ({log.length})</h2>
        {log.length === 0 && <p className="text-sm text-muted">Todavía no se ha ejecutado ninguna sincronización automática.</p>}
        <ul className="space-y-2">{log.map((e) => <li key={e.at} className="card text-sm"><div className="flex flex-wrap gap-2"><b>{new Date(e.at).toLocaleString("es-ES")}</b><span className="text-muted">testnet {e.testnet}</span><span className={e.coverageOk ? "text-success" : "text-danger"}>{e.coverageOk ? "cobertura OK" : `${e.errors.length} errores`}</span></div>{e.changes.length > 0 && <ul className="ml-4 mt-1 list-disc">{e.changes.map((c) => <li key={c}>{c}</li>)}</ul>}{e.generated.length > 0 && <p className="mt-1 text-xs text-muted">Generado: {e.generated.join(", ")}</p>}</li>)}</ul>
      </section>
    </div>
  );
}
