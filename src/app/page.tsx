import Link from "next/link";
import { protocol, testnet, testnetTxNames, testnetLedgerEntryNames } from "@/lib/protocol";
import { CATEGORIES, txByCategory } from "@/lib/tx/registry";
import { Stat } from "@/components/protocol";
import { readCoverage } from "@/lib/content";

export default function Home() {
  const names = testnetTxNames();
  const byCat = txByCategory(names);
  const enabled = testnet.amendments.filter((a) => a.enabled).length;
  const voting = testnet.amendments.filter((a) => !a.enabled && a.supported && !a.vetoed);
  const cov = readCoverage();
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Todas las transacciones de la XRPL, explicadas desde el código y ejecutables en testnet</h1>
        <p className="max-w-3xl text-muted">
          Cada tipo de transacción y cada objeto del ledger se documenta a partir del código fuente de <code>xrpld</code> (la versión que corre en testnet), con sus campos, flags, códigos de resultado y amendments que lo condicionan. Conecta <b>Xaman</b>, construye la transacción con el formulario, simúlala sin firmar y envíala a la testnet.
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/tx/Payment" className="btn-primary">Empezar con un Payment</Link>
          <Link href="/amendments" className="btn-secondary">Ver amendments en votación</Link>
          <Link href="/account" className="btn-secondary">Mi cuenta en testnet</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="xrpld en testnet" value={testnet.buildVersion} sub={`ledger ${testnet.validatedLedger.seq.toLocaleString("es-ES")}`} />
        <Stat label="Tipos de transacción" value={names.length} sub={`${names.length - 3} enviables + 3 pseudo`} />
        <Stat label="Objetos del ledger" value={testnetLedgerEntryNames().length} sub={`${protocol.sfields.length} campos serializados`} />
        <Stat label="Amendments" value={`${enabled} / ${testnet.amendments.length}`} sub={`${voting.length} en votación · ${protocol.features.filter((f) => !f.retired && !testnet.amendments.some((a) => a.name === f.name)).length} solo en la fuente`} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Transacciones por categoría</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((c) => byCat[c].length).map((c) => (
            <div key={c} className="card">
              <div className="flex items-baseline justify-between"><h3 className="font-semibold">{CATEGORIES[c].label}</h3><span className="text-xs text-muted">{byCat[c].length}</span></div>
              <p className="mb-2 text-xs text-muted">{CATEGORIES[c].blurb}</p>
              <div className="flex flex-wrap gap-1">{byCat[c].map((n) => <Link key={n} href={`/tx/${n}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft hover:text-accent">{n}</Link>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Cómo se procesa una transacción</h2>
          <ol className="ml-5 list-decimal space-y-1 text-sm">
            <li><b>preflight</b>: validación estática (campos, flags, amendments activos). Errores <code>tem*</code>. No cuesta fee.</li>
            <li><b>preclaim</b>: comprobaciones contra el ledger (saldos, objetos, permisos). Errores <code>tec*</code>/<code>ter*</code>/<code>tef*</code>.</li>
            <li><b>doApply</b>: aplica los cambios. Si falla con <code>tec*</code>, se cobra el fee igualmente y avanza el Sequence.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Cada página de transacción muestra qué códigos puede devolver cada fase, leídos del transactor en C++. <Link className="link" href="/results">Ver todos los códigos</Link>.</p>
        </div>
        <div className="card">
          <h2 className="mb-2 font-semibold">Actualización automática</h2>
          <p className="text-sm text-muted">Un job diario (12:00 Madrid) consulta la testnet, alinea el código fuente de rippled con la versión desplegada, re-extrae todos los datos y pasa un lint de cobertura que exige documentación y UI para cada tipo, objeto, flag, campo y amendment.</p>
          <p className="mt-2 text-sm">Estado: {cov ? (cov.ok ? <span className="text-success">cobertura completa</span> : <span className="text-warning">{cov.errors.length} elementos sin cubrir</span>) : "sin datos"} · <Link className="link" href="/sync">detalles</Link></p>
        </div>
      </section>
    </div>
  );
}
