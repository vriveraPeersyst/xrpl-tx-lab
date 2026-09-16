import Link from "next/link";
import type { TransactorAnalysis } from "@/lib/protocol";

/** Diagram of the transactor phases with the TER codes each one returns. */
export function Lifecycle({ t }: { t: TransactorAnalysis }) {
  const phases = [
    { key: "preflight", label: "preflight", desc: "Static validation: fields, flags, amendments.", fns: ["checkExtraFeatures", "getFlagsMask", "preflight", "preflightSigValidated", "checkGranularSemantics"] },
    { key: "preclaim", label: "preclaim", desc: "Checks against the current ledger.", fns: ["preclaim", "calculateBaseFee", "checkSeqProxy", "checkPriorTxAndLastLedger", "checkFee", "checkSign", "checkPermission"] },
    { key: "doApply", label: "doApply", desc: "Applies the changes to the ledger.", fns: ["doApply", "applyGuts", "apply", "visitInvariantEntry", "finalizeInvariants"] },
  ];
  const codes = (fns: string[]) => {
    const set = new Set<string>();
    for (const fn of fns) for (const c of t.functions[fn]?.ter ?? []) set.add(c);
    return [...set].filter((c) => c !== "tesSUCCESS").sort();
  };
  const present = phases.map((p) => ({ ...p, codes: codes(p.fns), has: p.fns.some((f) => f in t.functions) }));
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {present.map((p, i) => (
        <div key={p.key} className="relative card">
          {i < present.length - 1 && <div className="absolute -right-3 top-6 hidden text-muted md:block">→</div>}
          <div className="flex items-baseline justify-between"><h4 className="font-mono font-semibold">{p.label}</h4><span className="text-xs text-muted">{i + 1}/3</span></div>
          <p className="text-xs text-muted">{p.desc}</p>
          {p.has ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {p.codes.length ? p.codes.map((c) => <Link key={c} href={`/results#${c}`} className={`badge font-mono ${c.startsWith("tec") ? "bg-[#dbf15e] text-black" : "bg-[#fdece7] text-[#a22514]"}`}>{c}</Link>) : <span className="text-xs text-muted">no error codes of its own (uses Transactor&apos;s generic ones)</span>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">Inherits the generic <code>Transactor</code> implementation.</p>
          )}
        </div>
      ))}
    </div>
  );
}
