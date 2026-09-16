import Link from "next/link";
import { getLedgerEntry, testnetLedgerEntryNames, protocol, testnet } from "@/lib/protocol";
import { readDoc } from "@/lib/content";

export const metadata = { title: "Objetos del ledger" };

export default function ObjectsIndex() {
  const names = testnetLedgerEntryNames();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Objetos del ledger ({names.length})</h1>
        <p className="text-muted">Cada entrada del estado del ledger (ledger entry) que existe en el <code>xrpld</code> de testnet, con los campos y flags que declara el código.</p>
      </div>
      <table className="tbl">
        <thead><tr><th>Objeto</th><th>Tipo</th><th>Resumen</th><th>Creado por</th><th className="text-right">Campos</th><th className="text-right">Flags</th></tr></thead>
        <tbody>
          {names.map((n) => {
            const e = getLedgerEntry(n);
            const doc = readDoc("objects", n);
            return (
              <tr key={n}>
                <td><Link href={`/objects/${n}`} className="font-mono font-medium hover:underline">{n}</Link></td>
                <td className="font-mono text-xs text-muted">0x{testnet.definitions.LEDGER_ENTRY_TYPES[n].toString(16).padStart(4, "0")}</td>
                <td className="text-muted">{doc?.data.summary ?? e?.doc?.replace(/\\sa.*$/, "") ?? ""}</td>
                <td className="text-xs">{(doc?.data.createdBy ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => <Link key={s} href={`/tx/${s}`} className="mr-1 font-mono hover:underline">{s}</Link>)}</td>
                <td className="text-right text-muted">{testnet.definitions.LEDGER_ENTRY_FORMATS[n]?.length ?? e?.fields.length ?? "?"}</td>
                <td className="text-right text-muted">{Object.keys(testnet.definitions.LEDGER_ENTRY_FLAGS[n] ?? {}).length || protocol.ledgerFlags[n]?.length || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
