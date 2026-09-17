import Link from "@/components/NLink";
import { getNet, availableNetworkIds } from "@/lib/protocol";
import { NETWORKS } from "@/lib/networks";
import { readLibraries } from "@/lib/content";
import { AmendmentBadge } from "@/components/protocol";

export const metadata = { title: "Client libraries" };

export default async function LibrariesPage({ params }: { params: Promise<{ net: string }> }) {
  const { net } = await params;
  const d = getNet(net);
  const data = readLibraries();
  const available = availableNetworkIds();
  if (!data) return <div className="card text-sm text-muted">No library data yet. Run <code>pnpm libraries</code>.</div>;
  const libs = data.libraries;
  return (
    <div className="space-y-10">
      <div>
        <h1 className="display-lg">Client libraries</h1>
        <p className="max-w-3xl text-muted">What each XRPL library can encode, measured objectively: its bundled <code>definitions.json</code> (transaction types, ledger entries, fields, result codes) compared with the <code>server_definitions</code> of every network. An amendment counts as supported by a library when the library can encode every transaction type that amendment introduces. Fetched {new Date(data.fetchedAt).toLocaleString("en-US")}.</p>
      </div>

      <section>
        <h2 className="mb-3 display-md">Versions and activity</h2>
        <table className="tbl">
          <thead><tr><th>Library</th><th>Language</th><th>Latest release</th><th>Last commit</th><th>Stars</th><th>Open issues</th><th>Encodes</th><th>Links</th></tr></thead>
          <tbody>
            {libs.map((l) => (
              <tr key={l.id}>
                <td><b>{l.name}</b>{l.official ? <span className="badge ml-1 bg-accent-soft text-accent-ink">official</span> : <span className="badge ml-1 bg-surface-2 text-muted">community</span>}{l.repoInfo?.archived && <span className="badge ml-1 bg-[#fdece7] text-[#a22514]">archived</span>}</td>
                <td>{l.language}</td>
                <td className="font-mono">{l.released?.version ?? l.version.version ?? "—"} <span className="text-xs text-muted">{l.released?.date ?? l.version.date ?? ""}</span>{l.released && l.version.version && l.version.version !== l.released.version && <span className="block text-xs text-muted">registry: {l.version.version}</span>}</td>
                <td className="text-xs text-muted">{l.lastCommit ? `${l.lastCommit.date.slice(0, 10)} · ${l.lastCommit.message.slice(0, 50)}` : "—"}</td>
                <td>{l.repoInfo?.stars ?? "—"}</td>
                <td>{l.repoInfo?.openIssues ?? "—"}</td>
                <td className="text-xs">{l.counts.tx} tx · {l.counts.le} objects · {l.counts.fields} fields · {l.counts.results} TER</td>
                <td className="text-xs"><a className="link mr-2" href={`https://github.com/${l.repo}`} target="_blank" rel="noreferrer">repo</a>{l.version.url && <a className="link mr-2" href={l.version.url} target="_blank" rel="noreferrer">package</a>}{l.docs && <a className="link mr-2" href={l.docs} target="_blank" rel="noreferrer">docs</a>}<a className="link" href={l.definitionsUrl} target="_blank" rel="noreferrer">definitions</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 display-md">Coverage per network</h2>
        <p className="mb-2 text-sm text-muted">Transaction types each library can encode out of the types that exist on each network, for the <b>latest release</b> (what you get by installing the package) and for the <b>main branch</b> (what is merged but not yet released). Bold = the network you are browsing.</p>
        <table className="tbl">
          <thead><tr><th>Library</th>{NETWORKS.filter((n) => available.includes(n.id)).map((n) => <th key={n.id} className={n.id === net ? "text-fg" : ""}>{n.label}<span className="block font-normal">xrpld {getNet(n.id).snapshot.buildVersion}</span></th>)}</tr></thead>
          <tbody>
            {libs.map((l) => (
              <tr key={l.id}>
                <td><b>{l.name}</b> <span className="text-xs text-muted">{l.released?.version ?? l.version.version}</span></td>
                {NETWORKS.filter((n) => available.includes(n.id)).map((n) => {
                  const p = l.perNetwork[n.id];
                  const r = l.released?.perNetwork[n.id];
                  if (!p) return <td key={n.id}>—</td>;
                  const cell = (label: string, x: typeof p) => { const full = x.missingTx.length === 0; return <div className="mb-1"><span className="mr-1 text-xs text-muted">{label}</span><span className={`badge ${full ? "bg-accent-soft text-accent-ink" : "bg-[#dbf15e] text-black"}`}>{x.txSupported}/{x.txTotal} tx</span><span className="block text-xs text-muted">{x.leSupported}/{x.leTotal} objects · {x.fieldsSupported}/{x.fieldsTotal} fields · {x.resultsSupported}/{x.resultsTotal} TER</span>{x.missingTx.length > 0 && <span className="block text-xs text-[#a22514]">missing: {x.missingTx.join(", ")}</span>}</div>; };
                  return <td key={n.id} className={n.id === net ? "font-medium" : ""}>{r && cell(`release ${l.released?.version ?? ""}`, r)}{cell("main", p)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 display-md">Amendment support on {d.network.label}</h2>
        <p className="mb-2 text-sm text-muted">Amendments that introduce transaction types, and whether each library&apos;s <b>latest release</b> can build them (&quot;main only&quot; = merged on the main branch, not released yet). Amendments that only change behaviour (fixes, rules) do not need library changes and are omitted.</p>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Amendment</th><th>On {d.network.label}</th>{libs.map((l) => <th key={l.id}>{l.name}</th>)}</tr></thead>
            <tbody>
              {gatedAmendments(d).map((a) => (
                <tr key={a}>
                  <td><Link href={`/amendments/${a}`} className="font-mono hover:underline">{a}</Link></td>
                  <td><AmendmentBadge d={d} name={a} showName={false} /></td>
                  {libs.map((l) => { const p = (l.released?.perNetwork ?? l.perNetwork)[net]; const m = l.perNetwork[net]; const ok = p?.supportedAmendments.includes(a); const un = p?.unsupportedAmendments.find((u) => u.name === a); const okMain = m?.supportedAmendments.includes(a); return <td key={l.id}>{ok ? <span className="badge bg-accent-soft text-accent-ink">yes</span> : un ? <span className="badge bg-[#fdece7] text-[#a22514]" title={`release missing: ${un.missing.join(", ")}`}>{okMain ? "main only" : "no"}</span> : <span className="text-xs text-muted">—</span>}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 display-md">Main differences</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {libs.map((l) => {
            const p = (l.released?.perNetwork ?? l.perNetwork)[net];
            const m = l.perNetwork[net];
            const behind = libs.filter((o) => o.id !== l.id && ((o.released?.perNetwork ?? o.perNetwork)[net]?.txSupported ?? 0) > (p?.txSupported ?? 0)).map((o) => o.name);
            const pendingRelease = m && p && m.txSupported > p.txSupported ? m.missingTx.length === 0 ? `main already covers all ${m.txTotal} types (${p.missingTx.join(", ")} merged, pending a release)` : `main adds ${m.txSupported - p.txSupported} types pending a release` : undefined;
            return (
              <div key={l.id} className="card">
                <div className="flex items-baseline justify-between"><h3 className="display-md">{l.name}</h3><span className="font-mono text-xs text-muted">{l.released?.version ?? l.version.version}</span></div>
                <p className="mt-1 text-sm text-muted">{l.repoInfo?.description ?? ""}</p>
                <ul className="mt-3 space-y-1 text-sm">
                  <li>Latest release {l.released?.version ?? l.version.version} encodes <b>{p?.txSupported}/{p?.txTotal}</b> transaction types on {d.network.label}{p && p.missingTx.length > 0 ? <>: cannot build <span className="font-mono text-xs">{p.missingTx.join(", ")}</span>.</> : "."}{pendingRelease && <span className="block text-accent-ink">{pendingRelease}.</span>}</li>
                  <li>{p && p.missingFields.length > 0 ? <>Unknown fields: <span className="font-mono text-xs">{p.missingFields.slice(0, 12).join(", ")}{p.missingFields.length > 12 ? ` +${p.missingFields.length - 12}` : ""}</span> (transactions using them cannot be serialized).</> : "Knows every field of the network."}</li>
                  <li>{p && p.missingResults.length > 0 ? <>Does not recognise result codes <span className="font-mono text-xs">{p.missingResults.join(", ")}</span> (they still arrive as strings from the node).</> : "Knows every result code of the network."}</li>
                  {l.extraTx.length > 0 && <li>Defines types no network has yet: <span className="font-mono text-xs">{l.extraTx.join(", ")}</span>.</li>}
                  <li>{behind.length ? <>Behind {behind.join(", ")} in type coverage.</> : "Up to date with the most complete libraries."}{l.lastCommit && ` Last commit ${l.lastCommit.date.slice(0, 10)}.`}</li>
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function gatedAmendments(d: ReturnType<typeof getNet>): string[] {
  const set = new Set<string>();
  for (const t of d.protocol.transactions) if (t.amendment && d.hasTx(t.name)) set.add(t.amendment);
  return [...set].sort();
}
