"use client";
import { usePathname, useRouter } from "next/navigation";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { useNetId } from "@/lib/net-context";

/** Network selector: swaps the first path segment and keeps the rest of the URL. */
export function NetworkSwitcher({ available }: { available: string[] }) {
  const id = useNetId();
  const pathname = usePathname();
  const router = useRouter();
  const change = (next: string) => {
    const parts = pathname.split("/");
    if (parts.length > 1 && isNetworkId(parts[1])) parts[1] = next;
    else parts.splice(1, 0, next);
    router.push(parts.join("/") || `/${next}`);
  };
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="hidden sm:inline">Network</span>
      <select className="input !w-auto !py-1 !text-xs font-medium" value={id} onChange={(e) => change(e.target.value)} aria-label="Network">
        {NETWORKS.map((n) => <option key={n.id} value={n.id} disabled={!available.includes(n.id)}>{n.label}{!available.includes(n.id) ? " (no data)" : ""}</option>)}
      </select>
    </label>
  );
}
