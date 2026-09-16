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

export function readFlagDocs(): Record<string, string> {
  const file = path.join(ROOT, "flags.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

export function flagDoc(scope: string, flag: string): string | undefined {
  const docs = readFlagDocs();
  return docs[`${scope}.${flag}`] ?? docs[flag];
}

export function readCoverage(): { ok: boolean; errors: string[]; warnings: string[]; report: Record<string, string[]>; testnet: { version: string; ledger: number; fetchedAt: string } } | undefined {
  const file = path.join(process.cwd(), "src/data/coverage.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
}

export function readSyncLog(): { at: string; testnet: string; changes: string[]; generated: string[]; coverageOk: boolean; errors: string[]; warnings: string[] }[] {
  const file = path.join(process.cwd(), "src/data/sync-log.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
}
