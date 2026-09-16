/**
 * XRP cost of each ledger object (owner reserve) and each transaction (fee),
 * with the live testnet values (testnet.json: reserve_base, reserve_inc, base_fee).
 *
 * The per-object reserve units are cross-checked against the transactors'
 * increaseOwnerCount/decreaseOwnerCount calls (protocol.json →
 * transactor.ownerCountCalls) and against xrpl.org/docs/concepts/accounts/reserves.
 */
import { protocol, testnet } from "@/lib/protocol";

export interface ReserveRule {
  /** Owner reserve units it consumes (reserve_inc × units). */
  units: number;
  /** Who pays the reserve. */
  owner: string;
  /** Nuances (when it counts, when it doesn't, special cases). */
  note: string;
  /** Whether the unit depends on the state (e.g. RippleState). */
  variable?: boolean;
}

export const RESERVE_RULES: Record<string, ReserveRule> = {
  AccountRoot: { units: 0, owner: "the account itself", note: "Doesn't consume owner reserve, but the account must always keep the base reserve (reserve_base) plus one unit per object it owns. That XRP can't be spent or sent." },
  RippleState: { units: 1, owner: "each side that has it in a non-default state", variable: true, note: "A trust line counts 1 for each account whose side isn't in the default state (limit 0, no flags, zero balance from its perspective). If only you set a limit, you pay for it; if both accounts use it, both pay. When both sides return to default, the object deletes itself." },
  Offer: { units: 1, owner: "the account that creates it", note: "Each live offer in the order book counts 1. It's released when fully executed, cancelled, or left unfunded (it cleans itself up)." },
  Escrow: { units: 1, owner: "the account that creates it", note: "Counts 1 while it exists. Released on EscrowFinish or EscrowCancel. With TokenEscrow, a token escrow also adds 1 to the issuer if it creates an auxiliary trust line." },
  PayChannel: { units: 1, owner: "the account that opens it", note: "Counts 1 until it's closed and deleted (PaymentChannelClaim with tfClose once SettleDelay has passed, or CancelAfter)." },
  Check: { units: 1, owner: "whoever issues it", note: "Counts 1 until it's cashed (CheckCash), cancelled (CheckCancel), or it expires and someone cancels it." },
  DepositPreauth: { units: 1, owner: "the account that preauthorizes", note: "Each preauthorization (per account or per set of credentials) counts 1." },
  SignerList: { units: 1, owner: "the multisign account", note: "With MultiSignReserve active it counts 1 regardless of the number of signers (previously: 3 + n)." },
  Ticket: { units: 1, owner: "the account that creates them", note: "Each ticket counts 1 until it's used (TicketSequence) and deleted. TicketCreate requires having reserve for all the tickets requested." },
  NFTokenPage: { units: 1, owner: "the NFT owner", note: "NFTs don't count one by one: they're grouped into pages of up to 32, and each page counts 1. Minting the first NFT creates the first page." },
  NFTokenOffer: { units: 1, owner: "whoever creates the offer", note: "Each NFT buy or sell offer counts 1 until accepted, cancelled, or expired (NFTokenCancelOffer)." },
  DID: { units: 1, owner: "the account", note: "A single DID object per account; counts 1. Released with DIDDelete." },
  Oracle: { units: 1, owner: "the oracle account", variable: true, note: "1 if it has up to 5 price pairs, 2 if it has more (maximum 10). OracleSet re-evaluates the reserve on update." },
  Credential: { units: 1, owner: "the issuer until accepted; then the subject", note: "The issuer pays it when created; when the subject accepts it (CredentialAccept) the reserve moves to the subject." },
  PermissionedDomain: { units: 1, owner: "the domain owner", note: "Counts 1 per domain." },
  Delegate: { units: 1, owner: "the delegating account", note: "Counts 1 per delegated account (DelegateSet). Released when permissions are emptied." },
  MPTokenIssuance: { units: 1, owner: "the issuer", note: "Counts 1 per issuance. Released with MPTokenIssuanceDestroy (only if there are no holders)." },
  MPToken: { units: 1, owner: "the holder", note: "Each MPToken (an account's holding of an MPT) counts 1 for the holder. MPTokenAuthorize with tfMPTUnauthorize deletes it if the balance is 0." },
  AMM: { units: 0, owner: "no one (pseudo-account)", note: "The AMM lives in a pseudo-account with no reserve of its own, but AMMCreate charges the incremental owner reserve as a fee (it's burned), and your LP tokens create a trust line that does count 1." },
  Vault: { units: 2, owner: "the vault owner", note: "VaultCreate increases the owner count by 2 (the Vault object and its shares pseudo-account/MPT)." },
  LoanBroker: { units: 2, owner: "the broker owner", note: "LoanBrokerSet creates the broker with 2 units (broker and its pseudo-account)." },
  Loan: { units: 1, owner: "the broker (owner)", note: "Each active loan counts 1 on the LoanBroker." },
  Sponsorship: { units: 1, owner: "the sponsored account", note: "Object that records a sponsorship relationship; counts 1." },
  Bridge: { units: 1, owner: "the door account", note: "XChainCreateBridge counts 1 on the door account." },
  XChainOwnedClaimID: { units: 1, owner: "whoever creates it", note: "Counts 1 until the claim is consumed (XChainClaim) or the reward is claimed." },
  XChainOwnedCreateAccountClaimID: { units: 1, owner: "the door account", note: "Counts 1 until the attestations are completed." },
  DirectoryNode: { units: 0, owner: "no one", note: "Directories (owner directory, order books) don't count reserve: they're internal structures the ledger creates and deletes on its own." },
  Amendments: { units: 0, owner: "the network", note: "Unique system object." },
  FeeSettings: { units: 0, owner: "the network", note: "Unique system object; holds the current reserve and fee values." },
  LedgerHashes: { units: 0, owner: "the network", note: "System object." },
  NegativeUNL: { units: 0, owner: "the network", note: "Unique system object." },
};

export function reserveXrp(units: number): number {
  return units * testnet.reserves.incXrp;
}

export function formatXrp(x: number): string {
  return `${x.toLocaleString("en-US", { maximumFractionDigits: 6 })} XRP`;
}

/** Total reserve of an account with N objects. */
export function accountReserveXrp(ownerCount: number): number {
  return testnet.reserves.baseXrp + ownerCount * testnet.reserves.incXrp;
}

export const BASE_FEE_DROPS = Math.round(testnet.reserves.baseFeeXrp * 1_000_000);
export const LOAD_FACTOR = testnet.reserves.loadFactor;
/** Effective minimum fee with the current load factor (fee escalation), in drops. */
export const CURRENT_MIN_FEE_DROPS = Math.ceil((BASE_FEE_DROPS * LOAD_FACTOR) / 256);

export interface FeeRule { label: string; drops?: number; xrp?: number; note: string }

/** Fee rules for a transaction, read from the transactor when there's evidence. */
export function txFeeRules(name: string): FeeRule[] {
  const t = protocol.transactions.find((x) => x.name === name);
  const rules: FeeRule[] = [{ label: "Base fee", drops: BASE_FEE_DROPS, note: `Ledger reference (base_fee). Under load, the minimum rises due to fee escalation (currently load_factor ${LOAD_FACTOR}/256 → ${CURRENT_MIN_FEE_DROPS} drops). Xaman proposes a suitable fee.` }];
  if (t?.transactor?.ownerReserveFee) rules.push({ label: "Owner reserve as fee", xrp: testnet.reserves.incXrp, note: "This type charges the incremental owner reserve as a fee (it's destroyed). It's an antispam measure: AccountDelete, AMMCreate and LedgerStateFix." });
  if (name === "EscrowFinish") rules.push({ label: "Fulfillment", note: "If it carries Condition/Fulfillment: base fee × (33 + ⌈fulfillment bytes / 16⌉)." });
  if (name === "Batch") rules.push({ label: "Batch", note: "base fee × (2 + number of inner tx) + signer fees + the sum of the base fees of each inner tx." });
  if (name === "SetRegularKey") rules.push({ label: "Free once", drops: 0, note: "If the master key is disabled and the account has no RegularKey or SignerList, the fee can be 0 (account recovery)." });
  if (t?.transactor?.customBaseFee && !["EscrowFinish", "Batch", "SetRegularKey", "AccountDelete", "AMMCreate", "LedgerStateFix"].includes(name)) rules.push({ label: "Custom fee", note: `The transactor defines calculateBaseFee: check ${t.transactor.file}.` });
  rules.push({ label: "Multisign", note: "Each signature in the signer list adds the base fee once." });
  return rules;
}

/** Objects a transaction can create (and therefore reserve it locks up). */
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
