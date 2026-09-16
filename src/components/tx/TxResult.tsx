"use client";
import Link from "next/link";
import { useState } from "react";
import { protocol, TER_CATEGORIES } from "@/lib/protocol";
import { TESTNET_EXPLORER } from "@/lib/xrpl/rpc";

interface AffectedNode { CreatedNode?: { LedgerEntryType: string; LedgerIndex: string; NewFields?: Record<string, unknown> }; ModifiedNode?: { LedgerEntryType: string; LedgerIndex: string; FinalFields?: Record<string, unknown>; PreviousFields?: Record<string, unknown> }; DeletedNode?: { LedgerEntryType: string; LedgerIndex: string; FinalFields?: Record<string, unknown> } }

export function TxResult({ engineResult, message, meta, txJson, validated, hash }: { engineResult: string; message?: string; meta?: Record<string, unknown>; txJson?: Record<string, unknown>; validated?: boolean; hash?: string }) {
  const [open, setOpen] = useState(false);
  const code = protocol.results.find((r) => r.code === engineResult);
  const cat = TER_CATEGORIES[engineResult.slice(0, 3)];
  const nodes = (meta?.AffectedNodes as AffectedNode[] | undefined) ?? [];
  const ok = engineResult === "tesSUCCESS";
  return (
    <div className="space-y-2 text-sm">
      <div className={`notice ${ok ? "notice-ok" : cat?.applied ? "notice-warn" : "notice-error"}`}>
        <Link href={`/results#${engineResult}`} className="font-mono font-semibold hover:underline">{engineResult}</Link>
        {cat && <span className="ml-2 text-xs text-muted">{cat.label}</span>}
        <p className="text-muted">{code?.description ?? message}</p>
        {cat && !ok && <p className="text-xs text-muted">{cat.meaning}</p>}
        {validated && <p className="text-xs">Validated in ledger{typeof txJson?.ledger_index === "number" ? ` ${txJson.ledger_index}` : ""}. {hash && <a className="link" href={`${TESTNET_EXPLORER}/transactions/${hash}`} target="_blank" rel="noreferrer">View in the explorer</a>}</p>}
      </div>
      {nodes.length > 0 && (
        <div>
          <p className="mb-1 font-semibold">Affected ledger objects</p>
          <ul className="space-y-1">
            {nodes.map((n, i) => {
              const kind = n.CreatedNode ? "created" : n.ModifiedNode ? "modified" : "deleted";
              const node = (n.CreatedNode ?? n.ModifiedNode ?? n.DeletedNode)!;
              const changed = n.ModifiedNode?.PreviousFields ? Object.keys(n.ModifiedNode.PreviousFields) : n.CreatedNode?.NewFields ? Object.keys(n.CreatedNode.NewFields) : [];
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-2">
                  <span className={`rounded px-1.5 text-xs ${kind === "created" ? "bg-success/20" : kind === "deleted" ? "bg-danger/20" : "bg-surface-2"}`}>{kind}</span>
                  <Link href={`/objects/${node.LedgerEntryType}`} className="font-mono hover:underline">{node.LedgerEntryType}</Link>
                  <span className="font-mono text-xs text-muted">{node.LedgerIndex.slice(0, 12)}…</span>
                  {changed.length > 0 && <span className="text-xs text-muted">{changed.join(", ")}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {meta && (
        <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-xs text-muted">Full metadata</summary>
          <pre className="code-block mt-2 max-h-80">{JSON.stringify(meta, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
