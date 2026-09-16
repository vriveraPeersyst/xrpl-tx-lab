import Link from "next/link";
import { amendmentStatus, getFeature, getResult, TER_CATEGORIES, type MergedField, type TestnetAmendment } from "@/lib/protocol";

export function AmendmentBadge({ name, showName = true }: { name: string; showName?: boolean }) {
  const s = amendmentStatus(name);
  const f = getFeature(name);
  const state = !s ? (f ? "solo en fuente" : "desconocido") : s.enabled ? "activo" : s.vetoed ? "vetado" : s.majority ? "mayoría" : s.supported ? "en votación" : "no soportado";
  const cls = state === "activo" ? "bg-success/15 text-success" : state === "mayoría" ? "bg-accent-soft text-accent" : state === "en votación" ? "bg-warning/15 text-warning" : "bg-surface-2 text-muted";
  return (
    <Link href={`/amendments/${name}`} className={`badge ${cls} hover:opacity-80`} title={`Amendment ${name}: ${state} en testnet`}>
      {showName && <span className="font-mono">{name}</span>}<span className={showName ? "ml-1 opacity-80" : ""}>{state}</span>
    </Link>
  );
}

export function amendmentState(s?: TestnetAmendment): { label: string; cls: string } {
  if (!s) return { label: "solo en fuente", cls: "bg-surface-2 text-muted" };
  if (s.enabled) return { label: "activo", cls: "bg-success/15 text-success" };
  if (s.vetoed) return { label: "vetado", cls: "bg-danger/15 text-danger" };
  if (s.majority) return { label: "mayoría alcanzada", cls: "bg-accent-soft text-accent" };
  if (s.supported) return { label: "en votación", cls: "bg-warning/15 text-warning" };
  return { label: "no soportado", cls: "bg-surface-2 text-muted" };
}

export function TerBadge({ code }: { code: string }) {
  const r = getResult(code);
  const cat = TER_CATEGORIES[code.slice(0, 3)];
  const cls = code === "tesSUCCESS" ? "bg-success/15 text-success" : code.startsWith("tec") ? "bg-warning/15 text-warning" : "bg-danger/10 text-danger";
  return <Link href={`/results#${code}`} className={`badge font-mono ${cls} hover:opacity-80`} title={`${r?.description ?? ""} (${cat?.label ?? ""})`}>{code}</Link>;
}

export function FieldsTable({ fields, hints, scope }: { fields: MergedField[]; hints?: Record<string, string>; scope?: string }) {
  return (
    <table className="tbl">
      <thead><tr><th>Campo</th><th>Tipo</th><th>Opcionalidad</th><th>Notas</th></tr></thead>
      <tbody>
        {fields.map((f) => (
          <tr key={f.name} className={!f.inTestnet ? "opacity-60" : ""}>
            <td><Link href={`/fields/${f.name}`} className="font-mono hover:underline">{f.name}</Link></td>
            <td><Link href={`/fields#${f.type}`} className="font-mono text-xs text-muted hover:underline">{f.type}</Link></td>
            <td>{f.optionality === "required" ? <span className="text-danger">obligatorio</span> : f.optionality === "default" ? <span title="Si se omite, se serializa con su valor por defecto">por defecto</span> : "opcional"}</td>
            <td className="text-xs text-muted">
              {f.mptSupported && <span className="badge mr-1 bg-accent-soft text-accent">admite MPT</span>}
              {!f.inTestnet && <span className="badge mr-1 bg-surface-2">solo en fuente (aún no en testnet)</span>}
              {f.inTestnet && !f.inSource && <span className="badge mr-1 bg-surface-2">solo en testnet</span>}
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
  TransactionType: "Nombre del tipo.",
  Account: "Cuenta que envía y paga el fee.",
  Fee: "En drops. Xaman lo calcula; sube en momentos de carga (fee escalation).",
  Sequence: "Número de secuencia de la cuenta (o 0 si usas TicketSequence).",
  Flags: "Bits de flags: universales + específicos del tipo.",
  SourceTag: "Etiqueta arbitraria del origen (p. ej. exchanges).",
  LastLedgerSequence: "Último ledger en que puede incluirse; si pasa, falla definitivamente. Muy recomendable.",
  AccountTxnID: "Exige que la última tx de la cuenta tenga este hash (encadenamiento).",
  Memos: "Datos arbitrarios (MemoType/MemoData/MemoFormat en hex). Cuestan fee extra por byte.",
  SigningPubKey: "Clave con la que se firma (vacía en multifirma).",
  TicketSequence: "Usa un Ticket en vez del Sequence.",
  TxnSignature: "Firma.",
  Signers: "Firmas de la lista de firmantes (multifirma).",
  NetworkID: "Obligatorio en redes con ID > 1024 (no en testnet, id 1).",
  Delegate: "Cuenta delegada que envía en nombre de Account (PermissionDelegation).",
  Sponsor: "Cuenta patrocinadora del fee/reserva (amendment Sponsor).",
  SponsorFlags: "Qué patrocina el sponsor (fee, reserva).",
  SponsorSignature: "Firma del sponsor.",
  PreviousTxnID: "Obsoleto (emulate027).",
  OperationLimit: "Obsoleto.",
};

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
