import Link from "@/components/NLink";
import { devStatus, type GithubAmendment } from "@/lib/content";

const fmt = (s?: string) => (s ? new Date(s).toLocaleDateString("en-US") : "—");

/** Development status of an amendment mined from GitHub (rippled PRs/issues, XLS proposals, branches, release). */
export function DevStatus({ gh }: { gh?: GithubAmendment }) {
  if (!gh) return <section className="card text-sm text-muted">No GitHub data yet for this amendment (run <code>pnpm github</code>).</section>;
  const s = gh.summary;
  const st = devStatus(s);
  const timeline = gh.prs.flatMap((p) => [
    ...(p.comments ?? []).map((c) => ({ kind: "comment", pr: p.number, ...c })),
    ...(p.reviews ?? []).filter((r) => r.body || r.state !== "COMMENTED").map((r) => ({ kind: `review · ${r.state.toLowerCase()}`, pr: p.number, author: r.author, date: r.date ?? "", body: r.body, url: p.url })),
    ...(p.reviewCommentsList ?? []).map((c) => ({ kind: `code comment${c.path ? ` · ${c.path.split("/").pop()}` : ""}`, pr: p.number, ...c })),
  ]).filter((x) => x.date).sort((a, b) => b.date.localeCompare(a.date));
  const bugs = timeline.filter((x) => /\b(bug|regression|crash|assert|invariant|broken|fail(s|ed|ure)?|incorrect|wrong)\b/i.test(x.body)).length;
  const tests = timeline.filter((x) => /\b(test|unit test|coverage|jtx)\b/i.test(x.body)).length;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="display-md">Development status</h2>
        <span className={`badge ${st.cls}`}>{st.label}</span>
        <span className="text-xs text-muted">from GitHub · {fmt(gh.fetchedAt)}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card"><div className="text-xs text-muted">Pull requests</div><div className="datapoint mt-2" style={{ fontSize: "1.8rem" }}>{s.prs}</div><div className="text-xs text-muted">{s.merged} merged · {s.open} open</div></div>
        <div className="card"><div className="text-xs text-muted">Discussion</div><div className="datapoint mt-2" style={{ fontSize: "1.8rem" }}>{s.totalComments}</div><div className="text-xs text-muted">comments and reviews · {bugs} mention bugs · {tests} mention tests</div></div>
        <div className="card"><div className="text-xs text-muted">Issues</div><div className="datapoint mt-2" style={{ fontSize: "1.8rem" }}>{s.issues}</div><div className="text-xs text-muted">rippled issues mentioning it</div></div>
        <div className="card"><div className="text-xs text-muted">XLS proposals</div><div className="datapoint mt-2" style={{ fontSize: "1.8rem" }}>{s.proposals}</div><div className="text-xs text-muted">XRPL-Standards threads</div></div>
        <div className="card"><div className="text-xs text-muted">Shipped in</div><div className="mt-2 font-mono text-lg">{gh.release.version ?? "—"}</div><div className="text-xs text-muted">{gh.release.url ? <a className="link" href={gh.release.url} target="_blank" rel="noreferrer">{fmt(gh.release.date)}</a> : "not in a release yet"}{s.lastActivity && ` · last activity ${fmt(s.lastActivity)}`}</div></div>
      </div>
      {gh.branches.length > 0 && <p className="text-sm">Branches in XRPLF/rippled: {gh.branches.map((b) => <a key={b} className="tag mr-1" href={`https://github.com/XRPLF/rippled/tree/${b}`} target="_blank" rel="noreferrer">{b}</a>)}</p>}

      {gh.prs.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Pull requests in XRPLF/rippled</h3>
          <table className="tbl">
            <thead><tr><th>PR</th><th>State</th><th>Author</th><th>Opened</th><th>Merged</th><th>Base ← head</th><th>Size</th><th>Reviews</th><th>Comments</th></tr></thead>
            <tbody>
              {gh.prs.map((p) => (
                <tr key={p.number}>
                  <td><Link href={`/amendments/${gh.name}/pr/${p.number}`} className="link">#{p.number}</Link> <Link href={`/amendments/${gh.name}/pr/${p.number}`} className="hover:underline">{p.title}</Link> <a className="text-xs text-muted hover:underline" href={p.url} target="_blank" rel="noreferrer">GitHub ↗</a>{p.labels.length > 0 && <span className="block text-xs text-muted">{p.labels.join(", ")}</span>}</td>
                  <td><span className={`badge ${p.merged ? "bg-accent-soft text-accent-ink" : p.state === "open" ? "bg-[#dbf15e] text-black" : "bg-surface-2 text-muted"}`}>{p.merged ? "merged" : p.draft ? "draft" : p.state}</span></td>
                  <td className="text-xs">{p.author}</td>
                  <td className="text-xs">{fmt(p.createdAt)}</td>
                  <td className="text-xs">{fmt(p.mergedAt)}</td>
                  <td className="font-mono text-xs">{p.base} ← {p.head?.split(":").pop()}</td>
                  <td className="text-xs">{p.additions !== undefined ? `+${p.additions} −${p.deletions} · ${p.changedFiles} files · ${p.commits} commits` : ""}</td>
                  <td className="text-xs">{(p.reviews ?? []).filter((r) => r.state === "APPROVED").length} approved · {(p.reviews ?? []).filter((r) => r.state === "CHANGES_REQUESTED").length} changes</td>
                  <td className="text-xs">{(p.comments?.length ?? 0) + (p.reviewCommentsList?.length ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(gh.issues.length > 0 || gh.proposals.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {gh.issues.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">Issues</h3><ul className="space-y-1 text-sm">{gh.issues.map((i) => <li key={i.number}><a className="link" href={i.url} target="_blank" rel="noreferrer">#{i.number}</a> {i.title} <span className="text-xs text-muted">{i.state} · {fmt(i.createdAt)} · {i.comments} comments</span></li>)}</ul></div>}
          {gh.proposals.length > 0 && <div className="card"><h3 className="mb-2 font-semibold">XLS proposals and discussions</h3><ul className="space-y-1 text-sm">{gh.proposals.map((i) => <li key={i.number}><a className="link" href={i.url} target="_blank" rel="noreferrer">{i.isPr ? "PR" : "issue"} #{i.number}</a> {i.title} <span className="text-xs text-muted">{i.state} · {fmt(i.updatedAt)} · {i.comments} comments</span></li>)}</ul></div>}
        </div>
      )}

      {timeline.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-semibold text-fg">Developer discussion across all PRs ({timeline.length} entries, newest first; open a PR above for the full thread)</summary>
          <ul className="mt-3 space-y-3">
            {timeline.map((x, i) => (
              <li key={i} className="border-b border-border pb-3 text-sm">
                <div className="flex flex-wrap gap-2 text-xs text-muted"><span className="font-medium text-fg">{x.author}</span><span>{new Date(x.date).toLocaleString("en-US")}</span><span>{x.kind}</span><Link className="link" href={`/amendments/${gh.name}/pr/${x.pr}`}>PR #{x.pr}</Link></div>
                <p className="mt-1 whitespace-pre-wrap">{x.body || <span className="text-muted">(no text)</span>}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
