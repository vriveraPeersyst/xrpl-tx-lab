import Link from "@/components/NLink";
import { getNet } from "@/lib/protocol";
import { RESERVE_RULES, reserveXrp, formatXrp, feeConstants } from "@/lib/reserves";
import { Stat } from "@/components/protocol";
import { ReserveCalculator } from "@/components/ReserveCalculator";

export const metadata = { title: "Reserves & fees" };

export default async function ReservesPage({ params }: { params: Promise<{ net: string }> }) {
  const { net } = await params;
  const d = getNet(net);
  const snap = d.snapshot;
  const { baseFeeDrops, loadFactor, currentMinFeeDrops } = feeConstants(snap);
  const names = d.ledgerEntryNames();
  const evidence = (obj: string) => d.protocol.transactions.filter((t) => (t.transactor?.ownerCountCalls?.length ?? 0) > 0 && (TX_TO_OBJ[t.name] ?? []).includes(obj)).map((t) => t.name);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-lg">How much XRP everything costs</h1>
        <p className="max-w-3xl text-muted">The XRPL requires every account to keep a <b>base reserve</b> locked plus an <b>incremental reserve</b> for each object it owns. That XRP is not destroyed: it&apos;s released when the object is deleted. Transaction <b>fees</b> are destroyed. Live values from {d.network.label} (<Link href="/objects/FeeSettings" className="link">FeeSettings</Link> object).</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Base reserve" value={formatXrp(snap.reserves.baseXrp)} sub="for the account to exist" />
        <Stat label="Reserve per object" value={formatXrp(snap.reserves.incXrp)} sub="each owner reserve unit" />
        <Stat label="Base fee" value={`${baseFeeDrops} drops`} sub={`${snap.reserves.baseFeeXrp} XRP per simple transaction`} />
        <Stat label="Minimum fee now" value={`${currentMinFeeDrops} drops`} sub={`load_factor ${loadFactor}/256 (fee escalation)`} />
      </section>
      <ReserveCalculator snapshot={snap} />
      <section>
        <h2 className="mb-2 display-md">Reserve per ledger object</h2>
        <table className="tbl">
          <thead><tr><th>Object</th><th>Units</th><th>On {d.network.label}</th><th>Who pays it</th><th>Detail</th><th>Evidence in the code</th></tr></thead>
          <tbody>
            {names.map((n) => {
              const r = RESERVE_RULES[n];
              const ev = evidence(n);
              return (
                <tr key={n}>
                  <td><Link href={`/objects/${n}`} className="font-mono font-medium hover:underline">{n}</Link></td>
                  <td className="font-mono">{r ? `${r.units}${r.variable ? "+" : ""}` : "?"}</td>
                  <td className="font-mono">{r ? formatXrp(reserveXrp(snap, r.units)) : "?"}</td>
                  <td className="text-xs">{r?.owner}</td>
                  <td className="text-xs text-muted">{r?.note}</td>
                  <td className="text-xs">{ev.map((t) => <Link key={t} href={`/tx/${t}#cost`} className="mr-1 font-mono hover:underline">{t}</Link>)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="space-y-2">
        <h2 className="display-md">Transaction fees</h2>
        <ul className="ml-5 list-disc space-y-1 text-sm">
          <li><b>Base fee</b>: {baseFeeDrops} drops. It&apos;s multiplied by the server&apos;s <i>load factor</i> when there&apos;s load (fee escalation). The more you pay, the sooner it enters the ledger if the queue is full.</li>
          <li><b>Multisign</b>: base fee × (1 + number of signatures in <code>Signers</code>). Code: <code>Transactor::calculateBaseFee</code>.</li>
          <li><b>Owner reserve as fee</b> ({formatXrp(snap.reserves.incXrp)}): {d.protocol.transactions.filter((t) => t.transactor?.ownerReserveFee).map((t) => <Link key={t.name} href={`/tx/${t.name}#cost`} className="link mr-1 font-mono">{t.name}</Link>)} — antispam: it&apos;s destroyed.</li>
          <li><b>EscrowFinish with fulfillment</b>: base fee × (33 + ⌈bytes/16⌉).</li>
          <li><b>Batch</b>: base fee × (2 + n inner) + signer fees + sum of each inner&apos;s base fee.</li>
          <li><b>Memos</b>: don&apos;t change the base fee in xrpld, but the total transaction size is limited (memo ≤ 1 KB) and some servers charge per byte when relaying.</li>
          <li><b>Transactors with their own fee</b> (<code>calculateBaseFee</code>): {d.protocol.transactions.filter((t) => t.transactor?.customBaseFee).map((t) => <Link key={t.name} href={`/tx/${t.name}#cost`} className="link mr-1 font-mono">{t.name}</Link>)}</li>
        </ul>
      </section>
    </div>
  );
}

/** Inverse of TX_CREATES to locate evidence (transactors that call increaseOwnerCount). */
const TX_TO_OBJ: Record<string, string[]> = {
  EscrowCreate: ["Escrow"], OfferCreate: ["Offer"], TicketCreate: ["Ticket"], SignerListSet: ["SignerList"], PaymentChannelCreate: ["PayChannel"], CheckCreate: ["Check"], DepositPreauth: ["DepositPreauth"], TrustSet: ["RippleState"], XChainCreateClaimID: ["XChainOwnedClaimID"], XChainAccountCreateCommit: ["XChainOwnedCreateAccountClaimID"], XChainCreateBridge: ["Bridge"], DIDSet: ["DID"], OracleSet: ["Oracle"], MPTokenIssuanceCreate: ["MPTokenIssuance"], MPTokenAuthorize: ["MPToken"], CredentialCreate: ["Credential"], CredentialAccept: ["Credential"], PermissionedDomainSet: ["PermissionedDomain"], DelegateSet: ["Delegate"], VaultCreate: ["Vault"], LoanBrokerSet: ["LoanBroker"], LoanSet: ["Loan"], SponsorshipSet: ["Sponsorship"], NFTokenMint: ["NFTokenPage"], NFTokenCreateOffer: ["NFTokenOffer"], AMMCreate: ["AMM"],
};
