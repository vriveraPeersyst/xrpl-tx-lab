import Link from "@/components/NLink";
import { notFound } from "next/navigation";
import fs from "node:fs";
import path from "node:path";
import { ArrowUpRight } from "lucide-react";
import { availableNetworkIds } from "@/lib/protocol";
import { readGithub } from "@/lib/content";
import { Markdown } from "@/components/Markdown";

export function generateStaticParams() {
  const dir = path.join(process.cwd(), "src/data/github");
  if (!fs.existsSync(dir)) return [];
  const out: { net: string; name: string; number: string }[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (f === "index.json" || !f.endsWith(".json")) continue;
    const name = f.replace(/\.json$/, "");
    const gh = readGithub(name);
    for (const net of availableNetworkIds()) for (const p of gh?.prs ?? []) out.push({ net, name, number: String(p.number) });
  }
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ name: string; number: string }> }) {
  const { name, number } = await params;
  const pr = readGithub(name)?.prs.find((p) => String(p.number) === number);
  return { title: pr ? `PR #${pr.number} · ${pr.title}` : `PR #${number}` };
}

const fmt = (s?: string) => (s ? new Date(s).toLocaleString("en-US") : "—");

type Entry = { kind: "description" | "comment" | "review" | "code"; author?: string; date: string; body: string; url?: string; path?: string; state?: string };

export default async function PrPage({ params }: { params: Promise<{ net: string; name: string; number: string }> }) {
  const { name, number } = await params;
  const gh = readGithub(name);
  const pr = gh?.prs.find((p) => String(p.number) === number);
  if (!gh || !pr) notFound();
  const entries: Entry[] = ([
    { kind: "description", author: pr.author, date: pr.createdAt, body: pr.body, url: pr.url },
    ...(pr.comments ?? []).map((c) => ({ kind: "comment", ...c })),
    ...(pr.reviews ?? []).map((r) => ({ kind: "review", author: r.author, date: r.date ?? pr.createdAt, body: r.body, state: r.state, url: pr.url })),
    ...(pr.reviewCommentsList ?? []).map((c) => ({ kind: "code", ...c })),
  ] as Entry[]).sort((a, b) => a.date.localeCompare(b.date));
  const byFile = groupBy((pr.reviewCommentsList ?? []).filter((c) => c.path), (c) => c.path ?? "");
  const approvals = (pr.reviews ?? []).filter((r) => r.state === "APPROVED");
  const changes = (pr.reviews ?? []).filter((r) => r.state === "CHANGES_REQUESTED");
  const participants = [...new Set(entries.map((e) => e.author).filter(Boolean))];
  const others = gh.prs.filter((p) => p.number !== pr.number);
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="text-xs text-muted"><Link href="/amendments" className="hover:underline">Amendments</Link> / <Link href={`/amendments/${name}`} className="font-mono hover:underline">{name}</Link> / PR #{pr.number}</div>
        <h1 className="display-lg">{pr.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${pr.merged ? "bg-accent-soft text-accent-ink" : pr.state === "open" ? "bg-[#dbf15e] text-black" : "bg-surface-2 text-muted"}`}>{pr.merged ? "merged" : pr.draft ? "draft" : pr.state}</span>
          <span className="badge bg-surface-2 text-muted">by {pr.author}</span>
          <span className="badge bg-surface-2 text-muted">opened {fmt(pr.createdAt)}</span>
          {pr.mergedAt && <span className="badge bg-surface-2 text-muted">merged {fmt(pr.mergedAt)}</span>}
          {!pr.mergedAt && pr.closedAt && <span className="badge bg-surface-2 text-muted">closed {fmt(pr.closedAt)}</span>}
          {pr.labels.map((l) => <span key={l} className="badge bg-[#f2edff] text-[#5429a1]">{l}</span>)}
          <a className="link inline-flex items-center gap-1" href={pr.url} target="_blank" rel="noreferrer">Open on GitHub <ArrowUpRight size={12} /></a>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Branches" value={<span className="font-mono text-sm">{pr.base} ← {pr.head?.split(":").pop()}</span>} />
        <Stat label="Size" value={pr.additions !== undefined ? `+${pr.additions} −${pr.deletions}` : "—"} sub={pr.changedFiles !== undefined ? `${pr.changedFiles} files · ${pr.commits} commits` : undefined} />
        <Stat label="Reviews" value={`${approvals.length} / ${changes.length}`} sub="approved / changes requested" />
        <Stat label="Discussion" value={entries.length - 1} sub={`${pr.comments?.length ?? 0} comments · ${pr.reviews?.length ?? 0} reviews · ${pr.reviewCommentsList?.length ?? 0} code comments`} />
        <Stat label="Participants" value={participants.length} sub={participants.slice(0, 6).join(", ") + (participants.length > 6 ? "…" : "")} />
      </section>

      {Object.keys(byFile).length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Code review by file</h2>
          <ul className="space-y-1 text-sm">{Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).map(([file, cs]) => <li key={file}><a className="font-mono hover:underline" href={`#file-${slug(file)}`}>{file}</a> <span className="text-xs text-muted">{cs.length} comments</span></li>)}</ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="display-md">Discussion ({entries.length} entries, chronological)</h2>
        {entries.map((e, i) => (
          <article key={i} id={e.kind === "code" && e.path ? `file-${slug(e.path)}` : undefined} className={`border-l-2 pl-4 ${e.kind === "description" ? "border-fg" : e.kind === "review" ? (e.state === "APPROVED" ? "border-accent" : e.state === "CHANGES_REQUESTED" ? "border-[#da4518]" : "border-border") : e.kind === "code" ? "border-[#7649e3]" : "border-border"}`}>
            <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted">
              <span className="font-medium text-fg">{e.author ?? "unknown"}</span>
              <span>{fmt(e.date)}</span>
              <span className="badge bg-surface-2">{e.kind === "description" ? "PR description" : e.kind === "review" ? `review · ${e.state?.toLowerCase().replace("_", " ")}` : e.kind === "code" ? "code comment" : "comment"}</span>
              {e.path && <span className="font-mono">{e.path}</span>}
              {e.url && <a className="link" href={e.url} target="_blank" rel="noreferrer">↗</a>}
            </div>
            <div className="mt-1 text-sm">{e.body ? <Markdown>{e.body}</Markdown> : <span className="text-muted">(no text)</span>}</div>
          </article>
        ))}
      </section>

      {others.length > 0 && (
        <section>
          <h2 className="mb-2 display-md">Other pull requests for {name}</h2>
          <ul className="space-y-1 text-sm">{others.map((p) => <li key={p.number}><Link href={`/amendments/${name}/pr/${p.number}`} className="link">#{p.number}</Link> {p.title} <span className="text-xs text-muted">{p.merged ? "merged" : p.state} · {fmt(p.updatedAt)}</span></li>)}</ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return <div className="card"><div className="text-xs text-muted">{label}</div><div className="mt-2 text-lg font-medium">{value}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</div>;
}
function groupBy<T>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, x) => { (acc[key(x)] ??= []).push(x); return acc; }, {});
}
function slug(s: string) { return s.replace(/[^\w]+/g, "-"); }

