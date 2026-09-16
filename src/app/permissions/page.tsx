import Link from "next/link";
import { protocol, testnet } from "@/lib/protocol";
import { AmendmentBadge } from "@/components/protocol";

export const metadata = { title: "Permissions and delegation" };

export default function PermissionsPage() {
  const delegable = protocol.transactions.filter((t) => t.delegable && t.name in testnet.definitions.TRANSACTION_TYPES);
  const notDelegable = protocol.transactions.filter((t) => !t.delegable && !t.pseudo && t.name in testnet.definitions.TRANSACTION_TYPES);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Permissions and delegation</h1>
        <p className="text-muted">With <Link href="/tx/DelegateSet" className="link">DelegateSet</Link> an account authorizes another to send certain transaction types on its behalf (the <code>Delegate</code> field), or granular permissions that only allow part of a type. Requires <AmendmentBadge name="PermissionDelegationV1_1" />.</p>
      </div>
      <section>
        <h2 className="mb-2 display-md">Granular permissions ({protocol.permissions.length})</h2>
        <table className="tbl">
          <thead><tr><th>Permission</th><th>Value</th><th>Transaction</th><th>Allowed flags</th><th>Allowed fields</th><th>Description</th></tr></thead>
          <tbody>{protocol.permissions.map((p) => { const tx = protocol.transactions.find((t) => t.tag === p.txType); return <tr key={p.name}><td className="font-mono">{p.name}</td><td className="font-mono text-xs">{p.value}</td><td>{tx && <Link href={`/tx/${tx.name}`} className="font-mono hover:underline">{tx.name}</Link>}</td><td className="font-mono text-xs">{p.allowedFlags.join(" | ")}</td><td className="font-mono text-xs">{p.allowedFields.map((f) => f.name).join(", ")}</td><td className="text-muted">{p.doc}</td></tr>; })}</tbody>
        </table>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2 className="mb-2 display-md">Delegable types ({delegable.length})</h2><div className="flex flex-wrap gap-1">{delegable.map((t) => <Link key={t.name} href={`/tx/${t.name}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft">{t.name}</Link>)}</div><p className="mt-2 text-xs text-muted">The <code>PermissionValue</code> for a full type is its numeric code + 1.</p></div>
        <div><h2 className="mb-2 display-md">Not delegable ({notDelegable.length})</h2><div className="flex flex-wrap gap-1">{notDelegable.map((t) => <Link key={t.name} href={`/tx/${t.name}`} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs hover:bg-accent-soft">{t.name}</Link>)}</div><p className="mt-2 text-xs text-muted">Operations on keys, signers, account deletion, and those the code marks as not delegable for security reasons.</p></div>
      </section>
    </div>
  );
}
