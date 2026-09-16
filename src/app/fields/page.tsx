import Link from "next/link";
import { protocol, testnet, fieldUsage, normalizeType } from "@/lib/protocol";

export const metadata = { title: "Serialized fields" };

const TYPE_DOC: Record<string, string> = {
  AccountID: "Account address (base58 r…), 20 bytes.",
  Amount: "XRP in drops (decimal string), token {currency, issuer, value} or MPT {mpt_issuance_id, value}.",
  Issue: "Asset without amount: {currency} (XRP), {currency, issuer} or {mpt_issuance_id}.",
  Currency: "Currency code: 3 letters or 40 hex.",
  UInt8: "8-bit unsigned integer.", UInt16: "16-bit unsigned integer.", UInt32: "32-bit unsigned integer.", UInt64: "64-bit unsigned integer (in JSON, decimal or hex string).", Int32: "32-bit signed integer.",
  Number: "Arbitrary-precision decimal number (mantissa/exponent), as a string.",
  Hash128: "16 bytes in hex.", Hash160: "20 bytes in hex.", Hash192: "24 bytes in hex (e.g. MPTokenIssuanceID).", Hash256: "32 bytes in hex (object IDs, tx hashes).",
  Blob: "Variable-length binary data, in hex.",
  STArray: "Array of inner objects.", STObject: "Inner object.",
  PathSet: "Payment paths (array of arrays of steps).", Vector256: "Array of 256-bit hashes.",
  XChainBridge: "Bridge definition: gates and assets of both chains.",
};

export default function FieldsPage() {
  const tnFields = testnet.definitions.FIELDS;
  const rows = protocol.sfields.filter((s) => !s.untyped && s.nth > 0).map((s) => ({ ...s, jsonType: tnFields[s.name]?.type ?? normalizeType(s.type), inTestnet: s.name in tnFields, usage: fieldUsage(s.name) })).sort((a, b) => a.name.localeCompare(b.name));
  const types = [...new Set(rows.map((r) => r.jsonType))].sort();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Serialized fields ({rows.length})</h1>
        <p className="text-muted">Every protocol <code>SField</code>, with its serialization type and where it&apos;s used (transactions, ledger objects, inner objects).</p>
      </div>
      <section>
        <h2 className="mb-2 display-md">Types</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{types.map((t) => <div key={t} id={t} className="card py-2"><div className="font-mono font-semibold">{t} <span className="text-xs font-normal text-muted">code {testnet.definitions.TYPES[t] ?? "?"}</span></div><p className="text-xs text-muted">{TYPE_DOC[t] ?? ""}</p></div>)}</div>
      </section>
      <table className="tbl">
        <thead><tr><th>Field</th><th>Type</th><th>nth</th><th>Transactions</th><th>Objects</th><th>Inner</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={!r.inTestnet ? "opacity-60" : ""}>
              <td><Link href={`/fields/${r.name}`} className="font-mono hover:underline">{r.name}</Link>{!r.inTestnet && <span className="badge ml-1 bg-surface-2 text-muted">source only</span>}</td>
              <td className="font-mono text-xs">{r.jsonType}</td>
              <td className="text-xs text-muted">{r.nth}</td>
              <td className="text-xs">{r.usage.transactions.slice(0, 5).map((t) => <Link key={t} href={`/tx/${t}`} className="mr-1 font-mono hover:underline">{t}</Link>)}{r.usage.transactions.length > 5 && <span className="text-muted">+{r.usage.transactions.length - 5}</span>}</td>
              <td className="text-xs">{r.usage.ledgerEntries.slice(0, 4).map((t) => <Link key={t} href={`/objects/${t}`} className="mr-1 font-mono hover:underline">{t}</Link>)}{r.usage.ledgerEntries.length > 4 && <span className="text-muted">+{r.usage.ledgerEntries.length - 4}</span>}</td>
              <td className="text-xs text-muted">{r.usage.innerObjects.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
