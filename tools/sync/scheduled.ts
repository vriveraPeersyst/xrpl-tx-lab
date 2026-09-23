/**
 * Scheduled entry point for the daily sync (pm2 fires it every hour from 10:00 to 20:00 Madrid).
 *
 * The first run of the day that succeeds marks the day as done; the remaining hourly fires exit
 * straight away. A failed run leaves the day open, so the next hour tries again, until 20:00.
 * pm2 resurrect also starts the job at boot: outside the window it does nothing.
 *
 *   pnpm sync:scheduled            # respects the window and the "done today" mark
 *   pnpm sync:scheduled --force    # runs anyway
 *
 * Accounts are pinned, whatever the Mac is logged into at the moment:
 *   - GitHub: vriveraPeersyst. Its token is taken from the gh keyring (`gh auth token --user`) and
 *     passed as GH_TOKEN, so the active gh account does not matter. Wrong account ⇒ the run fails.
 *   - Claude: vrivera@peersyst.com, via CLAUDE_CODE_OAUTH_TOKEN. A `claude setup-token` token only
 *     has the inference scope, so it cannot say which account it belongs to (`claude auth status`
 *     shows no email, /api/oauth/profile refuses it): the account is fixed when it is generated.
 *     Generate it while `claude auth status` shows vrivera@peersyst.com and declare it next to the
 *     token as CLAUDE_TOKEN_ACCOUNT. Missing token or another account ⇒ stubs only for the run.
 *
 * Secrets live outside the repo (the deploy uploads the working tree), in
 * ~/.config/xrpl-tx-lab/sync.env (chmod 600):
 *   CLAUDE_CODE_OAUTH_TOKEN=…                    (from `claude setup-token`)
 *   CLAUDE_TOKEN_ACCOUNT=vrivera@peersyst.com
 * State in the same folder: state.json (last success/attempt), sync.lock, deployed-commit.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const STATE_DIR = process.env.SYNC_STATE_DIR ?? path.join(os.homedir(), ".config/xrpl-tx-lab");
const STATE = path.join(STATE_DIR, "state.json");
const LOCK = path.join(STATE_DIR, "sync.lock");
const FIRST_HOUR = 10;
const LAST_HOUR = 20;
const GITHUB_USER = "vriveraPeersyst";
const CLAUDE_EMAIL = "vrivera@peersyst.com";
const force = process.argv.includes("--force");
const log = (...a: unknown[]) => console.log(new Date().toISOString(), "[scheduled]", ...a);

const now = new Date();
const today = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
const hour = Number(now.toLocaleString("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }));

fs.mkdirSync(STATE_DIR, { recursive: true });
type State = { lastSuccess?: string; lastAttempt?: string; lastAttemptDay?: string; lastExit?: number; attemptsToday?: number };
let state: State = {};
try { state = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch {}
const save = () => fs.writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");

if (!force && (hour < FIRST_HOUR || hour > LAST_HOUR)) { log(`outside ${FIRST_HOUR}:00–${LAST_HOUR}:00 (now ${hour}h), nothing to do`); process.exit(0); }
if (!force && state.lastSuccess === today) { log(`already synced today (${today})`); process.exit(0); }

// A run takes ~15 min, but never let two overlap (a manual run, or one that ran past the hour).
if (fs.existsSync(LOCK)) {
  const pid = Number(fs.readFileSync(LOCK, "utf8"));
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch {}
  if (alive) { log(`another sync is running (pid ${pid}), skipping`); process.exit(0); }
  log(`removing stale lock (pid ${pid})`);
}
fs.writeFileSync(LOCK, String(process.pid));

try {
  // Never inherit the Claude Code session that started pm2, nor an API key (pay-per-token billing).
  // Strip before loading sync.env, which brings our own CLAUDE_* values.
  for (const k of Object.keys(process.env)) if (k.startsWith("CLAUDE_")) delete process.env[k];
  process.env.ANTHROPIC_API_KEY = "";
  const envFile = path.join(STATE_DIR, "sync.env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  // GitHub: pin the account (sync.ts uses `gh api` for the mining and the library releases).
  const tok = spawnSync("gh", ["auth", "token", "--user", GITHUB_USER], { encoding: "utf8" });
  const ghToken = tok.status === 0 ? tok.stdout.trim() : "";
  const ghLogin = ghToken ? spawnSync("gh", ["api", "user", "--jq", ".login"], { encoding: "utf8", env: { ...process.env, GH_TOKEN: ghToken } }).stdout?.trim() : "";
  if (ghLogin !== GITHUB_USER) throw new Error(`GitHub: expected ${GITHUB_USER}, got "${ghLogin || tok.stderr.trim()}" (gh auth login, then retry)`);
  process.env.GH_TOKEN = ghToken;
  // git push authenticates through gh with GH_TOKEN; if that ever fails, fail fast instead of
  // waiting forever for a password prompt nobody will answer.
  process.env.GIT_TERMINAL_PROMPT = "0";
  log("github as", ghLogin);

  // Claude: only the vrivera@peersyst.com subscription token, never the keychain login.
  delete process.env.SYNC_CLAUDE_LOCAL_AUTH;
  const hasToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
  const claudeAccount = process.env.CLAUDE_TOKEN_ACCOUNT;
  if (hasToken && claudeAccount === CLAUDE_EMAIL) log("claude as", claudeAccount);
  else {
    process.env.SYNC_NO_CLAUDE = "1";
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    log(!hasToken ? `no CLAUDE_CODE_OAUTH_TOKEN in ${envFile} — stubs only` : `claude token declared for "${claudeAccount ?? "?"}", not ${CLAUDE_EMAIL} — stubs only`);
  }

  const attempts = (state.lastAttemptDay === today ? state.attemptsToday ?? 0 : 0) + 1;
  // Exit 3 means today's data was already merged into main and only the deploy failed: retry the
  // deploy alone, so the day does not end up with a second PR for the same data.
  if (state.lastAttemptDay === today && state.lastExit === 3) process.env.SYNC_DEPLOY_ONLY = "1";
  log(`attempt ${attempts} for ${today}${process.env.SYNC_DEPLOY_ONLY ? " (deploy only)" : ""}`);
  const r = spawnSync("pnpm", ["exec", "tsx", "tools/sync/sync.ts"], { cwd: ROOT, stdio: "inherit", env: process.env });
  const code = r.status ?? 1;

  // 2 = coverage errors: missing docs/registry entries that a retry will not fix. The data is
  // committed and deployed anyway, so the day counts as done.
  const ok = code === 0 || code === 2;
  state = { ...state, lastAttempt: now.toISOString(), lastAttemptDay: today, lastExit: code, attemptsToday: attempts, ...(ok ? { lastSuccess: today } : {}) };
  save();
  if (ok) log(`done for ${today}${code === 2 ? " (with coverage errors, see src/data/coverage.json)" : ""}`);
  else log(hour >= LAST_HOUR ? `failed (exit ${code}); last slot of the day, giving up until tomorrow` : `failed (exit ${code}); retrying at ${hour + 1}:00`);
  process.exitCode = ok ? 0 : 1;
} finally {
  fs.rmSync(LOCK, { force: true });
}
