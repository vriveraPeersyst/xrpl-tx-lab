"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getXumm, XAMAN_API_KEY, type XummInstance } from "./sdk";

interface XamanSession {
  ready: boolean;
  configured: boolean;
  account: string | null;
  network: string | null;
  connecting: boolean;
  error: string | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sdk: XummInstance | null;
}

const Ctx = createContext<XamanSession | null>(null);

export function XamanProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sdkRef = useRef<XummInstance | null>(null);
  const [sdk, setSdk] = useState<XummInstance | null>(null);
  const configured = Boolean(XAMAN_API_KEY);

  const sync = useCallback(async (xumm: XummInstance) => {
    try {
      const acc = await xumm.user.account;
      setAccount(acc ?? null);
      if (acc) setNetwork((await xumm.user.networkType) ?? null);
      else setNetwork(null);
    } catch {
      setAccount(null);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let alive = true;
    getXumm(XAMAN_API_KEY)
      .then((xumm) => {
        if (!alive) return;
        sdkRef.current = xumm;
        setSdk(xumm);
        setReady(true);
        xumm.on("success", () => void sync(xumm));
        xumm.on("retrieved", () => void sync(xumm));
        xumm.on("logout", () => { setAccount(null); setNetwork(null); });
        xumm.on("error", (e) => setError(e instanceof Error ? e.message : String(e)));
        void sync(xumm); // restaura una sesión PKCE previa
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => { alive = false; };
  }, [configured, sync]);

  const connect = useCallback(async () => {
    const xumm = sdkRef.current ?? (await getXumm(XAMAN_API_KEY));
    setConnecting(true);
    setError(null);
    try {
      await xumm.authorize();
      await sync(xumm);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, [sync]);

  const disconnect = useCallback(async () => {
    try { await sdkRef.current?.logout(); } finally { setAccount(null); setNetwork(null); }
  }, []);

  const value = useMemo<XamanSession>(() => ({ ready, configured, account, network, connecting, error, connect, disconnect, sdk }), [ready, configured, account, network, connecting, error, connect, disconnect, sdk]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useXaman(): XamanSession {
  const v = useContext(Ctx);
  if (!v) throw new Error("useXaman fuera de XamanProvider");
  return v;
}
