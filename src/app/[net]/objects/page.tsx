import NLink from "@/components/NLink";
import { getNet } from "@/lib/protocol";
import { readDoc } from "@/lib/content";

export const metadata = { title: "Ledger objects" };

export default async function ObjectsIndex({ params }: { params: Promise<{ net: string }> }) {
  const { net } = await params;
  const d = getNet(net);
  const names = d.ledgerEntryNames();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-lg">Ledger objects ({names.length})</h1>
        <p className="text-muted">Every ledger state entry (ledger entry) that exists in {d.network.label}&apos;s <code>xrpld</code>, with the fields and flags declared by the code.</p>
      </div>
      <table className="tbl">
        <thead><tr><th>Object</th><th>Type</th><th>Summary</th><th>Created by</th><th className="text-right">Fields</th><th className="text-right">Flags</th></tr></thead>
        <tbody>
          {names.map((n) => {
            const e = d.getLedgerEntry(n);
            const doc = readDoc("objects", n);
            return (
              <tr key={n}>
                <td><NLink href={`/objects/${n}`} className="font-mono font-medium hover:underline">{n}</NLink></td>
                <td className="font-mono text-xs text-muted">0x{d.defs.LEDGER_ENTRY_TYPES[n].toString(16).padStart(4, "0")}</td>
                <td className="text-muted">{doc?.data.summary ?? e?.doc?.replace(/\\sa.*$/, "") ?? ""}</td>
                <td className="text-xs">{(doc?.data.createdBy ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => <NLink key={s} href={`/tx/${s}`} className="mr-1 font-mono hover:underline">{s}</NLink>)}</td>
                <td className="text-right text-muted">{d.defs.LEDGER_ENTRY_FORMATS[n]?.length ?? e?.fields.length ?? "?"}</td>
                <td className="text-right text-muted">{Object.keys(d.defs.LEDGER_ENTRY_FLAGS[n] ?? {}).length || d.protocol.ledgerFlags[n]?.length || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
