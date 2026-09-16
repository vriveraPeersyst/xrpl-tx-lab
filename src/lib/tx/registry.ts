/**
 * Registro de UI por tipo de transacción: categoría, ejemplo listo para testnet, pistas de
 * campos y prerrequisitos. El lint de cobertura exige una entrada por cada TransactionType
 * que exista en la testnet (salvo pseudo-transacciones).
 *
 * Placeholders en los ejemplos (los sustituye el builder):
 *   {{account}}   cuenta conectada con Xaman
 *   {{other}}     una segunda cuenta de demostración (destino, contraparte…)
 *   {{issuer}}    emisor de un token de prueba
 *   {{seq}}       Sequence actual de la cuenta conectada
 *   {{ledger+N}}  ledger validado + N
 *   {{time+N}}    ahora + N segundos, en Ripple Epoch
 */
export type Category = "cuenta" | "pagos" | "dex" | "tokens" | "nft" | "mpt" | "escrow" | "canales" | "cheques" | "multifirma" | "identidad" | "permisos" | "amm" | "puente" | "vault" | "prestamos" | "confidencial" | "batch" | "oraculos" | "sistema" | "otros";

export const CATEGORIES: Record<Category, { label: string; blurb: string }> = {
  cuenta: { label: "Cuenta", blurb: "Configuración, claves y borrado de cuentas." },
  pagos: { label: "Pagos", blurb: "Mover XRP, tokens y MPT entre cuentas." },
  dex: { label: "DEX", blurb: "Órdenes en el libro descentralizado." },
  tokens: { label: "Tokens (IOU)", blurb: "Trust lines, congelación y clawback de tokens emitidos." },
  nft: { label: "NFT", blurb: "Acuñar, ofrecer, aceptar y quemar NFTokens." },
  mpt: { label: "MPT", blurb: "Multi-Purpose Tokens: emisiones y autorizaciones." },
  escrow: { label: "Escrow", blurb: "Retener fondos hasta un tiempo o condición." },
  canales: { label: "Canales de pago", blurb: "Micropagos off-chain liquidados on-chain." },
  cheques: { label: "Cheques", blurb: "Pagos diferidos que cobra el destinatario." },
  multifirma: { label: "Multifirma y tickets", blurb: "Listas de firmantes y secuencias reservadas." },
  identidad: { label: "Identidad y credenciales", blurb: "DID y credenciales verificables." },
  permisos: { label: "Permisos y delegación", blurb: "Dominios permisionados, preautorización y delegación." },
  amm: { label: "AMM", blurb: "Creadores de mercado automáticos." },
  puente: { label: "Puentes (XChain)", blurb: "Transferencias entre cadenas (amendment no activo en testnet)." },
  vault: { label: "Vault", blurb: "Bóvedas de un solo activo (XLS-65)." },
  prestamos: { label: "Préstamos", blurb: "Protocolo de préstamos (XLS-66)." },
  confidencial: { label: "MPT confidencial", blurb: "Transferencias con saldos cifrados (XLS-96)." },
  batch: { label: "Batch", blurb: "Varias transacciones atómicas en una." },
  oraculos: { label: "Oráculos", blurb: "Precios on-chain (XLS-47)." },
  sistema: { label: "Sistema", blurb: "Pseudo-transacciones que emite la red." },
  otros: { label: "Otros", blurb: "Sin categoría todavía." },
};

export interface TxUiSpec {
  category: Category;
  example: Record<string, unknown>;
  /** Pistas por campo, mostradas junto al input. */
  hints?: Record<string, string>;
  /** Qué debe existir antes (p. ej. "una trust line al emisor"). */
  prerequisites?: string[];
  /** Consulta RPC sugerida tras aplicar, para ver el efecto. */
  verify?: { method: string; params: Record<string, unknown> };
  /** Entrada creada automáticamente por sync; pendiente de revisión humana. */
  generated?: boolean;
}

const A = "{{account}}";
const O = "{{other}}";
const I = "{{issuer}}";
const ZERO32 = "0000000000000000000000000000000000000000000000000000000000000000";

export const registry: Record<string, TxUiSpec> = {
  Payment: {
    category: "pagos",
    example: { TransactionType: "Payment", Account: A, Destination: O, Amount: "1000000", DestinationTag: 12345 },
    hints: { Amount: "En drops si es XRP (1 XRP = 1.000.000 drops) o un objeto {currency, issuer, value} para tokens.", SendMax: "Máximo que aceptas gastar en pagos entre monedas.", DeliverMin: "Mínimo a entregar si usas tfPartialPayment." },
    verify: { method: "account_info", params: { account: O } },
  },
  EscrowCreate: {
    category: "escrow",
    example: { TransactionType: "EscrowCreate", Account: A, Destination: O, Amount: "2000000", FinishAfter: "{{time+120}}", CancelAfter: "{{time+86400}}" },
    hints: { FinishAfter: "Segundos desde el Ripple Epoch (2000-01-01). Antes de este instante no se puede finalizar.", Condition: "PREIMAGE-SHA-256 en hex (crypto-condition) si quieres un escrow condicional." },
    verify: { method: "account_objects", params: { account: A, type: "escrow" } },
  },
  EscrowFinish: {
    category: "escrow",
    example: { TransactionType: "EscrowFinish", Account: A, Owner: A, OfferSequence: "{{seq}}" },
    hints: { OfferSequence: "El Sequence de la transacción EscrowCreate original.", Fulfillment: "Preimagen en hex si el escrow tiene Condition." },
    prerequisites: ["Un objeto Escrow del Owner cuyo FinishAfter ya haya pasado"],
  },
  EscrowCancel: {
    category: "escrow",
    example: { TransactionType: "EscrowCancel", Account: A, Owner: A, OfferSequence: "{{seq}}" },
    prerequisites: ["Un objeto Escrow cuyo CancelAfter ya haya pasado"],
  },
  AccountSet: {
    category: "cuenta",
    example: { TransactionType: "AccountSet", Account: A, SetFlag: 8, Domain: "6578616D706C652E636F6D" },
    hints: { SetFlag: "Valor asf* (p. ej. 8 = asfDefaultRipple). Solo uno por transacción.", Domain: "Dominio en hex minúsculas (example.com = 6578616d706c652e636f6d).", TransferRate: "1000000000 = 0 %. 1020000000 = 2 % de comisión de transferencia." },
    verify: { method: "account_info", params: { account: A } },
  },
  SetRegularKey: {
    category: "cuenta",
    example: { TransactionType: "SetRegularKey", Account: A, RegularKey: O },
    hints: { RegularKey: "Dirección derivada de la nueva clave regular. Omítelo para eliminar la clave regular." },
  },
  OfferCreate: {
    category: "dex",
    example: { TransactionType: "OfferCreate", Account: A, TakerGets: "1000000", TakerPays: { currency: "USD", issuer: I, value: "1" } },
    hints: { TakerGets: "Lo que ofreces (lo que el taker recibe).", TakerPays: "Lo que pides a cambio." },
    verify: { method: "account_offers", params: { account: A } },
  },
  OfferCancel: {
    category: "dex",
    example: { TransactionType: "OfferCancel", Account: A, OfferSequence: "{{seq}}" },
    hints: { OfferSequence: "Sequence de la OfferCreate que quieres cancelar." },
  },
  TicketCreate: {
    category: "multifirma",
    example: { TransactionType: "TicketCreate", Account: A, TicketCount: 2 },
    verify: { method: "account_objects", params: { account: A, type: "ticket" } },
  },
  SignerListSet: {
    category: "multifirma",
    example: { TransactionType: "SignerListSet", Account: A, SignerQuorum: 2, SignerEntries: [{ SignerEntry: { Account: O, SignerWeight: 1 } }, { SignerEntry: { Account: I, SignerWeight: 1 } }] },
    hints: { SignerQuorum: "0 y sin SignerEntries elimina la lista." },
    verify: { method: "account_objects", params: { account: A, type: "signer_list" } },
  },
  PaymentChannelCreate: {
    category: "canales",
    example: { TransactionType: "PaymentChannelCreate", Account: A, Destination: O, Amount: "5000000", SettleDelay: 86400, PublicKey: "{{pubkey}}" },
    hints: { PublicKey: "Clave pública (hex) con la que firmarás los claims. Xaman usa la clave de la cuenta.", SettleDelay: "Segundos que el canal permanece abierto tras pedir el cierre." },
    verify: { method: "account_channels", params: { account: A } },
  },
  PaymentChannelFund: {
    category: "canales",
    example: { TransactionType: "PaymentChannelFund", Account: A, Channel: ZERO32, Amount: "1000000" },
    hints: { Channel: "ID del canal (hash de 64 hex). Consulta account_channels." },
  },
  PaymentChannelClaim: {
    category: "canales",
    example: { TransactionType: "PaymentChannelClaim", Account: A, Channel: ZERO32, Balance: "1000000", Amount: "1000000", Signature: "", PublicKey: "{{pubkey}}" },
    hints: { Signature: "Firma del claim (hex) generada off-chain con la clave del canal.", Balance: "Total acumulado a reclamar." },
  },
  CheckCreate: {
    category: "cheques",
    example: { TransactionType: "CheckCreate", Account: A, Destination: O, SendMax: "1000000", Expiration: "{{time+86400}}" },
    verify: { method: "account_objects", params: { account: A, type: "check" } },
  },
  CheckCash: {
    category: "cheques",
    example: { TransactionType: "CheckCash", Account: A, CheckID: ZERO32, Amount: "1000000" },
    hints: { CheckID: "ID del objeto Check (index en account_objects).", DeliverMin: "Alternativa a Amount: cobra lo máximo posible ≥ este mínimo." },
  },
  CheckCancel: { category: "cheques", example: { TransactionType: "CheckCancel", Account: A, CheckID: ZERO32 } },
  DepositPreauth: {
    category: "permisos",
    example: { TransactionType: "DepositPreauth", Account: A, Authorize: O },
    prerequisites: ["Normalmente tu cuenta tiene activado asfDepositAuth"],
    verify: { method: "account_objects", params: { account: A, type: "deposit_preauth" } },
  },
  TrustSet: {
    category: "tokens",
    example: { TransactionType: "TrustSet", Account: A, LimitAmount: { currency: "USD", issuer: I, value: "1000" }, Flags: 131072 },
    hints: { LimitAmount: "Máximo que aceptas mantener de ese token.", Flags: "131072 = tfSetNoRipple." },
    verify: { method: "account_lines", params: { account: A } },
  },
  AccountDelete: {
    category: "cuenta",
    example: { TransactionType: "AccountDelete", Account: A, Destination: O },
    prerequisites: ["Sequence de la cuenta + 256 ≤ ledger actual", "Sin objetos que bloqueen el borrado (escrows, canales, trust lines…)", "Fee especial: el owner reserve incremental"],
  },
  NFTokenMint: {
    category: "nft",
    example: { TransactionType: "NFTokenMint", Account: A, NFTokenTaxon: 0, Flags: 8, TransferFee: 500, URI: "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E" },
    hints: { URI: "Hex de la URI de metadatos.", TransferFee: "0-50000 (50000 = 50 %). Requiere tfTransferable.", Flags: "8 = tfTransferable." },
    verify: { method: "account_nfts", params: { account: A } },
  },
  NFTokenBurn: { category: "nft", example: { TransactionType: "NFTokenBurn", Account: A, NFTokenID: ZERO32 } },
  NFTokenCreateOffer: {
    category: "nft",
    example: { TransactionType: "NFTokenCreateOffer", Account: A, NFTokenID: ZERO32, Amount: "1000000", Flags: 1 },
    hints: { Flags: "1 = tfSellNFToken (oferta de venta). Sin flag es oferta de compra y necesitas Owner." },
    verify: { method: "nft_sell_offers", params: { nft_id: ZERO32 } },
  },
  NFTokenCancelOffer: { category: "nft", example: { TransactionType: "NFTokenCancelOffer", Account: A, NFTokenOffers: [ZERO32] } },
  NFTokenAcceptOffer: { category: "nft", example: { TransactionType: "NFTokenAcceptOffer", Account: A, NFTokenSellOffer: ZERO32 }, hints: { NFTokenBrokerFee: "Solo en modo broker (con ambas ofertas)." } },
  Clawback: {
    category: "tokens",
    example: { TransactionType: "Clawback", Account: A, Amount: { currency: "USD", issuer: O, value: "10" } },
    hints: { Amount: "Aquí issuer es el TENEDOR del que recuperas los tokens, no tú." },
    prerequisites: ["Tu cuenta emisora tiene asfAllowTrustLineClawback y no tiene asfNoFreeze"],
  },
  AMMClawback: { category: "amm", example: { TransactionType: "AMMClawback", Account: A, Holder: O, Asset: { currency: "USD", issuer: A }, Asset2: { currency: "XRP" } } },
  AMMCreate: {
    category: "amm",
    example: { TransactionType: "AMMCreate", Account: A, Amount: "10000000", Amount2: { currency: "USD", issuer: I, value: "10" }, TradingFee: 500 },
    hints: { TradingFee: "En unidades de 1/100.000 (500 = 0,5 %). Máximo 1000." },
    prerequisites: ["Saldo de ambos activos", "Fee especial: el owner reserve incremental"],
    verify: { method: "amm_info", params: { asset: { currency: "XRP" }, asset2: { currency: "USD", issuer: I } } },
  },
  AMMDeposit: { category: "amm", example: { TransactionType: "AMMDeposit", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, Amount: "1000000", Flags: 524288 }, hints: { Flags: "524288 = tfSingleAsset. Ver la lista de flags." } },
  AMMWithdraw: { category: "amm", example: { TransactionType: "AMMWithdraw", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, Flags: 131072 }, hints: { Flags: "131072 = tfWithdrawAll." } },
  AMMVote: { category: "amm", example: { TransactionType: "AMMVote", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, TradingFee: 300 } },
  AMMBid: { category: "amm", example: { TransactionType: "AMMBid", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I } } },
  AMMDelete: { category: "amm", example: { TransactionType: "AMMDelete", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I } }, prerequisites: ["El AMM está vacío (sin LP tokens)"] },
  XChainCreateClaimID: { category: "puente", example: { TransactionType: "XChainCreateClaimID", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, SignatureReward: "100", OtherChainSource: O } },
  XChainCommit: { category: "puente", example: { TransactionType: "XChainCommit", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, XChainClaimID: "1", Amount: "1000000" } },
  XChainClaim: { category: "puente", example: { TransactionType: "XChainClaim", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, XChainClaimID: "1", Destination: A, Amount: "1000000" } },
  XChainAccountCreateCommit: { category: "puente", example: { TransactionType: "XChainAccountCreateCommit", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, Destination: O, Amount: "20000000", SignatureReward: "100" } },
  XChainAddClaimAttestation: { category: "puente", example: { TransactionType: "XChainAddClaimAttestation", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, PublicKey: "", Signature: "", OtherChainSource: O, Amount: "1000000", AttestationRewardAccount: A, AttestationSignerAccount: A, WasLockingChainSend: 1, XChainClaimID: "1" } },
  XChainAddAccountCreateAttestation: { category: "puente", example: { TransactionType: "XChainAddAccountCreateAttestation", Account: A, XChainBridge: { LockingChainDoor: O, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, PublicKey: "", Signature: "", OtherChainSource: O, Amount: "20000000", AttestationRewardAccount: A, AttestationSignerAccount: A, WasLockingChainSend: 1, XChainAccountCreateCount: "1", Destination: O, SignatureReward: "100" } },
  XChainModifyBridge: { category: "puente", example: { TransactionType: "XChainModifyBridge", Account: A, XChainBridge: { LockingChainDoor: A, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, SignatureReward: "200" } },
  XChainCreateBridge: { category: "puente", example: { TransactionType: "XChainCreateBridge", Account: A, XChainBridge: { LockingChainDoor: A, LockingChainIssue: { currency: "XRP" }, IssuingChainDoor: I, IssuingChainIssue: { currency: "XRP" } }, SignatureReward: "100", MinAccountCreateAmount: "10000000" } },
  DIDSet: {
    category: "identidad",
    example: { TransactionType: "DIDSet", Account: A, URI: "697066733A2F2F6578616D706C65", Data: "7B7D" },
    hints: { URI: "Hex de la URI del documento DID.", DIDDocument: "Hex del documento DID inline." },
    verify: { method: "account_objects", params: { account: A, type: "did" } },
  },
  DIDDelete: { category: "identidad", example: { TransactionType: "DIDDelete", Account: A } },
  OracleSet: {
    category: "oraculos",
    example: { TransactionType: "OracleSet", Account: A, OracleDocumentID: 1, Provider: "70726F7669646572", AssetClass: "63757272656E6379", LastUpdateTime: "{{unix}}", PriceDataSeries: [{ PriceData: { BaseAsset: "XRP", QuoteAsset: "USD", AssetPrice: 2500, Scale: 4 } }] },
    hints: { LastUpdateTime: "Timestamp UNIX (no Ripple Epoch), no más de 300 s antes del cierre del ledger.", AssetPrice: "Entero; el valor real es AssetPrice / 10^Scale." },
    verify: { method: "get_aggregate_price", params: { base_asset: "XRP", quote_asset: "USD", oracles: [{ account: A, oracle_document_id: 1 }] } },
  },
  OracleDelete: { category: "oraculos", example: { TransactionType: "OracleDelete", Account: A, OracleDocumentID: 1 } },
  LedgerStateFix: { category: "sistema", example: { TransactionType: "LedgerStateFix", Account: A, LedgerFixType: 1, Owner: O }, hints: { LedgerFixType: "1 = reparar enlaces de páginas NFTokenPage del Owner." } },
  MPTokenIssuanceCreate: {
    category: "mpt",
    example: { TransactionType: "MPTokenIssuanceCreate", Account: A, AssetScale: 2, MaximumAmount: "100000000", TransferFee: 100, Flags: 32, MPTokenMetadata: "7B226E616D65223A2244656D6F227D" },
    hints: { Flags: "32 = tfMPTCanTransfer. Combina flags tfMPT* según la lista.", MPTokenMetadata: "Hex (máx. 1024 bytes). Ver XLS-89 para el esquema." },
    verify: { method: "account_objects", params: { account: A, type: "mpt_issuance" } },
  },
  MPTokenIssuanceDestroy: { category: "mpt", example: { TransactionType: "MPTokenIssuanceDestroy", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" } },
  MPTokenIssuanceSet: { category: "mpt", example: { TransactionType: "MPTokenIssuanceSet", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", Flags: 1 }, hints: { Flags: "1 = tfMPTLock, 2 = tfMPTUnlock.", Holder: "Si lo indicas, bloquea/desbloquea solo ese tenedor." } },
  MPTokenAuthorize: { category: "mpt", example: { TransactionType: "MPTokenAuthorize", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" }, hints: { Holder: "Solo lo usa el emisor para autorizar a un tenedor (issuances con tfMPTRequireAuth)." }, verify: { method: "account_objects", params: { account: A, type: "mptoken" } } },
  CredentialCreate: {
    category: "identidad",
    example: { TransactionType: "CredentialCreate", Account: A, Subject: O, CredentialType: "4B5943", Expiration: "{{time+2592000}}", URI: "68747470733A2F2F6578616D706C652E636F6D" },
    hints: { CredentialType: "Hex (1-64 bytes). 4B5943 = \"KYC\".", Subject: "Cuenta que recibe la credencial; debe aceptarla con CredentialAccept." },
    verify: { method: "account_objects", params: { account: A, type: "credential" } },
  },
  CredentialAccept: { category: "identidad", example: { TransactionType: "CredentialAccept", Account: A, Issuer: O, CredentialType: "4B5943" } },
  CredentialDelete: { category: "identidad", example: { TransactionType: "CredentialDelete", Account: A, Subject: O, CredentialType: "4B5943" } },
  NFTokenModify: { category: "nft", example: { TransactionType: "NFTokenModify", Account: A, NFTokenID: ZERO32, URI: "68747470733A2F2F6578616D706C652E636F6D2F76322E6A736F6E" }, prerequisites: ["El NFT se acuñó con tfMutable"] },
  PermissionedDomainSet: {
    category: "permisos",
    example: { TransactionType: "PermissionedDomainSet", Account: A, AcceptedCredentials: [{ Credential: { Issuer: O, CredentialType: "4B5943" } }] },
    hints: { DomainID: "Indícalo para modificar un dominio existente." },
    verify: { method: "account_objects", params: { account: A, type: "permissioned_domain" } },
  },
  PermissionedDomainDelete: { category: "permisos", example: { TransactionType: "PermissionedDomainDelete", Account: A, DomainID: ZERO32 } },
  DelegateSet: {
    category: "permisos",
    example: { TransactionType: "DelegateSet", Account: A, Authorize: O, Permissions: [{ Permission: { PermissionValue: "Payment" } }, { Permission: { PermissionValue: "TrustlineAuthorize" } }] },
    hints: { Permissions: "Nombres de tipo de transacción delegable o permisos granulares (ver /permissions)." },
    verify: { method: "account_objects", params: { account: A, type: "delegate" } },
  },
  VaultCreate: {
    category: "vault",
    example: { TransactionType: "VaultCreate", Account: A, Asset: { currency: "XRP" }, AssetsMaximum: "1000000000", Data: "7B7D", Flags: 0 },
    hints: { Flags: "1 = tfVaultPrivate (solo cuentas con credenciales del dominio).", WithdrawalPolicy: "1 = vaultStrategyFirstComeFirstServe." },
    verify: { method: "account_objects", params: { account: A, type: "vault" } },
  },
  VaultSet: { category: "vault", example: { TransactionType: "VaultSet", Account: A, VaultID: ZERO32, AssetsMaximum: "2000000000" } },
  VaultDelete: { category: "vault", example: { TransactionType: "VaultDelete", Account: A, VaultID: ZERO32 }, prerequisites: ["El vault no tiene activos ni shares en circulación"] },
  VaultDeposit: { category: "vault", example: { TransactionType: "VaultDeposit", Account: A, VaultID: ZERO32, Amount: "5000000" } },
  VaultWithdraw: { category: "vault", example: { TransactionType: "VaultWithdraw", Account: A, VaultID: ZERO32, Amount: "1000000" } },
  VaultClawback: { category: "vault", example: { TransactionType: "VaultClawback", Account: A, VaultID: ZERO32, Holder: O }, prerequisites: ["Eres el emisor del activo del vault"] },
  Batch: {
    category: "batch",
    example: { TransactionType: "Batch", Account: A, Flags: 65536, RawTransactions: [{ RawTransaction: { TransactionType: "Payment", Flags: 1073741824, Account: A, Destination: O, Amount: "1000000", Sequence: "{{seq+1}}", Fee: "0", SigningPubKey: "" } }, { RawTransaction: { TransactionType: "Payment", Flags: 1073741824, Account: A, Destination: I, Amount: "1000000", Sequence: "{{seq+2}}", Fee: "0", SigningPubKey: "" } }] },
    hints: { Flags: "65536 = tfAllOrNothing, 131072 = tfOnlyOne, 262144 = tfUntilFailure, 524288 = tfIndependent.", RawTransactions: "Cada inner tx lleva tfInnerBatchTxn (1073741824), Fee 0, SigningPubKey vacío y su propio Sequence." },
  },
  LoanBrokerSet: { category: "prestamos", example: { TransactionType: "LoanBrokerSet", Account: A, VaultID: ZERO32, ManagementFeeRate: 100, CoverRateMinimum: 1000, Data: "7B7D" }, hints: { ManagementFeeRate: "En 1/10.000 (100 = 1 %)." } },
  LoanBrokerDelete: { category: "prestamos", example: { TransactionType: "LoanBrokerDelete", Account: A, LoanBrokerID: ZERO32 } },
  LoanBrokerCoverDeposit: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverDeposit", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanBrokerCoverWithdraw: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverWithdraw", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanBrokerCoverClawback: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverClawback", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanSet: { category: "prestamos", example: { TransactionType: "LoanSet", Account: A, LoanBrokerID: ZERO32, PrincipalRequested: "10000000", InterestRate: 500, PaymentInterval: 604800, PaymentTotal: 4, CounterpartySignature: { CounterpartySignature: { Account: O, SigningPubKey: "", TxnSignature: "" } } }, hints: { CounterpartySignature: "La otra parte (prestatario o broker) firma la misma tx; se pega aquí." } },
  LoanDelete: { category: "prestamos", example: { TransactionType: "LoanDelete", Account: A, LoanID: ZERO32 } },
  LoanManage: { category: "prestamos", example: { TransactionType: "LoanManage", Account: A, LoanID: ZERO32, Flags: 65536 }, hints: { Flags: "Ver lista de flags tfLoan*." } },
  LoanPay: { category: "prestamos", example: { TransactionType: "LoanPay", Account: A, LoanID: ZERO32, Amount: "2500000" } },
  ConfidentialMPTConvert: { category: "confidencial", example: { TransactionType: "ConfidentialMPTConvert", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100", HolderElGamalPublicKey: "", IssuerElGamalPublicKey: "" }, hints: { HolderElGamalPublicKey: "Clave pública ElGamal (hex) del tenedor. Requiere herramientas criptográficas externas." } },
  ConfidentialMPTMergeInbox: { category: "confidencial", example: { TransactionType: "ConfidentialMPTMergeInbox", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" } },
  ConfidentialMPTConvertBack: { category: "confidencial", example: { TransactionType: "ConfidentialMPTConvertBack", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100", ZKProof: "" } },
  ConfidentialMPTSend: { category: "confidencial", example: { TransactionType: "ConfidentialMPTSend", Account: A, Destination: O, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", HolderEncryptedAmount: "", DestinationEncryptedAmount: "", IssuerEncryptedAmount: "", AuditorEncryptedAmount: "", ZKProof: "" } },
  ConfidentialMPTClawback: { category: "confidencial", example: { TransactionType: "ConfidentialMPTClawback", Account: A, Holder: O, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100" } },
  SponsorshipSet: { category: "permisos", example: { TransactionType: "SponsorshipSet", Account: A, Sponsor: O, Flags: 65536 }, hints: { Flags: "Ver tfSponsorship*." } },
  SponsorshipTransfer: { category: "permisos", example: { TransactionType: "SponsorshipTransfer", Account: A, Sponsor: O, Flags: 65536 } },
};

export function specFor(name: string): TxUiSpec | undefined {
  return registry[name];
}

export function txByCategory(names: string[]): Record<Category, string[]> {
  const out = Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, [] as string[]])) as Record<Category, string[]>;
  for (const n of names) {
    const cat = registry[n]?.category ?? (["EnableAmendment", "SetFee", "UNLModify"].includes(n) ? "sistema" : "otros");
    out[cat].push(n);
  }
  return out;
}
