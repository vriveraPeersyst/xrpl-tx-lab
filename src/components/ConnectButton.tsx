"use client";
import Link from "next/link";
import { useXaman } from "@/lib/xaman/provider";

export function ConnectButton() {
  const x = useXaman();
  if (!x.configured) return <span className="text-xs text-muted" title="Define NEXT_PUBLIC_XAMAN_API_KEY">Xaman sin configurar</span>;
  if (x.account)
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link href="/account" className="font-mono text-xs hover:underline" title={x.account}>{x.account.slice(0, 6)}…{x.account.slice(-4)}</Link>
        {x.network && x.network.toUpperCase() !== "TESTNET" && <span className="badge bg-danger/15 text-danger" title="Tu app Xaman está en otra red; los payloads se fuerzan a testnet igualmente">{x.network}</span>}
        <button type="button" className="btn-secondary" onClick={x.disconnect}>Salir</button>
      </div>
    );
  return <button type="button" className="btn-primary" disabled={!x.ready || x.connecting} onClick={x.connect}>{x.connecting ? "Conectando…" : "Conectar Xaman"}</button>;
}
