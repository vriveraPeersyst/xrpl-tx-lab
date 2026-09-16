import { rippleTime } from "@/lib/xrpl/rpc";

export interface PlaceholderContext {
  account?: string | null;
  other?: string;
  issuer?: string;
  seq?: number;
  ledger?: number;
  pubkey?: string;
}

/** Cuentas de demostración en testnet (financiadas por el faucet en algún momento; solo como destino). */
export const DEMO_OTHER = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
export const DEMO_ISSUER = "rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq";

/** Sustituye {{account}}, {{other}}, {{issuer}}, {{seq}}, {{seq+N}}, {{ledger+N}}, {{time+N}}, {{unix}}, {{pubkey}}. */
export function fillPlaceholders<T>(value: T, ctx: PlaceholderContext): T {
  const repl = (s: string): unknown => {
    const m = s.match(/^\{\{(\w+)(?:\+(\d+))?\}\}$/);
    if (!m) return s;
    const [, key, plus] = m;
    const n = Number(plus ?? 0);
    switch (key) {
      case "account": return ctx.account ?? "rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      case "other": return ctx.other ?? DEMO_OTHER;
      case "issuer": return ctx.issuer ?? DEMO_ISSUER;
      case "seq": return (ctx.seq ?? 0) + n;
      case "ledger": return (ctx.ledger ?? 0) + n;
      case "time": return rippleTime() + n;
      case "unix": return Math.floor(Date.now() / 1000) + n;
      case "pubkey": return ctx.pubkey ?? "";
      default: return s;
    }
  };
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return repl(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
