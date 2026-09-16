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
            <h1 className="display-xl max-w-3xl">Every XRPL transaction, explained from the code.</h1>
          </div>
          <div className="relative mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <p className="standfirst max-w-xl">Every transaction type and every ledger object is documented from the xrpld source code (the version running on testnet). Connect Xaman, build the transaction, simulate it and submit it.</p>
            <Link href="/tx/Payment" className="btn-primary shrink-0">Start with a Payment <ArrowUpRight size={16} /></Link>
          </div>
        </div>
        <div className="card-black grid-lines flex flex-col justify-between">
          <p className="relative text-sm text-green-300">xrpld on testnet</p>
          <div className="relative">
            <p className="datapoint text-green-300" style={{ fontSize: "3.5rem" }}>{testnet.buildVersion}</p>
            <p className="mt-2 text-xs text-grey-300">ledger {testnet.validatedLedger.seq.toLocaleString("en-US")} · {new Date(testnet.fetchedAt).toLocaleDateString("en-US")}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Transaction types" value={names.length} sub={`${names.length - 3} submittable + 3 pseudo`} href="/tx" />
        <Tile label="Ledger objects" value={testnetLedgerEntryNames().length} sub={`${protocol.sfields.length} serialized fields`} href="/objects" />
        <Tile label="Active amendments" value={`${enabled}/${testnet.amendments.length}`} sub={`${voting.length} in voting`} href="/amendments" />
        <Tile label="Reserve per object" value={`${testnet.reserves.incXrp} XRP`} sub={`base ${testnet.reserves.baseXrp} XRP · fee ${Math.round(testnet.reserves.baseFeeXrp * 1e6)} drops`} href="/reserves" />
      </section>

      <section>
        <h2 className="display-lg mb-6">Transactions by category</h2>
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
            <h2 className="display-md mb-3">How a transaction is processed</h2>
            <ol className="ml-5 list-decimal space-y-1 text-sm">
              <li><b>preflight</b>: static validation (fields, flags, amendments). <code>tem*</code> errors, no fee.</li>
              <li><b>preclaim</b>: checks against the ledger (balances, objects, permissions).</li>
              <li><b>doApply</b>: applies the changes. If it fails with <code>tec*</code> it charges the fee and consumes the Sequence.</li>
            </ol>
            <Link href="/results" className="mt-4 inline-flex items-center gap-1 text-sm underline">See all result codes <ArrowUpRight size={14} /></Link>
          </div>
        </div>
        <div className="card">
          <h2 className="display-md mb-3">Automatic updates</h2>
          <p className="text-sm text-muted">A daily job (12:00 Madrid time) queries testnet, aligns the rippled source code with the deployed version, re-extracts the data and runs a coverage lint that requires documentation and UI for every type, object, flag, field and amendment.</p>
          <p className="mt-3 text-sm">Status: {cov ? (cov.ok ? <span className="text-accent-ink">full coverage</span> : <span className="text-danger">{cov.errors.length} items not covered</span>) : "no data"} · <Link className="link" href="/sync">details</Link></p>
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
