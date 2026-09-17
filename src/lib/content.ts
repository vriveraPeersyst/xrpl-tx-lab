import "server-only";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "content");

export interface Doc<T = Record<string, string>> {
  name: string;
  data: T & { title?: string; summary?: string; draft?: boolean | string };
  body: string;
}

export function readDoc<T = Record<string, string>>(kind: "tx" | "objects" | "amendments", name: string): Doc<T> | undefined {
  const file = path.join(ROOT, kind, `${name}.md`);
  if (!fs.existsSync(file)) return undefined;
  const { data, content } = parseFrontmatter(fs.readFileSync(file, "utf8"));
  return { name, data: data as Doc<T>["data"], body: content.trim() };
}

/** Lenient frontmatter: one `key: value` per line, not strict YAML (summaries contain colons). */
export function parseFrontmatter(txt: string): { data: Record<string, string | boolean>; content: string } {
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, content: txt };
  const data: Record<string, string | boolean> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!mm) continue;
    let v: string | boolean = mm[2].trim().replace(/^["'](.*)["']$/, "$1");
    if (v === "true") v = true;
    else if (v === "false") v = false;
    data[mm[1]] = v;
  }
  return { data, content: txt.slice(m[0].length) };
}

export function listDocs(kind: "tx" | "objects" | "amendments"): string[] {
  const dir = path.join(ROOT, kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")).sort();
}

export function readResultDocs(): Record<string, string> {
  const file = path.join(ROOT, "results.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

export function readFlagDocs(): Record<string, string> {
  const file = path.join(ROOT, "flags.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

export function flagDoc(scope: string, flag: string): string | undefined {
  const docs = readFlagDocs();
  return docs[`${scope}.${flag}`] ?? docs[flag];
}

export function readCoverage(): { ok: boolean; errors: string[]; warnings: string[]; report: Record<string, string[]>; networks?: Record<string, { version: string }> } | undefined {
  const file = path.join(process.cwd(), "src/data/coverage.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
}

export function readSyncLog(): { at: string; testnet?: string; networks?: Record<string, { version: string; ledger?: number; sourceRef?: string }>; changes: string[]; generated: string[]; coverageOk: boolean; errors: string[]; warnings: string[] }[] {
  const file = path.join(process.cwd(), "src/data/sync-log.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}

export interface GithubComment { author?: string; date: string; body: string; url?: string; path?: string }
export interface GithubPr { number: number; title: string; url: string; state: string; author?: string; createdAt: string; updatedAt: string; closedAt?: string; labels: string[]; body: string; merged?: boolean; mergedAt?: string; draft?: boolean; base?: string; head?: string; additions?: number; deletions?: number; changedFiles?: number; commits?: number; comments?: GithubComment[]; reviews?: { author?: string; state: string; date?: string; body: string }[]; reviewCommentsList?: GithubComment[] }
export interface GithubSummary { status: string; prs: number; open: number; merged: number; issues: number; proposals: number; branches: string[]; lastActivity?: string; lastMerged?: string; release?: string; totalComments: number }
export interface GithubIssue { number: number; title: string; url: string; state: string; author?: string; createdAt: string; updatedAt: string; closedAt?: string; labels: string[]; comments: number; body: string }
export interface GithubAmendment { name: string; fetchedAt: string; summary: GithubSummary; release: { version?: string; date?: string; url?: string; excerpt?: string }; prs: GithubPr[]; issues: GithubIssue[]; proposals: { number: number; title: string; url: string; state: string; isPr: boolean; author?: string; createdAt: string; updatedAt: string; comments: number; labels: string[] }[]; branches: string[] }

export function readGithub(name: string): GithubAmendment | undefined {
  const file = path.join(process.cwd(), "src/data/github", `${name}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
}
export function readGithubIndex(): { fetchedAt: string; amendments: Record<string, GithubSummary> } | undefined {
  const file = path.join(process.cwd(), "src/data/github/index.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
}

export interface LibraryNet { txSupported: number; txTotal: number; missingTx: string[]; leSupported: number; leTotal: number; missingLe: string[]; fieldsSupported: number; fieldsTotal: number; missingFields: string[]; resultsSupported: number; resultsTotal: number; missingResults: string[]; supportedAmendments: string[]; unsupportedAmendments: { name: string; missing: string[] }[]; definitionsMatch?: boolean }
export interface Library { id: string; name: string; language: string; repo: string; definitions: string; definitionsUrl: string; docs?: string; official: boolean; registry: { kind: string; id: string }; txTypes: string[]; extraTx: string[]; counts: { tx: number; le: number; fields: number; results: number }; version: { version?: string; date?: string; url?: string }; repoInfo?: { stars: number; openIssues: number; pushedAt: string; license?: string; description?: string; defaultBranch: string; archived: boolean }; lastCommit?: { sha: string; date: string; message: string }; perNetwork: Record<string, LibraryNet>; released?: { tag: string; version?: string; date?: string; txTypes: string[]; extraTx: string[]; counts: { tx: number; le: number; fields: number; results: number }; perNetwork: Record<string, LibraryNet> } }
export function readLibraries(): { fetchedAt: string; libraries: Library[] } | undefined {
  const file = path.join(process.cwd(), "src/data/libraries.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
}

/** Human status derived from the GitHub summary (open follow-up PRs on a merged amendment are not "in development"). */
export function devStatus(s?: GithubSummary): { label: string; cls: string } {
  if (!s) return { label: "no data", cls: "bg-surface-2 text-muted" };
  if (s.merged > 0 && s.open > 0) return { label: "merged · follow-ups open", cls: "bg-accent-soft text-accent-ink" };
  if (s.merged > 0) return { label: "merged", cls: "bg-accent-soft text-accent-ink" };
  if (s.open > 0) return { label: "in development", cls: "bg-[#dbf15e] text-black" };
  if (s.prs > 0) return { label: "closed without merge", cls: "bg-[#fdece7] text-[#a22514]" };
  if (s.proposals > 0) return { label: "proposal only", cls: "bg-[#edf4ff] text-[#0a4dc0]" };
  return { label: "no GitHub trail found", cls: "bg-surface-2 text-muted" };
}
