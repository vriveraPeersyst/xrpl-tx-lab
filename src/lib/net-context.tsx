"use client";
import { createContext, useContext, type ReactNode } from "react";
import { getNetwork, DEFAULT_NETWORK, type Network } from "@/lib/networks";

const Ctx = createContext<string>(DEFAULT_NETWORK);

export function NetworkProvider({ id, children }: { id: string; children: ReactNode }) {
  return <Ctx.Provider value={id}>{children}</Ctx.Provider>;
}

/** Current network id (from the /[net] route segment). */
export function useNetId(): string {
  return useContext(Ctx);
}
export function useNetwork(): Network {
  return getNetwork(useContext(Ctx));
}
/** Prefixes an internal path with the current network segment. */
export function useHref() {
  const id = useContext(Ctx);
  return (href: string) => (href.startsWith("/") && !href.startsWith(`/${id}/`) ? `/${id}${href === "/" ? "" : href}` : href);
}
