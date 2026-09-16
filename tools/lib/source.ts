/**
 * Resolves a rippled source checkout for a given build version.
 *   - vendor/rippled is the base clone (develop).
 *   - vendor/refs/<ref> are git worktrees for exact tags (e.g. 3.2.0-b0) when they exist on GitHub.
 *   - If no public tag matches the version (e.g. 3.4.0-rc6), develop is used (it is always ahead).
 * Returns { dir, ref } to feed the extractor.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
export const BASE = path.join(ROOT, "vendor/rippled");
const REFS = path.join(ROOT, "vendor/refs");
const REPO = "https://github.com/XRPLF/rippled.git";
const sh = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
const run = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "inherit" });

export function ensureBase(update = false) {
  if (!fs.existsSync(BASE)) {
    console.log("cloning rippled (develop)…");
    run(`git clone --depth 1 --branch develop ${REPO} ${BASE}`);
  } else if (update) {
    run("git fetch --depth 1 origin develop", BASE);
    run("git checkout -q develop", BASE);
    run("git reset -q --hard origin/develop", BASE);
  }
}

/** Public tag matching a build_version like "3.2.0-b0" or "3.4.0-rc6+abc" (build metadata stripped). */
export function tagFor(version: string): string | undefined {
  const tag = version.replace(/\+.*$/, "");
  try {
    return sh(`git ls-remote --tags ${REPO} refs/tags/${tag}`).length > 0 ? tag : undefined;
  } catch {
    return undefined;
  }
}

export function sourceFor(version: string, update = false): { dir: string; ref: string } {
  ensureBase(update);
  const tag = tagFor(version);
  if (!tag) return { dir: BASE, ref: "develop" };
  const dir = path.join(REFS, tag);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(REFS, { recursive: true });
    run(`git fetch --depth 1 origin tag ${tag}`, BASE);
    run(`git worktree add --detach ${dir} ${tag}`, BASE);
  }
  return { dir, ref: tag };
}
