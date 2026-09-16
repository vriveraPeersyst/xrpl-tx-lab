"use client";
import { useState } from "react";
import { RESERVE_RULES, accountReserveXrp, formatXrp, reserveXrp } from "@/lib/reserves";
import { testnet } from "@/lib/protocol";

const PICK = ["RippleState", "Offer", "Escrow", "Check", "PayChannel", "Ticket", "NFTokenPage", "NFTokenOffer", "SignerList", "DepositPreauth", "DID", "Credential", "MPTokenIssuance", "MPToken", "Oracle", "PermissionedDomain", "Vault", "LoanBroker"];

export function ReserveCalculator() {
  const [counts, setCounts] = useState<Record<string, number>>({ RippleState: 2, Offer: 1 });
  const units = PICK.reduce((s, k) => s + (counts[k] ?? 0) * RESERVE_RULES[k].units, 0);
  const total = accountReserveXrp(units);
  return (
    <section className="card">
      <h2 className="mb-1 font-semibold">Calculadora de reserva</h2>
      <p className="mb-3 text-xs text-muted">Elige cuántos objetos tendría tu cuenta y verás el XRP que queda bloqueado (con los valores actuales de testnet).</p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PICK.map((k) => (
          <label key={k} className="text-xs"><span className="font-mono">{k}</span> <span className="text-muted">×{RESERVE_RULES[k].units}</span>
            <input type="number" min={0} className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 font-mono" value={counts[k] ?? 0} onChange={(e) => setCounts({ ...counts, [k]: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
        ))}
      </div>
      <p className="mt-3 text-sm">Reserva base {formatXrp(testnet.reserves.baseXrp)} + {units} unidades × {formatXrp(testnet.reserves.incXrp)} = <b>{formatXrp(total)}</b> bloqueados{units > 0 && <span className="text-muted"> (de los cuales {formatXrp(reserveXrp(units))} se liberan al borrar los objetos)</span>}.</p>
    </section>
  );
}
