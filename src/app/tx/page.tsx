import Link from "next/link";
import { getTx, testnetTxNames, amendmentStatus } from "@/lib/protocol";
import { CATEGORIES, txByCategory, registry } from "@/lib/tx/registry";
import { readDoc } from "@/lib/content";
import { AmendmentBadge } from "@/components/protocol";

export const metadata = { title: "Transacciones" };

export default function TxIndex() {
  const names = testnetTxNames();
  const byCat = txByCategory(names);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tipos de transacción en testnet ({names.length})</h1>
        <p className="text-muted">Los que existen en el <code>xrpld</code> de testnet. Los que dependen de un amendment no activo se pueden construir, pero el nodo los rechazará con <code>temDISABLED</code>.</p>
      </div>
      {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).filter((c) => byCat[c].length).map((c) => (
        <section key={c}>
          <h2 className="mb-2 text-lg font-semibold">{CATEGORIES[c].label} <span className="text-sm font-normal text-muted">· {CATEGORIES[c].blurb}</span></h2>
          <table className="tbl">
            <thead><tr><th>Tipo</th><th>Resumen</th><th>Amendment</th><th className="text-right">Campos</th></tr></thead>
            <tbody>
              {byCat[c].map((n) => {
                const t = getTx(n);
                const doc = readDoc("tx", n);
                const gate = t?.amendment;
                return (
                  <tr key={n}>
                    <td><Link href={`/tx/${n}`} className="font-mono font-medium hover:underline">{n}</Link>{registry[n]?.generated && <span className="badge ml-1 bg-warning/15 text-warning">auto</span>}</td>
                    <td className="text-muted">{doc?.data.summary ?? t?.doc ?? ""}</td>
                    <td>{gate ? <AmendmentBadge name={gate} /> : <span className="text-xs text-muted">—</span>}{gate && amendmentStatus(gate)?.enabled === false && <span className="ml-1 text-xs text-danger">temDISABLED</span>}</td>
                    <td className="text-right text-muted">{t?.fields.length ?? "?"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
