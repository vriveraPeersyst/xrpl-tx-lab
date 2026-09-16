import Link from "next/link";
import { protocol, testnet, fieldUsage, normalizeType } from "@/lib/protocol";

export const metadata = { title: "Campos serializados" };

const TYPE_DOC: Record<string, string> = {
  AccountID: "Dirección de cuenta (base58 r…), 20 bytes.",
  Amount: "XRP en drops (string decimal), token {currency, issuer, value} o MPT {mpt_issuance_id, value}.",
  Issue: "Activo sin cantidad: {currency} (XRP), {currency, issuer} o {mpt_issuance_id}.",
  Currency: "Código de moneda: 3 letras o 40 hex.",
  UInt8: "Entero sin signo de 8 bits.", UInt16: "Entero sin signo de 16 bits.", UInt32: "Entero sin signo de 32 bits.", UInt64: "Entero sin signo de 64 bits (en JSON, string decimal o hex).", Int32: "Entero con signo de 32 bits.",
  Number: "Número decimal de precisión arbitraria (mantisa/exponente), como string.",
  Hash128: "16 bytes en hex.", Hash160: "20 bytes en hex.", Hash192: "24 bytes en hex (p. ej. MPTokenIssuanceID).", Hash256: "32 bytes en hex (IDs de objetos, hashes de tx).",
  Blob: "Datos binarios de longitud variable, en hex.",
  STArray: "Array de objetos internos.", STObject: "Objeto interno.",
  PathSet: "Rutas de pago (array de arrays de pasos).", Vector256: "Array de hashes de 256 bits.",
  XChainBridge: "Definición de puente: puertas y activos de ambas cadenas.",
};

export default function FieldsPage() {
  const tnFields = testnet.definitions.FIELDS;
  const rows = protocol.sfields.filter((s) => !s.untyped && s.nth > 0).map((s) => ({ ...s, jsonType: tnFields[s.name]?.type ?? normalizeType(s.type), inTestnet: s.name in tnFields, usage: fieldUsage(s.name) })).sort((a, b) => a.name.localeCompare(b.name));
  const types = [...new Set(rows.map((r) => r.jsonType))].sort();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Campos serializados ({rows.length})</h1>
        <p className="text-muted">Todos los <code>SField</code> del protocolo, con su tipo de serialización y dónde se usan (transacciones, objetos del ledger, objetos internos).</p>
      </div>
      <section>
        <h2 className="mb-2 display-md">Tipos</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{types.map((t) => <div key={t} id={t} className="card py-2"><div className="font-mono font-semibold">{t} <span className="text-xs font-normal text-muted">código {testnet.definitions.TYPES[t] ?? "?"}</span></div><p className="text-xs text-muted">{TYPE_DOC[t] ?? ""}</p></div>)}</div>
      </section>
      <table className="tbl">
        <thead><tr><th>Campo</th><th>Tipo</th><th>nth</th><th>Transacciones</th><th>Objetos</th><th>Internos</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className={!r.inTestnet ? "opacity-60" : ""}>
              <td><Link href={`/fields/${r.name}`} className="font-mono hover:underline">{r.name}</Link>{!r.inTestnet && <span className="badge ml-1 bg-surface-2 text-muted">solo fuente</span>}</td>
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
