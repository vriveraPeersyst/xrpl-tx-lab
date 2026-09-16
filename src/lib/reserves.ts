/**
 * Coste en XRP de cada objeto del ledger (owner reserve) y de cada transacción (fee),
 * con los valores vivos de la testnet (testnet.json: reserve_base, reserve_inc, base_fee).
 *
 * Las unidades de reserva por objeto están contrastadas con las llamadas a
 * increaseOwnerCount/decreaseOwnerCount de los transactores (protocol.json →
 * transactor.ownerCountCalls) y con xrpl.org/docs/concepts/accounts/reserves.
 */
import { protocol, testnet } from "@/lib/protocol";

export interface ReserveRule {
  /** Unidades de owner reserve que consume (reserve_inc × units). */
  units: number;
  /** Quién paga la reserva. */
  owner: string;
  /** Matices (cuándo cuenta, cuándo no, casos especiales). */
  note: string;
  /** Si la unidad depende del estado (p. ej. RippleState). */
  variable?: boolean;
}

export const RESERVE_RULES: Record<string, ReserveRule> = {
  AccountRoot: { units: 0, owner: "la propia cuenta", note: "No consume owner reserve, pero la cuenta necesita mantener siempre la reserva base (reserve_base) más una unidad por cada objeto que posee. Ese XRP no se puede gastar ni enviar." },
  RippleState: { units: 1, owner: "cada lado que la tenga en estado no-default", variable: true, note: "Una trust line cuenta 1 para cada cuenta cuyo lado no esté en el estado por defecto (límite 0, sin flags, saldo cero desde su perspectiva). Si solo tú fijas un límite, la pagas tú; si ambas cuentas la usan, la pagan las dos. Cuando ambos lados vuelven al default, el objeto se borra solo." },
  Offer: { units: 1, owner: "la cuenta que la crea", note: "Cada oferta viva en el libro cuenta 1. Se libera al ejecutarse por completo, cancelarse o quedar sin fondos (se limpia sola)." },
  Escrow: { units: 1, owner: "la cuenta que lo crea", note: "Cuenta 1 mientras exista. Se libera en EscrowFinish o EscrowCancel. Con TokenEscrow, el escrow de tokens también añade 1 al emisor si crea una trust line auxiliar." },
  PayChannel: { units: 1, owner: "la cuenta que lo abre", note: "Cuenta 1 hasta que se cierra y se borra (PaymentChannelClaim con tfClose una vez pasado SettleDelay, o CancelAfter)." },
  Check: { units: 1, owner: "quien lo emite", note: "Cuenta 1 hasta que se cobra (CheckCash), se cancela (CheckCancel) o caduca y alguien lo cancela." },
  DepositPreauth: { units: 1, owner: "la cuenta que preautoriza", note: "Cada preautorización (por cuenta o por conjunto de credenciales) cuenta 1." },
  SignerList: { units: 1, owner: "la cuenta multifirma", note: "Con MultiSignReserve activo cuenta 1 sea cual sea el número de firmantes (antes: 3 + n)." },
  Ticket: { units: 1, owner: "la cuenta que los crea", note: "Cada ticket cuenta 1 hasta que se usa (TicketSequence) y se borra. TicketCreate exige tener reserva para todos los tickets pedidos." },
  NFTokenPage: { units: 1, owner: "el propietario de los NFT", note: "Los NFT no cuentan uno a uno: se agrupan en páginas de hasta 32 y cada página cuenta 1. Acuñar el primer NFT crea la primera página." },
  NFTokenOffer: { units: 1, owner: "quien crea la oferta", note: "Cada oferta de compra o venta de NFT cuenta 1 hasta aceptarse, cancelarse o caducar (NFTokenCancelOffer)." },
  DID: { units: 1, owner: "la cuenta", note: "Un único objeto DID por cuenta; cuenta 1. Se libera con DIDDelete." },
  Oracle: { units: 1, owner: "la cuenta del oráculo", variable: true, note: "1 si tiene hasta 5 pares de precios, 2 si tiene más (máximo 10). OracleSet reevalúa la reserva al actualizar." },
  Credential: { units: 1, owner: "el emisor hasta que se acepta; después el sujeto", note: "Al crearla la paga el emisor; cuando el sujeto la acepta (CredentialAccept) la reserva pasa al sujeto." },
  PermissionedDomain: { units: 1, owner: "el propietario del dominio", note: "Cuenta 1 por dominio." },
  Delegate: { units: 1, owner: "la cuenta que delega", note: "Cuenta 1 por cuenta delegada (DelegateSet). Se libera al vaciar los permisos." },
  MPTokenIssuance: { units: 1, owner: "el emisor", note: "Cuenta 1 por emisión. Se libera con MPTokenIssuanceDestroy (solo si no hay tenedores)." },
  MPToken: { units: 1, owner: "el tenedor", note: "Cada MPToken (tenencia de un MPT por una cuenta) cuenta 1 para el tenedor. MPTokenAuthorize con tfMPTUnauthorize lo borra si el saldo es 0." },
  AMM: { units: 0, owner: "nadie (pseudo-cuenta)", note: "El AMM vive en una pseudo-cuenta sin reserva propia, pero AMMCreate cobra el owner reserve incremental como fee (se quema), y tus LP tokens crean una trust line que sí cuenta 1." },
  Vault: { units: 2, owner: "el propietario del vault", note: "VaultCreate incrementa el owner count en 2 (el objeto Vault y su pseudo-cuenta/MPT de shares)." },
  LoanBroker: { units: 2, owner: "el propietario del broker", note: "LoanBrokerSet crea el broker con 2 unidades (broker y su pseudo-cuenta)." },
  Loan: { units: 1, owner: "el broker (propietario)", note: "Cada préstamo activo cuenta 1 en el LoanBroker." },
  Sponsorship: { units: 1, owner: "la cuenta patrocinada", note: "Objeto que registra una relación de patrocinio; cuenta 1." },
  Bridge: { units: 1, owner: "la cuenta puerta (door)", note: "XChainCreateBridge cuenta 1 en la cuenta door." },
  XChainOwnedClaimID: { units: 1, owner: "quien lo crea", note: "Cuenta 1 hasta que se consume el claim (XChainClaim) o se reclama la recompensa." },
  XChainOwnedCreateAccountClaimID: { units: 1, owner: "la cuenta door", note: "Cuenta 1 hasta que se completan las attestations." },
  DirectoryNode: { units: 0, owner: "nadie", note: "Los directorios (owner directory, libros de órdenes) no cuentan reserva: son estructuras internas que el ledger crea y borra solo." },
  Amendments: { units: 0, owner: "la red", note: "Objeto único del sistema." },
  FeeSettings: { units: 0, owner: "la red", note: "Objeto único del sistema; contiene los valores actuales de reserva y fee." },
  LedgerHashes: { units: 0, owner: "la red", note: "Objeto del sistema." },
  NegativeUNL: { units: 0, owner: "la red", note: "Objeto único del sistema." },
};

export function reserveXrp(units: number): number {
  return units * testnet.reserves.incXrp;
}

export function formatXrp(x: number): string {
  return `${x.toLocaleString("es-ES", { maximumFractionDigits: 6 })} XRP`;
}

/** Reserva total de una cuenta con N objetos. */
export function accountReserveXrp(ownerCount: number): number {
  return testnet.reserves.baseXrp + ownerCount * testnet.reserves.incXrp;
}

export const BASE_FEE_DROPS = Math.round(testnet.reserves.baseFeeXrp * 1_000_000);
export const LOAD_FACTOR = testnet.reserves.loadFactor;
/** Fee mínimo efectivo con el load factor actual (fee escalation), en drops. */
export const CURRENT_MIN_FEE_DROPS = Math.ceil((BASE_FEE_DROPS * LOAD_FACTOR) / 256);

export interface FeeRule { label: string; drops?: number; xrp?: number; note: string }

/** Reglas de fee de una transacción, leídas del transactor cuando hay evidencia. */
export function txFeeRules(name: string): FeeRule[] {
  const t = protocol.transactions.find((x) => x.name === name);
  const rules: FeeRule[] = [{ label: "Fee base", drops: BASE_FEE_DROPS, note: `Referencia del ledger (base_fee). Con carga, el mínimo sube por fee escalation (ahora load_factor ${LOAD_FACTOR}/256 → ${CURRENT_MIN_FEE_DROPS} drops). Xaman propone un fee adecuado.` }];
  if (t?.transactor?.ownerReserveFee) rules.push({ label: "Owner reserve como fee", xrp: testnet.reserves.incXrp, note: "Este tipo cobra el owner reserve incremental como fee (se destruye). Es una medida antispam: AccountDelete, AMMCreate y LedgerStateFix." });
  if (name === "EscrowFinish") rules.push({ label: "Fulfillment", note: "Si lleva Condition/Fulfillment: fee base × (33 + ⌈bytes del fulfillment / 16⌉)." });
  if (name === "Batch") rules.push({ label: "Batch", note: "fee base × (2 + número de inner tx) + fees de firmantes + la suma de los fees base de cada inner tx." });
  if (name === "SetRegularKey") rules.push({ label: "Gratis una vez", drops: 0, note: "Si la clave maestra está deshabilitada y la cuenta no tiene RegularKey ni SignerList, el fee puede ser 0 (recuperación de cuenta)." });
  if (t?.transactor?.customBaseFee && !["EscrowFinish", "Batch", "SetRegularKey", "AccountDelete", "AMMCreate", "LedgerStateFix"].includes(name)) rules.push({ label: "Fee propio", note: `El transactor define calculateBaseFee: consulta ${t.transactor.file}.` });
  rules.push({ label: "Multifirma", note: "Cada firma de la lista de firmantes añade una vez el fee base." });
  return rules;
}

/** Objetos que una transacción puede crear (y por tanto reserva que bloquea). */
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
