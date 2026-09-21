/**
 * Sync job (one-shot; pm2 runs it through tools/sync/scheduled.ts, hourly 10:00–20:00 until it succeeds).
 *
 *   0. With a git remote: goes back to main and fast-forwards it (a failed run may have left
 *      the checkout on a sync/ branch).
 *   1. Takes a testnet snapshot (xrpld version, amendments, server_definitions).
 *   2. Aligns the rippled source code in vendor/rippled with that version
 *      (exact tag if it exists, otherwise the develop branch, which is always ahead).
 *   3. Re-extracts protocol.json.
 *   4. Runs the coverage lint; for everything missing (new tx, object, amendment)
 *      generates the documentation: with `claude -p` if available, otherwise a stub marked draft.
 *   5. Runs the lint again, writes src/data/sync-log.json and, if there are changes, commits.
 *      With a remote: commits on sync/<date>, pushes, opens (or reuses) the PR and squash-merges
 *      it with `gh`, then returns to the updated main. Without a remote: commits on the current
 *      branch. GitHub auth: GH_TOKEN for gh (scheduled.ts pins vriveraPeersyst) and the remote
 *      URL carries the user (https://vriveraPeersyst@github.com/…) so git asks for that account.
 *   6. Deploys to Vercel whenever HEAD is not the last deployed commit, so a deploy that failed
 *      is retried by the next run even if that run has nothing new to commit.
 *
 * Exit codes: 0 ok, 2 coverage errors (not retryable), 3 deploy failed, 1 anything else.
 *
 * Claude drafting needs CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`), like qwen-onehextwo:
 * it must not depend on whichever account the Mac's keychain happens to be logged into.
 * SYNC_CLAUDE_LOCAL_AUTH=1 opts into the keychain login instead.
 *
 * Variables: TESTNET_RPC, SYNC_NO_GIT=1 (no commit), SYNC_NO_CLAUDE=1 (stubs only), SYNC_NO_PUSH=1,
 * SYNC_NO_DEPLOY=1, SYNC_STATE_DIR (default ~/.config/xrpl-tx-lab)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RIPPLED = path.join(ROOT, "vendor/rippled");
const REPO = "https://github.com/XRPLF/rippled.git";
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const sh = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
const run = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "inherit" });
const readJson = (rel: string) => (fs.existsSync(path.join(ROOT, rel)) ? JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) : undefined);

const STATE_DIR = process.env.SYNC_STATE_DIR ?? path.join(os.homedir(), ".config/xrpl-tx-lab");
const NET_DIR = path.join(ROOT, "src/data/networks");
const readSnap = (id: string) => readJson(`src/data/networks/${id}/snapshot.json`);
const netIds = () => (fs.existsSync(NET_DIR) ? fs.readdirSync(NET_DIR).filter((n) => fs.existsSync(path.join(NET_DIR, n, "snapshot.json"))).sort() : []);
const hasRemote = !process.env.SYNC_NO_GIT && !process.env.SYNC_NO_PUSH && sh("git remote").length > 0;

// 0. Start from an up-to-date main. Generated data is thrown away (it is regenerated below);
// content/ and the registry are left alone, so a pull that conflicts with them fails the run.
if (hasRemote) {
  run("git checkout -q -- src/data");
  run("git checkout -q main");
  run("git pull -q --ff-only origin main");
}

const before: Record<string, any> = Object.fromEntries(netIds().map((id) => [id, readSnap(id)]));

// 1. Snapshots of every network (unreachable ones keep their previous snapshot)
run("pnpm exec tsx tools/extract/snapshot.ts");
const after: Record<string, any> = Object.fromEntries(netIds().map((id) => [id, readSnap(id)]));

// 2+3. Source per version (tag or develop) and extraction
run("pnpm exec tsx tools/extract/all.ts --update");

// 3b. Client libraries and GitHub development status (both tolerate failures).
try { run("pnpm exec tsx tools/extract/libraries.ts"); } catch (e) { log("libraries failed:", e instanceof Error ? e.message : e); }
if (!process.env.SYNC_NO_GITHUB) { try { run("pnpm exec tsx tools/extract/github.ts"); } catch (e) { log("github failed:", e instanceof Error ? e.message : e); } }

// 4. Lint + generation of what is missing
function lint(): any {
  // Read the file the lint writes, not its stdout: the lint ends with process.exit(), which cuts
  // piped stdout at 64 KB, and the report is bigger than that since mainnet was added.
  spawnSync("pnpm", ["exec", "tsx", "tools/lint/coverage.ts"], { cwd: ROOT, stdio: "ignore" });
  return readJson("src/data/coverage.json");
}
let cov = lint();
const claudeAuth = !!process.env.CLAUDE_CODE_OAUTH_TOKEN || process.env.SYNC_CLAUDE_LOCAL_AUTH === "1";
const hasClaude = !process.env.SYNC_NO_CLAUDE && claudeAuth && spawnSync("which", ["claude"], { encoding: "utf8" }).status === 0;
if (!process.env.SYNC_NO_CLAUDE && !claudeAuth) log("claude: no CLAUDE_CODE_OAUTH_TOKEN (run `claude setup-token`) — new docs will be stubs");
// Drop CLAUDE_* inherited from whatever Claude Code session started pm2 (it would look like a nested
// run of that session), keep our token, and never let an API key switch billing to pay-per-token.
const claudeEnv: NodeJS.ProcessEnv = { ...process.env, ANTHROPIC_API_KEY: "" };
for (const k of Object.keys(claudeEnv)) if (k.startsWith("CLAUDE_") && k !== "CLAUDE_CODE_OAUTH_TOKEN") delete claudeEnv[k];

function draftWithClaude(prompt: string): string | undefined {
  if (!hasClaude) return undefined;
  const r = spawnSync("claude", ["-p", "--model", "claude-sonnet-5", "--output-format", "text", prompt], { cwd: ROOT, env: claudeEnv, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 600_000 });
  if (r.status !== 0) { log("claude -p failed:", r.stderr.slice(0, 500)); return undefined; }
  return r.stdout.trim();
}

const generated: string[] = [];
function writeDoc(kind: "tx" | "objects" | "amendments", name: string) {
  const file = path.join(ROOT, `content/${kind}/${name}.md`);
  if (fs.existsSync(file)) return;
  const guide = fs.readFileSync(path.join(ROOT, "content/GUIDE.md"), "utf8");
  const prompt = `${guide}\n\nWrite the file content/${kind}/${name}.md following exactly the guide above. Use as source src/data/protocol.json, src/data/testnet.json and the code in vendor/rippled (search for "${name}"). Return ONLY the markdown file content with its frontmatter, no explanations.`;
  let body = draftWithClaude(prompt);
  if (!body || !body.startsWith("---")) {
    body = `---\ntitle: ${name}\nsummary: Documentation pending (auto-generated by sync on ${new Date().toISOString().slice(0, 10)}).\ncategory: ${kind === "tx" ? "otros" : kind}\ndraft: true\n---\n\n## What it does\n\nPending. See the source code linked in the "Source" tab and the documentation at xrpl.org.\n\n## Fields\n\nThe fields table is generated automatically from protocol.json.\n\n## Common errors\n\nThe list of TER codes is generated automatically from the transactor.\n`;
  }
  fs.writeFileSync(file, body + "\n");
  generated.push(`content/${kind}/${name}.md`);
  log("generated", `content/${kind}/${name}.md`, hasClaude ? "(claude)" : "(stub)");
}
for (const n of cov.report.missingTxDocs) writeDoc("tx", n);
for (const n of cov.report.missingObjectDocs) writeDoc("objects", n);
for (const n of cov.report.missingAmendmentDocs) writeDoc("amendments", n);

if (cov.report.missingRegistry.length) {
  // Minimal registry entry: example with the required fields and placeholders.
  const protocol = readJson(`src/data/protocol/${Object.values(after)[0]?.sourceRef ?? "develop"}.json`);
  const regPath = path.join(ROOT, "src/lib/tx/registry.ts");
  let reg = fs.readFileSync(regPath, "utf8");
  for (const name of cov.report.missingRegistry) {
    const t = protocol.transactions.find((x: any) => x.name === name);
    const ex: Record<string, unknown> = { TransactionType: name };
    for (const f of t?.fields ?? []) if (f.optionality === "required") ex[f.name] = placeholderFor(f.name, protocol);
    const entry = `  ${name}: {\n    category: "otros",\n    example: ${JSON.stringify(ex, null, 6).replace(/\n/g, "\n    ")},\n    generated: true,\n  },\n`;
    reg = reg.replace(/\n\};\s*$/, `\n${entry}};\n`);
    generated.push(`registry:${name}`);
    log("registry: entry generated for", name);
  }
  fs.writeFileSync(regPath, reg);
}
function placeholderFor(field: string, protocol: any): unknown {
  const type = protocol.sfields.find((s: any) => s.name === field)?.type;
  switch (type) {
    case "ACCOUNT": return "rrrrrrrrrrrrrrrrrrrrBZbvji";
    case "AMOUNT": return "1000000";
    case "UINT32": case "UINT16": case "UINT8": case "UINT64": return 0;
    case "HASH256": return "0000000000000000000000000000000000000000000000000000000000000000";
    case "VL": return "";
    case "STARRAY": return [];
    default: return "";
  }
}

cov = lint();

// 5. Change log + git
const changes: string[] = [];
for (const id of Object.keys(after)) {
  const b = before[id];
  const a = after[id];
  if (!b) { changes.push(`${id}: first snapshot (xrpld ${a.buildVersion})`); continue; }
  if (b.buildVersion !== a.buildVersion) changes.push(`${id}: xrpld ${b.buildVersion} → ${a.buildVersion}`);
  const prev = new Map(b.amendments.map((x: any) => [x.name, x]));
  for (const x of a.amendments) {
    const p: any = prev.get(x.name);
    if (!p) changes.push(`${id}: new amendment ${x.name}${x.enabled ? " (enabled)" : ""}`);
    else if (p.enabled !== x.enabled) changes.push(`${id}: amendment ${x.name}: ${p.enabled ? "enabled" : "disabled"} → ${x.enabled ? "enabled" : "disabled"}`);
    else if ((p.majority ?? 0) !== (x.majority ?? 0) && x.majority) changes.push(`${id}: amendment ${x.name} reached majority (activation scheduled)`);
  }
  if (b.definitions.hash !== a.definitions.hash) changes.push(`${id}: server_definitions changed ${b.definitions.hash.slice(0, 8)} → ${a.definitions.hash.slice(0, 8)}`);
}
const entry = { at: new Date().toISOString(), networks: Object.fromEntries(Object.entries(after).map(([id, a]) => [id, { version: a.buildVersion, ledger: a.validatedLedger?.seq, sourceRef: a.sourceRef }])), changes, generated, coverageOk: cov.ok, errors: cov.errors, warnings: cov.warnings };
const logPath = path.join(ROOT, "src/data/sync-log.json");
const history = readJson("src/data/sync-log.json") ?? [];
fs.writeFileSync(logPath, JSON.stringify([entry, ...history].slice(0, 200), null, 2));
log("changes:", changes.length ? changes : "none", "| generated:", generated.length, "| coverage:", cov.ok ? "OK" : `${cov.errors.length} errors`);

if (!process.env.SYNC_NO_GIT) {
  const dirty = sh("git status --porcelain -- src/data content src/lib/tx/registry.ts");
  if (dirty) {
    run("git add src/data content src/lib/tx/registry.ts");
    const msg = `sync: ${Object.entries(after).map(([id, a]) => `${id} ${a.buildVersion}`).join(", ")}${changes.length ? "\n\n" + changes.map((c) => "- " + c).join("\n") : ""}${generated.length ? "\n\nGenerated: " + generated.join(", ") : ""}\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`;
    const msgFile = path.join(ROOT, ".git/SYNC_COMMIT_MSG");
    fs.writeFileSync(msgFile, msg);
    const branch = `sync/${new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })}`;
    if (hasRemote) run(`git checkout -q -B ${branch}`);
    run(`git commit -q -F ${JSON.stringify(msgFile)}`);
    log("commit done");
    if (hasRemote) {
      // A retry on the same day overwrites the branch and reuses its open PR.
      run(`git push -q -f -u origin ${branch}`);
      const title = msg.split("\n")[0];
      const open = sh(`gh pr list --head ${branch} --state open --json number --jq ".[0].number"`);
      if (!open) run(`gh pr create --base main --head ${branch} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(msgFile)}`);
      run(`gh pr merge ${branch} --squash --subject ${JSON.stringify(title)} --body-file ${JSON.stringify(msgFile)}`);
      run("git checkout -q main");
      run("git pull -q --ff-only origin main");
      run(`git push -q origin --delete ${branch}`);
      run(`git branch -q -D ${branch}`);
      log("PR merged into main");
    }
    fs.unlinkSync(msgFile);
  } else log("no changes in the repo");
}

// 6. Deploy to Vercel when the project is linked and HEAD has not been deployed yet.
let deployFailed = false;
if (!process.env.SYNC_NO_GIT && !process.env.SYNC_NO_DEPLOY && fs.existsSync(path.join(ROOT, ".vercel/project.json"))) {
  const marker = path.join(STATE_DIR, "deployed-commit");
  const head = sh("git rev-parse HEAD");
  const deployed = fs.existsSync(marker) ? fs.readFileSync(marker, "utf8").trim() : "";
  if (head === deployed) log("Vercel already has", head.slice(0, 7));
  else {
    try {
      run("vercel deploy --prod --yes");
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(marker, head + "\n");
      log("deployed to Vercel", head.slice(0, 7));
    } catch (e) { deployFailed = true; log("vercel deploy failed:", e instanceof Error ? e.message : e); }
  }
}
process.exit(deployFailed ? 3 : cov.ok ? 0 : 2);
