import Link from "next/link";
import { protocol, testnet, testnetLedgerEntryNames } from "@/lib/protocol";
import { RESERVE_RULES, reserveXrp, formatXrp, BASE_FEE_DROPS, LOAD_FACTOR, CURRENT_MIN_FEE_DROPS } from "@/lib/reserves";
import { Stat } from "@/components/protocol";
import { ReserveCalculator } from "@/components/ReserveCalculator";

export const metadata = { title: "Reservas y fees" };

export default function ReservesPage() {
  const names = testnetLedgerEntryNames();
  const evidence = (obj: string) => protocol.transactions.filter((t) => (t.transactor?.ownerCountCalls?.length ?? 0) > 0 && (TX_TO_OBJ[t.name] ?? []).includes(obj)).map((t) => t.name);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">Cuánto XRP cuesta cada cosa</h1>
        <p className="max-w-3xl text-muted">La XRPL exige a cada cuenta mantener bloqueada una <b>reserva base</b> más una <b>reserva incremental</b> por cada objeto que posee. Ese XRP no se destruye: se libera al borrar el objeto. Los <b>fees</b> de transacción sí se destruyen. Valores vivos de la testnet (objeto <Link href="/objects/FeeSettings" className="link">FeeSettings</Link>).</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reserva base" value={formatXrp(testnet.reserves.baseXrp)} sub="para que la cuenta exista" />
        <Stat label="Reserva por objeto" value={formatXrp(testnet.reserves.incXrp)} sub="cada unidad de owner reserve" />
        <Stat label="Fee base" value={`${BASE_FEE_DROPS} drops`} sub={`${testnet.reserves.baseFeeXrp} XRP por transacción simple`} />
        <Stat label="Fee mínimo ahora" value={`${CURRENT_MIN_FEE_DROPS} drops`} sub={`load_factor ${LOAD_FACTOR}/256 (fee escalation)`} />
      </section>
      <ReserveCalculator />
      <section>
        <h2 className="mb-2 display-md">Reserva por objeto del ledger</h2>
        <table className="tbl">
          <thead><tr><th>Objeto</th><th>Unidades</th><th>En testnet</th><th>Quién la paga</th><th>Detalle</th><th>Evidencia en el código</th></tr></thead>
          <tbody>
            {names.map((n) => {
              const r = RESERVE_RULES[n];
              const ev = evidence(n);
              return (
                <tr key={n}>
                  <td><Link href={`/objects/${n}`} className="font-mono font-medium hover:underline">{n}</Link></td>
                  <td className="font-mono">{r ? `${r.units}${r.variable ? "+" : ""}` : "?"}</td>
                  <td className="font-mono">{r ? formatXrp(reserveXrp(r.units)) : "?"}</td>
                  <td className="text-xs">{r?.owner}</td>
                  <td className="text-xs text-muted">{r?.note}</td>
                  <td className="text-xs">{ev.map((t) => <Link key={t} href={`/tx/${t}#coste`} className="mr-1 font-mono hover:underline">{t}</Link>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="space-y-2">
        <h2 className="display-md">Fees de transacción</h2>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li><b>Fee base</b>: {BASE_FEE_DROPS} drops. Se multiplica por el <i>load factor</i> del servidor cuando hay carga (fee escalation). Cuanto más pagas, antes entra en el ledger si la cola está llena.</li>
          <li><b>Multifirma</b>: fee base × (1 + número de firmas en <code>Signers</code>). Código: <code>Transactor::calculateBaseFee</code>.</li>
          <li><b>Owner reserve como fee</b> ({formatXrp(testnet.reserves.incXrp)}): {protocol.transactions.filter((t) => t.transactor?.ownerReserveFee).map((t) => <Link key={t.name} href={`/tx/${t.name}#coste`} className="link mr-1 font-mono">{t.name}</Link>)} — antispam: se destruye.</li>
          <li><b>EscrowFinish con fulfillment</b>: fee base × (33 + ⌈bytes/16⌉).</li>
          <li><b>Batch</b>: fee base × (2 + n inner) + fees de firmantes + suma de fees base de cada inner.</li>
          <li><b>Memos</b>: no cambian el fee base en xrpld, pero el tamaño total de la transacción está limitado (memo ≤ 1 KB) y algunos servidores cobran por byte al retransmitir.</li>
          <li><b>Transactores con fee propio</b> (<code>calculateBaseFee</code>): {protocol.transactions.filter((t) => t.transactor?.customBaseFee).map((t) => <Link key={t.name} href={`/tx/${t.name}#coste`} className="link mr-1 font-mono">{t.name}</Link>)}</li>
        </ul>
      </section>
    </div>
  );
}

/** Inverso de TX_CREATES para localizar evidencia (transactores que llaman a increaseOwnerCount). */
const TX_TO_OBJ: Record<string, string[]> = {
  EscrowCreate: ["Escrow"], OfferCreate: ["Offer"], TicketCreate: ["Ticket"], SignerListSet: ["SignerList"], PaymentChannelCreate: ["PayChannel"], CheckCreate: ["Check"], DepositPreauth: ["DepositPreauth"], TrustSet: ["RippleState"], XChainCreateClaimID: ["XChainOwnedClaimID"], XChainAccountCreateCommit: ["XChainOwnedCreateAccountClaimID"], XChainCreateBridge: ["Bridge"], DIDSet: ["DID"], OracleSet: ["Oracle"], MPTokenIssuanceCreate: ["MPTokenIssuance"], MPTokenAuthorize: ["MPToken"], CredentialCreate: ["Credential"], CredentialAccept: ["Credential"], PermissionedDomainSet: ["PermissionedDomain"], DelegateSet: ["Delegate"], VaultCreate: ["Vault"], LoanBrokerSet: ["LoanBroker"], LoanSet: ["Loan"], SponsorshipSet: ["Sponsorship"], NFTokenMint: ["NFTokenPage"], NFTokenCreateOffer: ["NFTokenOffer"], AMMCreate: ["AMM"],
};
