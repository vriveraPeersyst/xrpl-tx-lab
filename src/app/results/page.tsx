import Link from "next/link";
import { protocol, testnet, TER_CATEGORIES, txReturning } from "@/lib/protocol";

export const metadata = { title: "Códigos de resultado (TER)" };

export default function ResultsPage() {
  const inTestnet = new Set(Object.keys(testnet.definitions.TRANSACTION_RESULTS));
  const cats = ["tes", "tec", "tem", "tef", "tel", "ter"];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Códigos de resultado ({inTestnet.size} en testnet)</h1>
        <p className="text-muted">Cada transacción termina con un código <code>TER</code>. El prefijo dice si se aplicó y si cobró fee.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => <div key={c} className="card"><div className="font-mono font-semibold">{c}* <span className="ml-1 text-sm font-normal text-muted">{TER_CATEGORIES[c].label}</span></div><p className="text-sm text-muted">{TER_CATEGORIES[c].meaning}</p><p className="mt-1 text-xs">{TER_CATEGORIES[c].applied ? "Se incluye en el ledger" : "No se incluye"} · {TER_CATEGORIES[c].claimsFee ? "cobra fee" : "no cobra fee"}</p></div>)}
      </div>
      {cats.map((c) => {
        const rows = protocol.results.filter((r) => r.category === c).sort((a, b) => a.value - b.value);
        return (
          <section key={c}>
            <h2 className="mb-2 font-mono text-lg font-semibold">{c}* <span className="text-sm font-normal text-muted">({rows.length})</span></h2>
            <table className="tbl">
              <thead><tr><th>Código</th><th>Valor</th><th>Descripción</th><th>Lo devuelven</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const txs = txReturning(r.code);
                  return (
                    <tr key={r.code} id={r.code} className={!inTestnet.has(r.code) ? "opacity-60" : ""}>
                      <td className="font-mono">{r.code}{r.unused && <span className="badge ml-1 bg-surface-2 text-muted">sin uso</span>}{!inTestnet.has(r.code) && <span className="badge ml-1 bg-surface-2 text-muted">solo en fuente</span>}</td>
                      <td className="font-mono text-xs text-muted">{testnet.definitions.TRANSACTION_RESULTS[r.code] ?? r.value}</td>
                      <td>{r.description}{r.comment && <span className="block text-xs text-muted">{r.comment}</span>}</td>
                      <td className="text-xs">{txs.slice(0, 8).map((t) => <Link key={t} href={`/tx/${t}`} className="mr-1 font-mono hover:underline">{t}</Link>)}{txs.length > 8 && <span className="text-muted">+{txs.length - 8}</span>}{txs.length === 0 && <span className="text-muted">genérico / motor</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
