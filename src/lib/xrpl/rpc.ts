/**
 * Minimal JSON-RPC client for any configured XRPL network, usable in the browser.
 * s.altnet.rippletest.net blocks CORS in the browser; the XRPL Labs node (Xaman's team) doesn't,
 * so networks list browser-friendly endpoints first.
 */
import type { Network } from "@/lib/networks";

export const RIPPLE_EPOCH = 946684800;

export class RpcError extends Error {
  constructor(public readonly code: string, message: string, public readonly raw?: unknown) {
    super(message);
  }
}

export async function rpc<T = Record<string, unknown>>(net: Network, method: string, params: Record<string, unknown> = {}): Promise<T> {
  let lastErr: unknown;
  for (const url of net.rpc) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, params: [params] }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { result: T & { status?: string; error?: string; error_message?: string; error_exception?: string } };
      const r = json.result;
      if (r?.status === "error") throw new RpcError(r.error ?? "error", r.error_message ?? r.error_exception ?? r.error ?? "RPC error", r);
      return r;
    } catch (e) {
      if (e instanceof RpcError) throw e;
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("RPC unavailable");
}

export interface AccountInfo { account_data: { Account: string; Balance: string; Sequence: number; OwnerCount: number; Flags: number; RegularKey?: string; Domain?: string; [k: string]: unknown }; ledger_current_index?: number; validated?: boolean }

export const accountInfo = (net: Network, account: string) => rpc<AccountInfo>(net, "account_info", { account, ledger_index: "validated" });
export const accountObjects = (net: Network, account: string, type?: string) => rpc<{ account_objects: Record<string, unknown>[] }>(net, "account_objects", { account, ledger_index: "validated", ...(type ? { type } : {}), limit: 400 });
export const accountTx = (net: Network, account: string, limit = 20) => rpc<{ transactions: { tx_json?: Record<string, unknown>; tx?: Record<string, unknown>; meta?: Record<string, unknown>; validated?: boolean; hash?: string }[] }>(net, "account_tx", { account, limit, ledger_index_min: -1, ledger_index_max: -1 });
export const txByHash = (net: Network, hash: string) => rpc<Record<string, unknown>>(net, "tx", { transaction: hash, binary: false });
export const ledgerCurrent = (net: Network) => rpc<{ ledger_current_index: number }>(net, "ledger_current");
export const serverInfo = (net: Network) => rpc<{ info: { build_version: string; validated_ledger: { seq: number } } }>(net, "server_info");

/** Simulates a transaction without submitting it (RPC `simulate`, XLS-69). Returns meta and engine_result. */
export const simulate = (net: Network, tx_json: Record<string, unknown>) => rpc<{ engine_result: string; engine_result_message: string; engine_result_code: number; tx_json: Record<string, unknown>; meta?: Record<string, unknown>; applied?: boolean }>(net, "simulate", { tx_json, binary: false });

export async function fundFromFaucet(net: Network, destination?: string): Promise<{ account: { address: string; secret?: string }; amount: number }> {
  if (!net.faucet) throw new Error(`No faucet configured for ${net.label}`);
  const res = await fetch(net.faucet, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(destination ? { destination } : {}) });
  if (!res.ok) throw new Error(`Faucet: HTTP ${res.status}`);
  return res.json();
}

export function explorerTx(net: Network, hash: string) { return net.explorer ? `${net.explorer}/transactions/${hash}` : undefined; }
export function explorerAccount(net: Network, account: string) { return net.explorer ? `${net.explorer}/accounts/${account}` : undefined; }

export const rippleTime = (unixSeconds = Date.now() / 1000) => Math.floor(unixSeconds - RIPPLE_EPOCH);
export const fromRippleTime = (t: number) => new Date((t + RIPPLE_EPOCH) * 1000);
export const dropsToXrp = (drops: string | number) => (Number(drops) / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 6 });
