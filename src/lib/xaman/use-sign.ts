"use client";
import { useCallback, useRef, useState } from "react";
import { getXummInstance, type XummCreatedPayload, type XummResolvedPayload } from "./sdk";

export type SignStatus = "idle" | "creating" | "awaiting" | "signed" | "rejected" | "expired" | "error";

export interface SignState {
  status: SignStatus;
  created: XummCreatedPayload | null;
  resolved: XummResolvedPayload | null;
  txid: string | null;
  error: string | null;
}

/**
 * Signs (and submits, Xaman does the submit) a transaction with Xaman: payload.createAndSubscribe.
 * Returns QR + deep link for desktop/mobile and waits for resolution over WebSocket.
 */
export function useXamanSign() {
  const [state, setState] = useState<SignState>({ status: "idle", created: null, resolved: null, txid: null, error: null });
  const uuidRef = useRef<string | null>(null);

  const sign = useCallback(async (txjson: Record<string, unknown>, instruction?: string, forceNetwork?: string) => {
    const xumm = getXummInstance();
    if (!xumm?.payload) { setState({ status: "error", created: null, resolved: null, txid: null, error: "Connect a Xaman account first" }); return null; }
    if (!forceNetwork) { setState({ status: "error", created: null, resolved: null, txid: null, error: "Xaman cannot sign on this network" }); return null; }
    setState({ status: "creating", created: null, resolved: null, txid: null, error: null });
    try {
      const { created, resolved } = await xumm.payload.createAndSubscribe(
        { txjson, options: { submit: true, force_network: forceNetwork, expire: 10, instruction: instruction ?? "XRPL Tx Lab · testnet" } },
        (event) => ("signed" in event.data || "expired" in event.data ? event : undefined),
      );
      uuidRef.current = created.uuid;
      setState({ status: "awaiting", created, resolved: null, txid: null, error: null });
      const result = await resolved;
      if (result.meta.signed && result.response.txid) setState({ status: "signed", created, resolved: result, txid: result.response.txid, error: null });
      else if (result.meta.expired) setState({ status: "expired", created, resolved: result, txid: null, error: "The payload expired without being signed" });
      else setState({ status: "rejected", created, resolved: result, txid: null, error: "Signature rejected in Xaman" });
      return result;
    } catch (e) {
      setState({ status: "error", created: null, resolved: null, txid: null, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    const xumm = getXummInstance();
    if (uuidRef.current && xumm?.payload) await xumm.payload.cancel(uuidRef.current).catch(() => {});
    setState({ status: "idle", created: null, resolved: null, txid: null, error: null });
  }, []);

  const reset = useCallback(() => setState({ status: "idle", created: null, resolved: null, txid: null, error: null }), []);

  return { ...state, sign, cancel, reset };
}
