import Link from "next/link";
import { notFound } from "next/navigation";
import { getTx, mergedFields, commonFields, txFlags, txAmendments, protocol, sourceUrl, testnetTxNames, PSEUDO_TX, amendmentStatus, testnet } from "@/lib/protocol";
import { registry, CATEGORIES } from "@/lib/tx/registry";
import { readDoc, flagDoc } from "@/lib/content";
import { Markdown } from "@/components/Markdown";
import { AmendmentBadge, FieldsTable, TerBadge } from "@/components/protocol";
import { TxBuilder } from "@/components/tx/TxBuilder";
import { Lifecycle } from "@/components/tx/Lifecycle";
import { Suspense } from "react";
import { txFeeRules, TX_CREATES, RESERVE_RULES, reserveXrp, formatXrp } from "@/lib/reserves";

export function generateStaticParams() {
  return testnetTxNames().map((name) => ({ name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const doc = readDoc("tx", name);
  return { title: name, description: doc?.data.summary };
}

export default async function TxPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const t = getTx(name);
  if (!t || !(name in testnet.definitions.TRANSACTION_TYPES)) notFound();
  const doc = readDoc("tx", name);
  const spec = registry[name];
  const fields = mergedFields(name);
  const flags = txFlags(name);
  const amendments = txAmendments(t);
  const gate = t.amendment ? { name: t.amendment, enabled: amendmentStatus(t.amendment)?.enabled ?? false } : undefined;
  const pseudo = PSEUDO_TX.has(name);
  const inner = Object.fromEntries(protocol.innerObjects.map((o) => [o.name, o.fields.map((f) => ({ name: f.name, type: protocol.sfields.find((s) => s.name === f.name)?.type ?? "Blob", optionality: f.optionality }))]));
  const normalizedInner = Object.fromEntries(Object.entries(inner).map(([k, fs]) => [k, fs.map((f) => ({ ...f, type: TYPE_MAP[f.type] ?? f.type }))]));
  const perms = protocol.permissions.filter((p) => p.txType === t.tag);
  const ter = (t.transactor?.allTer ?? []).filter((c) => c !== "tesSUCCESS");
  const asf = name === "AccountSet" ? protocol.txFlags.asf : [];

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Link href="/tx" className="hover:underline">Transacciones</Link><span>/</span><span>{CATEGORIES[spec?.category ?? (pseudo ? "sistema" : "otros")].label}</span>
          <span className="ml-auto font-mono">tipo {t.value} · {t.tag}</span>
        </div>
        <h1 className="font-mono text-3xl font-bold">{name}</h1>
        <p className="max-w-3xl text-lg text-muted">{doc?.data.summary ?? t.doc}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {gate ? <AmendmentBadge name={gate.name} /> : <span className="badge bg-surface-2 text-muted">sin amendment de activación</span>}
          {t.delegable && <Link href="/permissions" className="badge bg-accent-soft text-accent">delegable</Link>}
          {t.privileges.map((p) => <span key={p} className="badge bg-surface-2 text-muted" title="Privilegio declarado en TxSettings (lo aplican los invariant checks)">{p}</span>)}
          {doc?.data.level && <span className="badge bg-surface-2 text-muted">nivel: {doc.data.level}</span>}
          {doc?.data.xrplDocs && <a className="link" href={doc.data.xrplDocs} target="_blank" rel="noreferrer">xrpl.org ↗</a>}
          {doc?.data.xls && <a className="link" href={`https://github.com/XRPLF/XRPL-Standards/tree/master/${doc.data.xls}`} target="_blank" rel="noreferrer">{doc.data.xls} ↗</a>}
          {doc?.data.draft && <span className="badge bg-warning/15 text-warning">borrador generado automáticamente</span>}
        </div>
      </header>

      <section id="builder" className="space-y-3">
        <h2 className="text-xl font-semibold">Construir y enviar en testnet</h2>
        <Suspense fallback={<div className="text-sm text-muted">Cargando builder…</div>}>
        <TxBuilder
          name={name}
          fields={fields.map((f) => ({ name: f.name, type: f.type, optionality: f.optionality, inTestnet: f.inTestnet, hint: spec?.hints?.[f.name], mptSupported: f.mptSupported }))}
          commonFields={commonFields().map((f) => ({ name: f.name, type: f.type, optionality: f.optionality, inTestnet: true, common: true }))}
          flags={flags.map((f) => ({ name: f.name, value: f.value, doc: flagDoc(name, f.name) ?? f.doc }))}
          innerObjects={normalizedInner}
          example={spec?.example ?? { TransactionType: name }}
          prerequisites={spec?.prerequisites}
          amendmentGate={gate}
          pseudo={pseudo}
        />
        </Suspense>
      </section>

      {!pseudo && (
        <section id="coste" className="space-y-3">
          <h2 className="text-xl font-semibold">Cuánto cuesta</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="mb-2 font-semibold">Fee (se destruye)</h3>
              <ul className="space-y-2 text-sm">{txFeeRules(name).map((r) => <li key={r.label}><b>{r.label}</b>{r.drops !== undefined && <span className="ml-1 font-mono">{r.drops} drops</span>}{r.xrp !== undefined && <span className="ml-1 font-mono">{formatXrp(r.xrp)}</span>}<span className="block text-xs text-muted">{r.note}</span></li>)}</ul>
            </div>
            <div className="card">
              <h3 className="mb-2 font-semibold">Reserva (se bloquea, se libera al borrar)</h3>
              {(TX_CREATES[name] ?? []).length ? (
                <ul className="space-y-2 text-sm">{(TX_CREATES[name] ?? []).map((o) => { const r = RESERVE_RULES[o]; return <li key={o}><Link href={`/objects/${o}`} className="font-mono hover:underline">{o}</Link>{r && <span className="ml-1 font-mono">{r.units}{r.variable ? "+" : ""} × {formatXrp(testnet.reserves.incXrp)} = {formatXrp(reserveXrp(r.units))}</span>}{r && <span className="block text-xs text-muted">{r.note}</span>}</li>; })}</ul>
              ) : (
                <p className="text-sm text-muted">No crea objetos nuevos: no bloquea reserva adicional.</p>
              )}
              {t.transactor?.ownerCountCalls?.length ? <details className="mt-2"><summary className="cursor-pointer text-xs text-muted">Evidencia en el código ({t.transactor.ownerCountCalls.length})</summary><ul className="mt-1 space-y-1 font-mono text-xs text-muted">{t.transactor.ownerCountCalls.map((c) => <li key={c}>{c}</li>)}</ul></details> : null}
              <p className="mt-2 text-xs text-muted">Valores de testnet: base {formatXrp(testnet.reserves.baseXrp)}, incremento {formatXrp(testnet.reserves.incXrp)}. <Link href="/reserves" className="link">Tabla completa y calculadora</Link>.</p>
            </div>
          </div>
        </section>
      )}

      {doc ? (
        <section className="max-w-3xl"><Markdown>{doc.body}</Markdown></section>
      ) : (
        <section className="card text-sm text-muted">Documentación pendiente de redactar. Mientras tanto, la información de abajo se extrae automáticamente del código.</section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Campos ({fields.filter((f) => f.inTestnet).length} propios + {protocol.commonFields.length} comunes)</h2>
        <FieldsTable fields={fields} hints={spec?.hints} />
        <details>
          <summary className="cursor-pointer text-sm text-muted">Campos comunes a toda transacción</summary>
          <div className="mt-2"><FieldsTable fields={commonFields()} scope="common" /></div>
        </details>
      </section>

      {(flags.length > 0 || asf.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Flags</h2>
          {flags.length > 0 && (
            <table className="tbl">
              <thead><tr><th>Flag</th><th>Valor</th><th>Efecto</th></tr></thead>
              <tbody>{flags.map((f) => <tr key={f.name}><td className="font-mono">{f.name}</td><td className="font-mono text-xs">{f.hex} <span className="text-muted">({f.value})</span></td><td className="text-muted">{flagDoc(name, f.name) ?? f.doc ?? ""}</td></tr>)}</tbody>
            </table>
          )}
          {asf.length > 0 && (
            <>
              <h3 className="font-semibold">Valores de SetFlag / ClearFlag (asf*)</h3>
              <table className="tbl">
                <thead><tr><th>Flag</th><th>Valor</th><th>Efecto</th></tr></thead>
                <tbody>{asf.map((f) => <tr key={f.name}><td className="font-mono">{f.name}</td><td className="font-mono text-xs">{f.value}</td><td className="text-muted">{flagDoc("AccountSet", f.name) ?? ""}</td></tr>)}</tbody>
              </table>
            </>
          )}
          <p className="text-xs text-muted">Flags universales: <code>tfFullyCanonicalSig</code> (0x80000000, obsoleto) y <code>tfInnerBatchTxn</code> (0x40000000, solo dentro de un Batch).</p>
        </section>
      )}

      {t.transactor && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cómo lo procesa xrpld</h2>
          <Lifecycle t={t.transactor} />
          <p className="text-xs text-muted">Además de estos, cualquier transacción puede fallar con los códigos genéricos (fee, secuencia, firma) de <code>Transactor.cpp</code>: <TerBadge code="telINSUF_FEE_P" /> <TerBadge code="terPRE_SEQ" /> <TerBadge code="tefPAST_SEQ" /> <TerBadge code="tefMAX_LEDGER" /> <TerBadge code="terINSUF_FEE_B" /> <TerBadge code="tefBAD_AUTH" />.</p>
        </section>
      )}

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Códigos de resultado posibles ({ter.length})</h2>
          <div className="flex flex-wrap gap-1">{ter.map((c) => <TerBadge key={c} code={c} />)}</div>
          <ul className="mt-2 space-y-1 text-sm">
            {ter.map((c) => { const r = protocol.results.find((x) => x.code === c); return <li key={c}><code className="text-xs">{c}</code> <span className="text-muted">— {r?.description ?? r?.comment ?? ""}</span></li>; })}
          </ul>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Amendments que lo condicionan ({amendments.length})</h2>
          <ul className="space-y-1 text-sm">
            {amendments.map((a) => <li key={a.name} className="flex items-center gap-2"><AmendmentBadge name={a.name} />{a.gate && <span className="text-xs text-muted">activa el tipo</span>}</li>)}
            {amendments.length === 0 && <li className="text-muted">Ninguno: comportamiento base del protocolo.</li>}
          </ul>
          {perms.length > 0 && (
            <>
              <h3 className="pt-3 font-semibold">Permisos granulares delegables</h3>
              <ul className="space-y-1 text-sm">{perms.map((p) => <li key={p.name}><Link href="/permissions" className="font-mono hover:underline">{p.name}</Link> <span className="text-muted">({p.value}) — {p.doc}</span></li>)}</ul>
            </>
          )}
        </div>
      </section>

      {t.transactor && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Código fuente</h2>
          <p className="text-sm text-muted">Transactor: <a className="link" href={sourceUrl(t.transactor.file)} target="_blank" rel="noreferrer">{t.transactor.file}</a> ({t.transactor.lines} líneas) · definición: <a className="link" href={sourceUrl("include/xrpl/protocol/detail/transactions.macro")} target="_blank" rel="noreferrer">transactions.macro</a></p>
          <table className="tbl">
            <thead><tr><th>Función</th><th>Códigos TER</th><th>Amendments consultados</th><th>Flags</th></tr></thead>
            <tbody>
              {Object.entries(t.transactor.functions).map(([fn, a]) => (
                <tr key={fn}>
                  <td><a className="link font-mono" href={sourceUrl(t.transactor!.file, a.line)} target="_blank" rel="noreferrer">{fn}</a></td>
                  <td className="text-xs">{a.ter.filter((c) => c !== "tesSUCCESS").join(", ") || "—"}</td>
                  <td className="text-xs">{a.features.map((f) => f.replace(/^feature/, "")).join(", ") || "—"}</td>
                  <td className="text-xs">{a.flags.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

const TYPE_MAP: Record<string, string> = { ACCOUNT: "AccountID", AMOUNT: "Amount", UINT8: "UInt8", UINT16: "UInt16", UINT32: "UInt32", UINT64: "UInt64", INT32: "Int32", HASH128: "Hash128", HASH160: "Hash160", HASH192: "Hash192", HASH256: "Hash256", VL: "Blob", STARRAY: "STArray", STOBJECT: "STObject", PATHSET: "PathSet", VECTOR256: "Vector256", ISSUE: "Issue", CURRENCY: "Currency", NUMBER: "Number", XCHAIN_BRIDGE: "XChainBridge" };
