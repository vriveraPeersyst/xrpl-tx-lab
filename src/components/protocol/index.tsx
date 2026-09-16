import NLink from "@/components/NLink";
import { TER_CATEGORIES, type MergedField, type NetData, type SnapshotAmendment } from "@/lib/protocol";

export function AmendmentBadge({ d, name, showName = true }: { d: NetData; name: string; showName?: boolean }) {
  const s = d.amendmentStatus(name);
  const f = d.getFeature(name);
  const state = !s ? (f ? "source only" : "unknown") : s.enabled ? "active" : s.vetoed ? "vetoed" : s.majority ? "majority" : s.supported ? "voting" : "unsupported";
  const cls = state === "active" ? "bg-accent-soft text-accent-ink" : state === "majority" ? "bg-[#edf4ff] text-[#0a4dc0]" : state === "voting" ? "bg-[#dbf15e] text-black" : state === "vetoed" ? "bg-[#fdece7] text-[#a22514]" : "bg-surface-2 text-muted";
  return (
    <NLink href={`/amendments/${name}`} className={`badge ${cls} hover:opacity-80`} title={`Amendment ${name}: ${state} on ${d.network.label}`}>
      {showName && <span className="font-mono">{name}</span>}<span className={showName ? "ml-1 opacity-80" : ""}>{state}</span>
    </NLink>
  );
}

export function amendmentState(s?: SnapshotAmendment): { label: string; cls: string } {
  if (!s) return { label: "source only", cls: "bg-surface-2 text-muted" };
  if (s.enabled) return { label: "active", cls: "bg-accent-soft text-accent-ink" };
  if (s.vetoed) return { label: "vetoed", cls: "bg-[#fdece7] text-[#a22514]" };
  if (s.majority) return { label: "majority reached", cls: "bg-[#edf4ff] text-[#0a4dc0]" };
  if (s.supported) return { label: "voting", cls: "bg-[#dbf15e] text-black" };
  return { label: "unsupported", cls: "bg-surface-2 text-muted" };
}

export function TerBadge({ d, code }: { d: NetData; code: string }) {
  const r = d.getResult(code);
  const cat = TER_CATEGORIES[code.slice(0, 3)];
  const cls = code === "tesSUCCESS" ? "bg-accent-soft text-accent-ink" : code.startsWith("tec") ? "bg-[#dbf15e] text-black" : "bg-[#fdece7] text-[#a22514]";
  return <NLink href={`/results#${code}`} className={`badge font-mono ${cls} hover:opacity-80`} title={`${r?.description ?? ""} (${cat?.label ?? ""})`}>{code}</NLink>;
}

export function FieldsTable({ fields, hints, scope }: { fields: MergedField[]; hints?: Record<string, string>; scope?: string }) {
  return (
    <table className="tbl">
      <thead><tr><th>Field</th><th>Type</th><th>Optionality</th><th>Notes</th></tr></thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.name} className={!f.inTestnet ? "opacity-60" : ""}>
            <td><NLink href={`/fields/${f.name}`} className="font-mono hover:underline">{f.name}</NLink></td>
            <td><NLink href={`/fields#${f.type}`} className="font-mono text-xs text-muted hover:underline">{f.type}</NLink></td>
            <td>{f.optionality === "required" ? <span className="text-danger">required</span> : f.optionality === "default" ? <span title="If omitted, it is serialized with its default value">default</span> : "optional"}</td>
            <td className="text-xs text-muted">
              {f.mptSupported && <span className="badge mr-1 bg-accent-soft text-accent-ink">supports MPT</span>}
              {!f.inTestnet && <span className="badge mr-1 bg-surface-2">source only (not yet on this network)</span>}
              {f.inTestnet && !f.inSource && <span className="badge mr-1 bg-surface-2">network only</span>}
              {hints?.[f.name]}
              {scope === "common" && COMMON_HINTS[f.name]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const COMMON_HINTS: Record<string, string> = {
  TransactionType: "Type name.",
  Account: "Account that sends and pays the fee.",
  Fee: "In drops. Xaman calculates it; it rises during load spikes (fee escalation).",
  Sequence: "Account's sequence number (or 0 if you use TicketSequence).",
  Flags: "Flag bits: universal + type-specific.",
  SourceTag: "Arbitrary tag from the source (e.g. exchanges).",
  LastLedgerSequence: "Last ledger it can be included in; past that it fails definitively. Highly recommended.",
  AccountTxnID: "Requires the account's last tx to have this hash (chaining).",
  Memos: "Arbitrary data (MemoType/MemoData/MemoFormat in hex). Costs extra fee per byte.",
  SigningPubKey: "Key used to sign (empty in multisign).",
  TicketSequence: "Uses a Ticket instead of the Sequence.",
  TxnSignature: "Signature.",
  Signers: "Signatures from the signer list (multisign).",
  NetworkID: "Required on networks with ID > 1024 (not on testnet, id 1).",
  Delegate: "Delegated account that sends on behalf of Account (PermissionDelegation).",
  Sponsor: "Account sponsoring the fee/reserve (Sponsor amendment).",
  SponsorFlags: "What the sponsor covers (fee, reserve).",
  SponsorSignature: "Sponsor's signature.",
  PreviousTxnID: "Obsolete (emulate027).",
  OperationLimit: "Obsolete.",
};

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card flex flex-col justify-between">
      <div className="text-xs text-muted">{label}</div>
      <div className="datapoint mt-4" style={{ fontSize: "1.9rem" }}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
