/**
 * Job de sincronización (one-shot, pensado para pm2 cron_restart a las 12:00 Europe/Madrid).
 *
 *   1. Toma un snapshot de testnet (versión de xrpld, amendments, server_definitions).
 *   2. Alinea el código fuente de rippled en vendor/rippled con esa versión
 *      (tag exacto si existe, si no la rama develop, que siempre va por delante).
 *   3. Re-extrae protocol.json.
 *   4. Ejecuta el lint de cobertura; para todo lo que falte (tx, objeto, amendment nuevos)
 *      genera la documentación: con `claude -p` si está disponible, si no un stub marcado draft.
 *   5. Vuelve a pasar el lint, escribe src/data/sync-log.json y, si hay cambios, hace commit
 *      (y push si hay remoto). El deploy lo hace Vercel a partir del push.
 *
 * Variables: TESTNET_RPC, SYNC_NO_GIT=1 (no commit), SYNC_NO_CLAUDE=1 (solo stubs), SYNC_NO_PUSH=1
 */
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RIPPLED = path.join(ROOT, "vendor/rippled");
const REPO = "https://github.com/XRPLF/rippled.git";
const log = (...a: unknown[]) => console.log(new Date().toISOString(), ...a);
const sh = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
const run = (cmd: string, cwd = ROOT) => execSync(cmd, { cwd, stdio: "inherit" });
const readJson = (rel: string) => (fs.existsSync(path.join(ROOT, rel)) ? JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) : undefined);

const before = readJson("src/data/testnet.json");

// 1. Snapshot
run("pnpm exec tsx tools/extract/testnet.ts");
const after = readJson("src/data/testnet.json");

// 2. Fuente de rippled alineada con testnet
function ensureSource(version: string) {
  if (!fs.existsSync(RIPPLED)) {
    log("clonando rippled (develop)…");
    run(`git clone --depth 1 --branch develop ${REPO} ${RIPPLED}`);
  }
  const tag = version.replace(/\+.*$/, "");
  const hasTag = sh(`git ls-remote --tags ${REPO} refs/tags/${tag}`).length > 0;
  if (hasTag) {
    log(`tag ${tag} existe en GitHub → checkout exacto`);
    run(`git fetch --depth 1 origin tag ${tag}`, RIPPLED);
    run(`git checkout -q ${tag}`, RIPPLED);
  } else {
    log(`no hay tag ${tag} público → usando develop (última)`);
    run("git fetch --depth 1 origin develop", RIPPLED);
    run("git checkout -q develop", RIPPLED);
    run("git reset -q --hard origin/develop", RIPPLED);
  }
}
ensureSource(after.buildVersion);

// 3. Extract
run("pnpm exec tsx tools/extract/extract.ts");

// 4. Lint + generación de lo que falte
function lint(): any {
  const r = spawnSync("pnpm", ["exec", "tsx", "tools/lint/coverage.ts", "--json"], { cwd: ROOT, encoding: "utf8" });
  const jsonStart = r.stdout.indexOf("{");
  return JSON.parse(r.stdout.slice(jsonStart));
}
let cov = lint();
const hasClaude = !process.env.SYNC_NO_CLAUDE && spawnSync("which", ["claude"], { encoding: "utf8" }).status === 0;

function draftWithClaude(prompt: string): string | undefined {
  if (!hasClaude) return undefined;
  const r = spawnSync("claude", ["-p", "--model", "claude-sonnet-5", "--output-format", "text", prompt], { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 600_000 });
  if (r.status !== 0) { log("claude -p falló:", r.stderr.slice(0, 500)); return undefined; }
  return r.stdout.trim();
}

const generated: string[] = [];
function writeDoc(kind: "tx" | "objects" | "amendments", name: string) {
  const file = path.join(ROOT, `content/${kind}/${name}.md`);
  if (fs.existsSync(file)) return;
  const guide = fs.readFileSync(path.join(ROOT, "content/GUIDE.md"), "utf8");
  const prompt = `${guide}\n\nEscribe el fichero content/${kind}/${name}.md siguiendo exactamente la guía anterior. Usa como fuente src/data/protocol.json, src/data/testnet.json y el código en vendor/rippled (busca "${name}"). Devuelve SOLO el contenido del fichero markdown con su frontmatter, sin explicaciones.`;
  let body = draftWithClaude(prompt);
  if (!body || !body.startsWith("---")) {
    body = `---\ntitle: ${name}\nsummary: Documentación pendiente de redactar (generado automáticamente por sync el ${new Date().toISOString().slice(0, 10)}).\ncategory: ${kind === "tx" ? "otros" : kind}\ndraft: true\n---\n\n## Qué hace\n\nPendiente. Consulta el código fuente enlazado en la pestaña "Fuente" y la documentación en xrpl.org.\n\n## Campos\n\nLa tabla de campos se genera automáticamente a partir de protocol.json.\n\n## Errores habituales\n\nLa lista de códigos TER se genera automáticamente a partir del transactor.\n`;
  }
  fs.writeFileSync(file, body + "\n");
  generated.push(`content/${kind}/${name}.md`);
  log("generado", `content/${kind}/${name}.md`, hasClaude ? "(claude)" : "(stub)");
}
for (const n of cov.report.missingTxDocs) writeDoc("tx", n);
for (const n of cov.report.missingObjectDocs) writeDoc("objects", n);
for (const n of cov.report.missingAmendmentDocs) writeDoc("amendments", n);

if (cov.report.missingRegistry.length) {
  // Entrada mínima en el registro: ejemplo con los campos requeridos y placeholders.
  const protocol = readJson("src/data/protocol.json");
  const regPath = path.join(ROOT, "src/lib/tx/registry.ts");
  let reg = fs.readFileSync(regPath, "utf8");
  for (const name of cov.report.missingRegistry) {
    const t = protocol.transactions.find((x: any) => x.name === name);
    const ex: Record<string, unknown> = { TransactionType: name };
    for (const f of t?.fields ?? []) if (f.optionality === "required") ex[f.name] = placeholderFor(f.name, protocol);
    const entry = `  ${name}: {\n    category: "otros",\n    example: ${JSON.stringify(ex, null, 6).replace(/\n/g, "\n    ")},\n    generated: true,\n  },\n`;
    reg = reg.replace(/\n\};\s*$/, `\n${entry}};\n`);
    generated.push(`registry:${name}`);
    log("registro: entrada generada para", name);
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

// 5. Log de cambios + git
const changes: string[] = [];
if (before) {
  if (before.buildVersion !== after.buildVersion) changes.push(`xrpld en testnet: ${before.buildVersion} → ${after.buildVersion}`);
  const prev = new Map(before.amendments.map((a: any) => [a.name, a]));
  for (const a of after.amendments) {
    const p: any = prev.get(a.name);
    if (!p) changes.push(`nuevo amendment: ${a.name}${a.enabled ? " (activo)" : ""}`);
    else if (p.enabled !== a.enabled) changes.push(`amendment ${a.name}: ${p.enabled ? "activo" : "inactivo"} → ${a.enabled ? "activo" : "inactivo"}`);
    else if ((p.majority ?? 0) !== (a.majority ?? 0) && a.majority) changes.push(`amendment ${a.name}: alcanzó mayoría (activación prevista)`);
  }
  if (before.definitions.hash !== after.definitions.hash) changes.push(`server_definitions cambió: ${before.definitions.hash.slice(0, 8)} → ${after.definitions.hash.slice(0, 8)}`);
}
const entry = { at: new Date().toISOString(), testnet: after.buildVersion, source: readJson("src/data/protocol.json").source, changes, generated, coverageOk: cov.ok, errors: cov.errors, warnings: cov.warnings };
const logPath = path.join(ROOT, "src/data/sync-log.json");
const history = readJson("src/data/sync-log.json") ?? [];
fs.writeFileSync(logPath, JSON.stringify([entry, ...history].slice(0, 200), null, 2));
log("cambios:", changes.length ? changes : "ninguno", "| generados:", generated.length, "| cobertura:", cov.ok ? "OK" : `${cov.errors.length} errores`);

if (!process.env.SYNC_NO_GIT) {
  const dirty = sh("git status --porcelain -- src/data content src/lib/tx/registry.ts");
  if (dirty) {
    run("git add src/data content src/lib/tx/registry.ts");
    const msg = `sync: testnet ${after.buildVersion} (${after.validatedLedger.seq})${changes.length ? "\n\n" + changes.map((c) => "- " + c).join("\n") : ""}${generated.length ? "\n\nGenerado: " + generated.join(", ") : ""}\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`;
    const msgFile = path.join(ROOT, ".git/SYNC_COMMIT_MSG");
    fs.writeFileSync(msgFile, msg);
    run(`git commit -q -F ${JSON.stringify(msgFile)}`);
    fs.unlinkSync(msgFile);
    log("commit hecho");
    if (!process.env.SYNC_NO_PUSH && sh("git remote").length) { run("git push -q"); log("push hecho"); }
  } else log("sin cambios en el repo");
}
process.exit(cov.ok ? 0 : 2);
