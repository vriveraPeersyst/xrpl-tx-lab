import Link from "next/link";
import { protocol, testnet } from "@/lib/protocol";
import { AmendmentBadge } from "@/components/protocol";

export const metadata = { title: "Permisos y delegación" };

export default function PermissionsPage() {
  const delegable = protocol.transactions.filter((t) => t.delegable && t.name in testnet.definitions.TRANSACTION_TYPES);
  const notDelegable = protocol.transactions.filter((t) => !t.delegable && !t.pseudo && t.name in testnet.definitions.TRANSACTION_TYPES);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Permisos y delegación</h1>
        <p className="text-muted">Con <Link href="/tx/DelegateSet" className="link">DelegateSet</Link> una cuenta autoriza a otra a enviar ciertos tipos de transacción en su nombre (campo <code>Delegate</code>), o permisos granulares que solo permiten parte de un tipo. Requiere <AmendmentBadge name="PermissionDelegationV1_1" />.</p>
      </div>
      <section>
        <h2 className="mb-2 display-md">Permisos granulares ({protocol.permissions.length})</h2>
        <table className="tbl">
          <thead><tr><th>Permiso</th><th>Valor</th><th>Transacción</th><th>Flags permitidos</th><th>Campos permitidos</th><th>Descripción</th></tr></thead>
          <tbody>{protocol.permissions.map((p) => { const tx = protocol.transactions.find((t) => t.tag === p.txType); return <tr key={p.name}><td className="font-mono">{p.name}</td><td className="font-mono text-xs">{p.value}</td><td>{tx && <Link href={`/tx/${tx.name}`} className="font-mono hover:underline">{tx.name}</Link>}</td><td className="font-mono text-xs">{p.allowedFlags.join(" | ")}</td><td className="font-mono text-xs">{p.allowedFields.map((f) => f.name).join(", ")}</td><td className="text-muted">{p.doc}</td></tr>; })}</tbody>
        </table>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2 className="mb-2 display-md">Tipos delegables ({delegable.length})</h2><div className="flex flex-wrap gap-1">{delegable.map((t) => <Link key={t.name} href={`/tx/${t.name}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft">{t.name}</Link>)}</div><p className="mt-2 text-xs text-muted">El valor de <code>PermissionValue</code> para un tipo completo es su código numérico + 1.</p></div>
        <div><h2 className="mb-2 display-md">No delegables ({notDelegable.length})</h2><div className="flex flex-wrap gap-1">{notDelegable.map((t) => <Link key={t.name} href={`/tx/${t.name}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft">{t.name}</Link>)}</div><p className="mt-2 text-xs text-muted">Operaciones sobre claves, firmantes, borrado de cuenta y las que el código marca como no delegables por seguridad.</p></div>
      </section>
    </div>
  );
}
