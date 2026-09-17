"use client";
import { useState } from "react";
import { RESERVE_RULES, accountReserveXrp, formatXrp, reserveXrp } from "@/lib/reserves";
import type { Snapshot } from "@/lib/protocol";
import { Stepper } from "@/components/Stepper";

const PICK = ["RippleState", "Offer", "Escrow", "Check", "PayChannel", "Ticket", "NFTokenPage", "NFTokenOffer", "SignerList", "DepositPreauth", "DID", "Credential", "MPTokenIssuance", "MPToken", "Oracle", "PermissionedDomain", "Vault", "LoanBroker"];

export function ReserveCalculator({ snapshot }: { snapshot: Snapshot }) {
  const [counts, setCounts] = useState<Record<string, number>>({ RippleState: 2, Offer: 1 });
  const units = PICK.reduce((s, k) => s + (counts[k] ?? 0) * RESERVE_RULES[k].units, 0);
  const total = accountReserveXrp(snapshot, units);
  return (
    <section className="card">
      <h2 className="mb-1 font-semibold">Reserve calculator</h2>
      <p className="mb-3 text-xs text-muted">Choose how many objects your account would have and see the XRP that gets locked up (using the current values of this network).</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PICK.map((k) => (
          <div key={k} className="text-xs"><div className="mb-1 flex items-baseline justify-between"><span className="font-mono">{k}</span><span className="text-muted">×{RESERVE_RULES[k].units}</span></div>
            <Stepper ariaLabel={k} value={counts[k] ?? 0} min={0} max={9999} onChange={(v) => setCounts({ ...counts, [k]: v })} />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm">Base reserve {formatXrp(snapshot.reserves.baseXrp)} + {units} units × {formatXrp(snapshot.reserves.incXrp)} = <b>{formatXrp(total)}</b> locked{units > 0 && <span className="text-muted"> (of which {formatXrp(reserveXrp(snapshot, units))} is released when the objects are deleted)</span>}.</p>
    </section>
  );
}
