import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { protocol, testnet, testnetTxNames, testnetLedgerEntryNames } from "@/lib/protocol";
import { CATEGORIES, txByCategory } from "@/lib/tx/registry";
import { readCoverage } from "@/lib/content";

export default function Home() {
  const names = testnetTxNames();
  const byCat = txByCategory(names);
  const enabled = testnet.amendments.filter((a) => a.enabled).length;
  const voting = testnet.amendments.filter((a) => !a.enabled && a.supported && !a.vetoed);
  const cov = readCoverage();
  return (
    <div className="space-y-12">
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card-grey grid-lines lg:col-span-2 flex min-h-[380px] flex-col justify-between">
          <div className="relative">
            <h1 className="display-xl max-w-3xl">Todas las transacciones de la XRPL, explicadas desde el código.</h1>
          </div>
          <div className="relative mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <p className="standfirst max-w-xl">Cada tipo de transacción y cada objeto del ledger se documenta a partir del código fuente de xrpld (la versión que corre en testnet). Conecta Xaman, construye la transacción, simúlala y envíala.</p>
            <Link href="/tx/Payment" className="btn-primary shrink-0">Empezar con un Payment <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="card-black grid-lines flex flex-col justify-between">
          <p className="relative text-sm text-green-300">xrpld en testnet</p>
          <div className="relative">
            <p className="datapoint text-green-300" style={{ fontSize: "3.5rem" }}>{testnet.buildVersion}</p>
            <p className="mt-2 text-xs text-grey-300">ledger {testnet.validatedLedger.seq.toLocaleString("es-ES")} · {new Date(testnet.fetchedAt).toLocaleDateString("es-ES")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Tipos de transacción" value={names.length} sub={`${names.length - 3} enviables + 3 pseudo`} href="/tx" />
        <Tile label="Objetos del ledger" value={testnetLedgerEntryNames().length} sub={`${protocol.sfields.length} campos serializados`} href="/objects" />
        <Tile label="Amendments activos" value={`${enabled}/${testnet.amendments.length}`} sub={`${voting.length} en votación`} href="/amendments" />
        <Tile label="Reserva por objeto" value={`${testnet.reserves.incXrp} XRP`} sub={`base ${testnet.reserves.baseXrp} XRP · fee ${Math.round(testnet.reserves.baseFeeXrp * 1e6)} drops`} href="/reserves" />
      </section>

      <section>
        <h2 className="display-lg mb-6">Transacciones por categoría</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((c) => byCat[c].length).map((c) => (
            <div key={c} className="card">
              <div className="flex items-baseline justify-between"><h3 className="display-md">{CATEGORIES[c].label}</h3><span className="text-xs text-muted">{byCat[c].length}</span></div>
              <p className="mb-3 mt-1 text-sm text-muted">{CATEGORIES[c].blurb}</p>
              <div className="flex flex-wrap gap-1">{byCat[c].map((n) => <Link key={n} href={`/tx/${n}`} className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs hover:bg-accent hover:text-black">{n}</Link>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card-green grid-lines">
          <div className="relative">
            <h2 className="display-md mb-3">Cómo se procesa una transacción</h2>
            <ol className="ml-5 list-decimal space-y-1 text-sm">
              <li><b>preflight</b>: validación estática (campos, flags, amendments). Errores <code>tem*</code>, sin fee.</li>
              <li><b>preclaim</b>: comprobaciones contra el ledger (saldos, objetos, permisos).</li>
              <li><b>doApply</b>: aplica los cambios. Si falla con <code>tec*</code> cobra el fee y consume el Sequence.</li>
            </ol>
            <Link href="/results" className="mt-4 inline-flex items-center gap-1 text-sm underline">Ver todos los códigos <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <div className="card">
          <h2 className="display-md mb-3">Actualización automática</h2>
          <p className="text-sm text-muted">Un job diario (12:00 Madrid) consulta la testnet, alinea el código fuente de rippled con la versión desplegada, re-extrae los datos y pasa un lint de cobertura que exige documentación y UI para cada tipo, objeto, flag, campo y amendment.</p>
          <p className="mt-3 text-sm">Estado: {cov ? (cov.ok ? <span className="text-accent-ink">cobertura completa</span> : <span className="text-danger">{cov.errors.length} elementos sin cubrir</span>) : "sin datos"} · <Link className="link" href="/sync">detalles</Link></p>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, sub, href }: { label: string; value: React.ReactNode; sub: string; href: string }) {
  return (
    <Link href={href} className="card group flex flex-col justify-between hover:border-fg">
      <div className="flex items-start justify-between text-xs text-muted"><span>{label}</span><ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" /></div>
      <p className="datapoint mt-6">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Link>
  );
}
