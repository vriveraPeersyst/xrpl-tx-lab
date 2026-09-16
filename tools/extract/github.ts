/**
 * Development status of every amendment, mined from GitHub with `gh`:
 *   - pull requests and issues in XRPLF/rippled whose title mentions the amendment
 *     (state, merge date, base/head branch, labels, reviews, comments with author/date/excerpt)
 *   - proposals/discussions in XRPLF/XRPL-Standards (XLS) mentioning it
 *   - rippled branches whose name matches (feature/devnet branches)
 *   - the rippled release notes entry that mentions it
 * Writes src/data/github/<Amendment>.json and src/data/github/index.json.
 *
 * Usage: pnpm github [--only Name] [--max-age-hours 20] [--refetch] [--excerpt 8000]
 * Respects rate limits (search: 30/min; core: 5000/h). Re-uses cached PR data when a PR's
 * updated_at has not changed.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "src/data/github");
fs.mkdirSync(OUT, { recursive: true });
const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const only = arg("--only");
const maxAgeH = Number(arg("--max-age-hours") ?? 20);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EXCERPT = Number(arg("--excerpt") ?? 8000);
const refetch = process.argv.includes("--refetch");

function gh(p: string): any {
  try { return JSON.parse(execSync(`gh api --paginate=false ${JSON.stringify(p)}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 50 * 1024 * 1024 })); }
  catch (e) { const msg = String((e as any).stderr ?? e); if (/rate limit/i.test(msg)) throw new Error("RATE_LIMIT"); return undefined; }
}
async function search(q: string, perPage = 12) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = gh(`search/issues?q=${encodeURIComponent(q)}&per_page=${perPage}&sort=updated`); await sleep(2200); return r?.items ?? []; }
    catch { console.log("  search rate limit, waiting 65s"); await sleep(65_000); }
  }
  return [];
}
const excerpt = (s?: string) => (s ?? "").replace(/\r/g, "").replace(/<!--[\s\S]*?-->/g, "").trim().slice(0, EXCERPT);

// Amendment universe: every network snapshot + every non-retired source feature.
const names = new Set<string>();
const netDir = path.join(ROOT, "src/data/networks");
for (const n of fs.readdirSync(netDir)) { const f = path.join(netDir, n, "snapshot.json"); if (fs.existsSync(f)) for (const a of JSON.parse(fs.readFileSync(f, "utf8")).amendments) names.add(a.name); }
for (const f of fs.readdirSync(path.join(ROOT, "src/data/protocol"))) for (const x of JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/protocol", f), "utf8")).features) if (!x.retired) names.add(x.name);
const list = [...names].filter((n) => !only || n === only).sort();

// Branches of rippled (once).
const branches: string[] = [];
for (let page = 1; page <= 10; page++) { const b = gh(`repos/XRPLF/rippled/branches?per_page=100&page=${page}`); if (!b?.length) break; branches.push(...b.map((x: any) => x.name)); if (b.length < 100) break; }
// rippled GitHub releases (once): the oldest release whose notes mention the amendment is where it shipped.
const releases: { tag: string; date: string; body: string; url: string; prerelease: boolean }[] = [];
for (let page = 1; page <= 3; page++) { const r = gh(`repos/XRPLF/rippled/releases?per_page=100&page=${page}`); if (!r?.length) break; releases.push(...r.map((x: any) => ({ tag: x.tag_name, date: x.published_at, body: x.body ?? "", url: x.html_url, prerelease: !!x.prerelease }))); if (r.length < 100) break; }
releases.sort((a, b) => a.date.localeCompare(b.date));

function releaseFor(name: string): { version?: string; date?: string; url?: string; excerpt?: string } {
  const re = new RegExp(`\\b${name}\\b`);
  const rel = releases.find((r) => !r.prerelease && re.test(r.body)) ?? releases.find((r) => re.test(r.body));
  if (!rel) return {};
  const idx = rel.body.search(re);
  const line = rel.body.slice(rel.body.lastIndexOf("\n", idx) + 1, rel.body.indexOf("\n", idx) < 0 ? undefined : rel.body.indexOf("\n", idx));
  return { version: rel.tag, date: rel.date, url: rel.url, excerpt: line.replace(/^[-*\s]+/, "").trim().slice(0, 300) };
}

const index: Record<string, any> = {};
let processed = 0;
for (const name of list) {
  const file = path.join(OUT, `${name}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  if (prev && !only && !refetch && Date.now() - new Date(prev.fetchedAt).getTime() < maxAgeH * 3600_000) { index[name] = prev.summary; continue; }
  const bare = name.replace(/^fix/, "").replace(/V\d+_\d+$/, "");
  const q = `repo:XRPLF/rippled "${name}" in:title`;
  const items = await search(q);
  const extra = bare !== name && bare.length > 3 ? await search(`repo:XRPLF/rippled "${bare}" in:title`, 8) : [];
  const seen = new Set<number>();
  const prs: any[] = [];
  const issues: any[] = [];
  for (const it of [...items, ...extra]) {
    if (seen.has(it.number)) continue;
    seen.add(it.number);
    const base = { number: it.number, title: it.title, url: it.html_url, state: it.state, author: it.user?.login, createdAt: it.created_at, updatedAt: it.updated_at, closedAt: it.closed_at, labels: (it.labels ?? []).map((l: any) => l.name), comments: it.comments, body: excerpt(it.body) };
    if (!it.pull_request) { issues.push(base); continue; }
    const cached = refetch ? undefined : prev?.prs?.find((p: any) => p.number === it.number && p.updatedAt === it.updated_at);
    if (cached) { prs.push(cached); continue; }
    const pr = gh(`repos/XRPLF/rippled/pulls/${it.number}`);
    const comments = (gh(`repos/XRPLF/rippled/issues/${it.number}/comments?per_page=100`) ?? []).map((c: any) => ({ author: c.user?.login, date: c.created_at, body: excerpt(c.body), url: c.html_url }));
    const reviews = (gh(`repos/XRPLF/rippled/pulls/${it.number}/reviews?per_page=100`) ?? []).map((r: any) => ({ author: r.user?.login, state: r.state, date: r.submitted_at, body: excerpt(r.body) }));
    const reviewComments = pr?.review_comments > 0 ? (gh(`repos/XRPLF/rippled/pulls/${it.number}/comments?per_page=100`) ?? []).map((c: any) => ({ author: c.user?.login, date: c.created_at, path: c.path, body: excerpt(c.body), url: c.html_url })) : [];
    prs.push({ ...base, merged: !!pr?.merged_at, mergedAt: pr?.merged_at, draft: pr?.draft, base: pr?.base?.ref, head: pr?.head?.label, additions: pr?.additions, deletions: pr?.deletions, changedFiles: pr?.changed_files, commits: pr?.commits, reviewComments: pr?.review_comments, comments, reviews, reviewCommentsList: reviewComments });
  }
  const xls = (await search(`repo:XRPLF/XRPL-Standards "${bare}" in:title`, 10)).filter((it: any) => !/\[bot\]$/.test(it.user?.login ?? ""));
  const proposals = xls.map((it: any) => ({ number: it.number, title: it.title, url: it.html_url, state: it.state, isPr: !!it.pull_request, author: it.user?.login, createdAt: it.created_at, updatedAt: it.updated_at, comments: it.comments, labels: (it.labels ?? []).map((l: any) => l.name) }));
  const matchBranches = branches.filter((b) => b.toLowerCase().includes(bare.toLowerCase().replace(/_/g, "")) || b.toLowerCase().includes(name.toLowerCase()));
  const merged = prs.filter((p) => p.merged).sort((a, b) => (b.mergedAt ?? "").localeCompare(a.mergedAt ?? ""));
  const open = prs.filter((p) => p.state === "open");
  const lastActivity = [...prs, ...issues, ...proposals].map((x) => x.updatedAt).sort().pop();
  const status = open.length ? "in development" : merged.length ? "merged" : prs.length ? "closed without merge" : proposals.length ? "proposal only" : "no GitHub trail found";
  const summary = { status, prs: prs.length, open: open.length, merged: merged.length, issues: issues.length, proposals: proposals.length, branches: matchBranches, lastActivity, lastMerged: merged[0]?.mergedAt, release: releaseFor(name).version, totalComments: prs.reduce((s, p) => s + (p.comments?.length ?? 0) + (p.reviews?.length ?? 0) + (p.reviewCommentsList?.length ?? 0), 0) };
  const data = { name, fetchedAt: new Date().toISOString(), summary, release: releaseFor(name), prs: prs.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "")), issues, proposals, branches: matchBranches };
  fs.writeFileSync(file, JSON.stringify(data, null, 1));
  index[name] = summary;
  processed++;
  console.log(`${name}: ${status} · ${prs.length} PRs (${merged.length} merged, ${open.length} open) · ${issues.length} issues · ${proposals.length} XLS · ${summary.totalComments} comments${matchBranches.length ? " · branches " + matchBranches.join(",") : ""}`);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), amendments: index }, null, 1));
console.log(`github/index.json: ${Object.keys(index).length} amendments (${processed} refreshed)`);
