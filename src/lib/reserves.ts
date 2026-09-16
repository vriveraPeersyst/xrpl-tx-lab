/**
 * XRP cost of every ledger object (owner reserve) and of every transaction (fee), using the
 * live values of the selected network (snapshot: reserve_base, reserve_inc, base_fee).
 *
 * Reserve units per object are cross-checked against the increaseOwnerCount/decreaseOwnerCount
 * calls in the transactors (protocol → transactor.ownerCountCalls) and xrpl.org/docs/concepts/accounts/reserves.
 */
import type { NetData, Snapshot } from "@/lib/protocol";

export interface ReserveRule {
  /** Owner reserve units it consumes (reserve_inc × units). */
  units: number;
  /** Who pays the reserve. */
  owner: string;
  /** Nuances (when it counts, when it doesn't, special cases). */
  note: string;
  /** If the unit depends on state (e.g. RippleState). */
  variable?: boolean;
}

export const RESERVE_RULES: Record<string, ReserveRule> = {
  AccountRoot: { units: 0, owner: "the account itself", note: "Consumes no owner reserve, but the account must always keep the base reserve (reserve_base) plus one unit per object it owns. That XRP cannot be spent or sent." },
  RippleState: { units: 1, owner: "each side holding it in a non-default state", variable: true, note: "A trust line counts 1 for each account whose side is not in the default state (limit 0, no flags, zero balance from its perspective). If only you set a limit, you pay it; if both accounts use it, both pay. When both sides return to default the object deletes itself." },
  Offer: { units: 1, owner: "the account that creates it", note: "Each live offer in the book counts 1. Released when fully executed, cancelled or unfunded (cleaned up automatically)." },
  Escrow: { units: 1, owner: "the account that creates it", note: "Counts 1 while it exists. Released on EscrowFinish or EscrowCancel. With TokenEscrow, a token escrow also adds 1 to the issuer if it creates an auxiliary trust line." },
  PayChannel: { units: 1, owner: "the account that opens it", note: "Counts 1 until it is closed and deleted (PaymentChannelClaim with tfClose after SettleDelay, or CancelAfter)." },
  Check: { units: 1, owner: "the sender", note: "Counts 1 until it is cashed (CheckCash), cancelled (CheckCancel) or expires and someone cancels it." },
  DepositPreauth: { units: 1, owner: "the preauthorizing account", note: "Each preauthorization (by account or by credential set) counts 1." },
  SignerList: { units: 1, owner: "the multisig account", note: "With MultiSignReserve active it counts 1 regardless of the number of signers (previously: 3 + n)." },
  Ticket: { units: 1, owner: "the account that creates them", note: "Each ticket counts 1 until it is used (TicketSequence) and deleted. TicketCreate requires reserve for all requested tickets." },
  NFTokenPage: { units: 1, owner: "the NFT owner", note: "NFTs do not count one by one: they are grouped in pages of up to 32 and each page counts 1. Minting the first NFT creates the first page." },
  NFTokenOffer: { units: 1, owner: "whoever creates the offer", note: "Each NFT buy or sell offer counts 1 until accepted, cancelled or expired (NFTokenCancelOffer)." },
  DID: { units: 1, owner: "the account", note: "A single DID object per account; counts 1. Released with DIDDelete." },
  Oracle: { units: 1, owner: "the oracle account", variable: true, note: "1 with up to 5 price pairs, 2 with more (maximum 10). OracleSet re-evaluates the reserve on update." },
  Credential: { units: 1, owner: "the issuer until accepted; then the subject", note: "On creation the issuer pays it; when the subject accepts (CredentialAccept) the reserve moves to the subject." },
  PermissionedDomain: { units: 1, owner: "the domain owner", note: "Counts 1 per domain." },
  Delegate: { units: 1, owner: "the delegating account", note: "Counts 1 per delegated account (DelegateSet). Released when permissions are emptied." },
  MPTokenIssuance: { units: 1, owner: "the issuer", note: "Counts 1 per issuance. Released with MPTokenIssuanceDestroy (only if there are no holders)." },
  MPToken: { units: 1, owner: "the holder", note: "Each MPToken (an account's holding of an MPT) counts 1 for the holder. MPTokenAuthorize with tfMPTUnauthorize deletes it if the balance is 0." },
  AMM: { units: 0, owner: "nobody (pseudo-account)", note: "The AMM lives in a pseudo-account with no reserve of its own, but AMMCreate charges the incremental owner reserve as a fee (burned), and your LP tokens create a trust line that does count 1." },
  Vault: { units: 2, owner: "the vault owner", note: "VaultCreate increases the owner count by 2 (the Vault object and its pseudo-account/share MPT)." },
  LoanBroker: { units: 2, owner: "the broker owner", note: "LoanBrokerSet creates the broker with 2 units (broker and its pseudo-account)." },
  Loan: { units: 1, owner: "the broker (owner)", note: "Each active loan counts 1 on the LoanBroker." },
  Sponsorship: { units: 1, owner: "the sponsored account", note: "Object recording a sponsorship relationship; counts 1." },
  Bridge: { units: 1, owner: "the door account", note: "XChainCreateBridge counts 1 on the door account." },
  XChainOwnedClaimID: { units: 1, owner: "whoever creates it", note: "Counts 1 until the claim is consumed (XChainClaim) or the reward is claimed." },
  XChainOwnedCreateAccountClaimID: { units: 1, owner: "the door account", note: "Counts 1 until the attestations complete." },
  DirectoryNode: { units: 0, owner: "nobody", note: "Directories (owner directory, order books) count no reserve: they are internal structures the ledger creates and deletes on its own." },
  Amendments: { units: 0, owner: "the network", note: "Singleton system object." },
  FeeSettings: { units: 0, owner: "the network", note: "Singleton system object; holds the current reserve and fee values." },
  LedgerHashes: { units: 0, owner: "the network", note: "System object." },
  NegativeUNL: { units: 0, owner: "the network", note: "Singleton system object." },
};

export function reserveXrp(snap: Snapshot, units: number): number {
  return units * snap.reserves.incXrp;
}
export function formatXrp(x: number): string {
  return `${x.toLocaleString("en-US", { maximumFractionDigits: 6 })} XRP`;
}
/** Total reserve of an account with N objects. */
export function accountReserveXrp(snap: Snapshot, ownerCount: number): number {
  return snap.reserves.baseXrp + ownerCount * snap.reserves.incXrp;
}
export function feeConstants(snap: Snapshot) {
  const baseFeeDrops = Math.round(snap.reserves.baseFeeXrp * 1_000_000);
  const loadFactor = snap.reserves.loadFactor;
  return { baseFeeDrops, loadFactor, currentMinFeeDrops: Math.ceil((baseFeeDrops * loadFactor) / 256) };
}

export interface FeeRule { label: string; drops?: number; xrp?: number; note: string }

/** Fee rules of a transaction, read from the transactor when there is evidence. */
export function txFeeRules(d: NetData, name: string): FeeRule[] {
  const snap = d.snapshot;
  const { baseFeeDrops, loadFactor, currentMinFeeDrops } = feeConstants(snap);
  const t = d.getTx(name);
  const rules: FeeRule[] = [{ label: "Base fee", drops: baseFeeDrops, note: `Ledger reference (base_fee). Under load, the minimum rises due to fee escalation (currently load_factor ${loadFactor}/256 → ${currentMinFeeDrops} drops). Xaman proposes a suitable fee.` }];
  if (t?.transactor?.ownerReserveFee) rules.push({ label: "Owner reserve as fee", xrp: snap.reserves.incXrp, note: "This type charges the incremental owner reserve as a fee (destroyed). An anti-spam measure: AccountDelete, AMMCreate and LedgerStateFix." });
  if (name === "EscrowFinish") rules.push({ label: "Fulfillment", note: "With Condition/Fulfillment: base fee × (33 + ⌈fulfillment bytes / 16⌉)." });
  if (name === "Batch") rules.push({ label: "Batch", note: "base fee × (2 + number of inner txs) + signer fees + the sum of the base fees of each inner tx." });
  if (name === "SetRegularKey") rules.push({ label: "Free once", drops: 0, note: "If the master key is disabled and the account has no RegularKey or SignerList, the fee can be 0 (account recovery)." });
  if (t?.transactor?.customBaseFee && !["EscrowFinish", "Batch", "SetRegularKey", "AccountDelete", "AMMCreate", "LedgerStateFix"].includes(name)) rules.push({ label: "Custom fee", note: `The transactor defines calculateBaseFee: see ${t.transactor.file}.` });
  rules.push({ label: "Multisign", note: "Each signature in the signer list adds the base fee once." });
  return rules;
}

/** Objects a transaction can create (and therefore the reserve it locks). */
export const TX_CREATES: Record<string, string[]> = {
  Payment: ["AccountRoot", "RippleState"],
  TrustSet: ["RippleState"],
  OfferCreate: ["Offer", "RippleState"],
  EscrowCreate: ["Escrow"],
  PaymentChannelCreate: ["PayChannel"],
  CheckCreate: ["Check"],
  CheckCash: ["RippleState"],
  DepositPreauth: ["DepositPreauth"],
  SignerListSet: ["SignerList"],
  TicketCreate: ["Ticket"],
  NFTokenMint: ["NFTokenPage", "NFTokenOffer"],
  NFTokenCreateOffer: ["NFTokenOffer"],
  NFTokenAcceptOffer: ["NFTokenPage"],
  DIDSet: ["DID"],
  OracleSet: ["Oracle"],
  CredentialCreate: ["Credential"],
  PermissionedDomainSet: ["PermissionedDomain"],
  DelegateSet: ["Delegate"],
  MPTokenIssuanceCreate: ["MPTokenIssuance"],
  MPTokenAuthorize: ["MPToken"],
  AMMCreate: ["AMM", "RippleState"],
  AMMDeposit: ["RippleState"],
  VaultCreate: ["Vault"],
  VaultDeposit: ["MPToken"],
  LoanBrokerSet: ["LoanBroker"],
  LoanSet: ["Loan"],
  SponsorshipSet: ["Sponsorship"],
  XChainCreateBridge: ["Bridge"],
  XChainCreateClaimID: ["XChainOwnedClaimID"],
  XChainAccountCreateCommit: ["XChainOwnedCreateAccountClaimID"],
};
