/**
 * UI registry per transaction type: category, testnet-ready example, field
 * hints and prerequisites. The coverage lint requires an entry for every TransactionType
 * that exists on testnet (except pseudo-transactions).
 *
 * Placeholders in the examples (substituted by the builder):
 *   {{account}}   account connected with Xaman
 *   {{other}}     a second demo account (destination, counterparty…)
 *   {{issuer}}    issuer of a test token
 *   {{seq}}       connected account's current Sequence
 *   {{ledger+N}}  validated ledger + N
 *   {{time+N}}    now + N seconds, in Ripple Epoch
 */
export type Category = "cuenta" | "pagos" | "dex" | "tokens" | "nft" | "mpt" | "escrow" | "canales" | "cheques" | "multifirma" | "identidad" | "permisos" | "amm" | "puente" | "vault" | "prestamos" | "confidencial" | "batch" | "oraculos" | "sistema" | "otros";

export const CATEGORIES: Record<Category, { label: string; blurb: string }> = {
  cuenta: { label: "Account", blurb: "Configuration, keys and account deletion." },
  pagos: { label: "Payments", blurb: "Move XRP, tokens and MPT between accounts." },
  dex: { label: "DEX", blurb: "Orders on the decentralized order book." },
  tokens: { label: "Tokens (IOU)", blurb: "Trust lines, freezing and clawback of issued tokens." },
  nft: { label: "NFT", blurb: "Mint, offer, accept and burn NFTokens." },
  mpt: { label: "MPT", blurb: "Multi-Purpose Tokens: issuances and authorizations." },
  escrow: { label: "Escrow", blurb: "Hold funds until a time or condition." },
  canales: { label: "Payment channels", blurb: "Off-chain micropayments settled on-chain." },
  cheques: { label: "Checks", blurb: "Deferred payments cashed by the recipient." },
  multifirma: { label: "Multisign and tickets", blurb: "Signer lists and reserved sequences." },
  identidad: { label: "Identity and credentials", blurb: "DID and verifiable credentials." },
  permisos: { label: "Permissions and delegation", blurb: "Permissioned domains, preauthorization and delegation." },
  amm: { label: "AMM", blurb: "Automated market makers." },
  puente: { label: "Bridges (XChain)", blurb: "Cross-chain transfers (amendment not active on testnet)." },
  vault: { label: "Vault", blurb: "Single-asset vaults (XLS-65)." },
  prestamos: { label: "Loans", blurb: "Lending protocol (XLS-66)." },
  confidencial: { label: "Confidential MPT", blurb: "Transfers with encrypted balances (XLS-96)." },
  batch: { label: "Batch", blurb: "Several atomic transactions in one." },
  oraculos: { label: "Oracles", blurb: "On-chain prices (XLS-47)." },
  sistema: { label: "System", blurb: "Pseudo-transactions emitted by the network." },
  otros: { label: "Other", blurb: "Not categorized yet." },
};

export interface TxUiSpec {
  category: Category;
  example: Record<string, unknown>;
  /** Per-field hints, shown next to the input. */
  hints?: Record<string, string>;
  /** What must exist beforehand (e.g. "a trust line to the issuer"). */
  prerequisites?: string[];
  /** Suggested RPC query after applying, to see the effect. */
  verify?: { method: string; params: Record<string, unknown> };
  /** Entry created automatically by sync; pending human review. */
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
    hints: { Amount: "In drops if XRP (1 XRP = 1,000,000 drops) or a {currency, issuer, value} object for tokens.", SendMax: "Maximum you accept to spend on cross-currency payments.", DeliverMin: "Minimum to deliver if you use tfPartialPayment." },
    verify: { method: "account_info", params: { account: O } },
  },
  EscrowCreate: {
    category: "escrow",
    example: { TransactionType: "EscrowCreate", Account: A, Destination: O, Amount: "2000000", FinishAfter: "{{time+120}}", CancelAfter: "{{time+86400}}" },
    hints: { FinishAfter: "Seconds since the Ripple Epoch (2000-01-01). It cannot be finished before this instant.", Condition: "PREIMAGE-SHA-256 in hex (crypto-condition) if you want a conditional escrow." },
    verify: { method: "account_objects", params: { account: A, type: "escrow" } },
  },
  EscrowFinish: {
    category: "escrow",
    example: { TransactionType: "EscrowFinish", Account: A, Owner: A, OfferSequence: "{{seq}}" },
    hints: { OfferSequence: "The Sequence of the original EscrowCreate transaction.", Fulfillment: "Preimage in hex if the escrow has a Condition." },
    prerequisites: ["An Escrow object from the Owner whose FinishAfter has already passed"],
  },
  EscrowCancel: {
    category: "escrow",
    example: { TransactionType: "EscrowCancel", Account: A, Owner: A, OfferSequence: "{{seq}}" },
    prerequisites: ["An Escrow object whose CancelAfter has already passed"],
  },
  AccountSet: {
    category: "cuenta",
    example: { TransactionType: "AccountSet", Account: A, SetFlag: 8, Domain: "6578616D706C652E636F6D" },
    hints: { SetFlag: "asf* value (e.g. 8 = asfDefaultRipple). Only one per transaction.", Domain: "Domain in lowercase hex (example.com = 6578616d706c652e636f6d).", TransferRate: "1000000000 = 0%. 1020000000 = 2% transfer fee." },
    verify: { method: "account_info", params: { account: A } },
  },
  SetRegularKey: {
    category: "cuenta",
    example: { TransactionType: "SetRegularKey", Account: A, RegularKey: O },
    hints: { RegularKey: "Address derived from the new regular key. Omit it to remove the regular key." },
  },
  OfferCreate: {
    category: "dex",
    example: { TransactionType: "OfferCreate", Account: A, TakerGets: "1000000", TakerPays: { currency: "USD", issuer: I, value: "1" } },
    hints: { TakerGets: "What you're offering (what the taker receives).", TakerPays: "What you're asking for in exchange." },
    verify: { method: "account_offers", params: { account: A } },
  },
  OfferCancel: {
    category: "dex",
    example: { TransactionType: "OfferCancel", Account: A, OfferSequence: "{{seq}}" },
    hints: { OfferSequence: "Sequence of the OfferCreate you want to cancel." },
  },
  TicketCreate: {
    category: "multifirma",
    example: { TransactionType: "TicketCreate", Account: A, TicketCount: 2 },
    verify: { method: "account_objects", params: { account: A, type: "ticket" } },
  },
  SignerListSet: {
    category: "multifirma",
    example: { TransactionType: "SignerListSet", Account: A, SignerQuorum: 2, SignerEntries: [{ SignerEntry: { Account: O, SignerWeight: 1 } }, { SignerEntry: { Account: I, SignerWeight: 1 } }] },
    hints: { SignerQuorum: "0 with no SignerEntries removes the list." },
    verify: { method: "account_objects", params: { account: A, type: "signer_list" } },
  },
  PaymentChannelCreate: {
    category: "canales",
    example: { TransactionType: "PaymentChannelCreate", Account: A, Destination: O, Amount: "5000000", SettleDelay: 86400, PublicKey: "{{pubkey}}" },
    hints: { PublicKey: "Public key (hex) you'll use to sign claims. Xaman uses the account's key.", SettleDelay: "Seconds the channel stays open after requesting closure." },
    verify: { method: "account_channels", params: { account: A } },
  },
  PaymentChannelFund: {
    category: "canales",
    example: { TransactionType: "PaymentChannelFund", Account: A, Channel: ZERO32, Amount: "1000000" },
    hints: { Channel: "Channel ID (64-hex hash). Check account_channels." },
  },
  PaymentChannelClaim: {
    category: "canales",
    example: { TransactionType: "PaymentChannelClaim", Account: A, Channel: ZERO32, Balance: "1000000", Amount: "1000000", Signature: "", PublicKey: "{{pubkey}}" },
    hints: { Signature: "Claim signature (hex) generated off-chain with the channel's key.", Balance: "Total accumulated amount to claim." },
  },
  CheckCreate: {
    category: "cheques",
    example: { TransactionType: "CheckCreate", Account: A, Destination: O, SendMax: "1000000", Expiration: "{{time+86400}}" },
    verify: { method: "account_objects", params: { account: A, type: "check" } },
  },
  CheckCash: {
    category: "cheques",
    example: { TransactionType: "CheckCash", Account: A, CheckID: ZERO32, Amount: "1000000" },
    hints: { CheckID: "ID of the Check object (index in account_objects).", DeliverMin: "Alternative to Amount: cash the most possible ≥ this minimum." },
  },
  CheckCancel: { category: "cheques", example: { TransactionType: "CheckCancel", Account: A, CheckID: ZERO32 } },
  DepositPreauth: {
    category: "permisos",
    example: { TransactionType: "DepositPreauth", Account: A, Authorize: O },
    prerequisites: ["Your account normally has asfDepositAuth enabled"],
    verify: { method: "account_objects", params: { account: A, type: "deposit_preauth" } },
  },
  TrustSet: {
    category: "tokens",
    example: { TransactionType: "TrustSet", Account: A, LimitAmount: { currency: "USD", issuer: I, value: "1000" }, Flags: 131072 },
    hints: { LimitAmount: "Maximum you accept to hold of that token.", Flags: "131072 = tfSetNoRipple." },
    verify: { method: "account_lines", params: { account: A } },
  },
  AccountDelete: {
    category: "cuenta",
    example: { TransactionType: "AccountDelete", Account: A, Destination: O },
    prerequisites: ["Account Sequence + 256 ≤ current ledger", "No objects blocking deletion (escrows, channels, trust lines…)", "Special fee: the incremental owner reserve"],
  },
  NFTokenMint: {
    category: "nft",
    example: { TransactionType: "NFTokenMint", Account: A, NFTokenTaxon: 0, Flags: 8, TransferFee: 500, URI: "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E" },
    hints: { URI: "Hex of the metadata URI.", TransferFee: "0-50000 (50000 = 50%). Requires tfTransferable.", Flags: "8 = tfTransferable." },
    verify: { method: "account_nfts", params: { account: A } },
  },
  NFTokenBurn: { category: "nft", example: { TransactionType: "NFTokenBurn", Account: A, NFTokenID: ZERO32 } },
  NFTokenCreateOffer: {
    category: "nft",
    example: { TransactionType: "NFTokenCreateOffer", Account: A, NFTokenID: ZERO32, Amount: "1000000", Flags: 1 },
    hints: { Flags: "1 = tfSellNFToken (sell offer). Without the flag it's a buy offer and you need Owner." },
    verify: { method: "nft_sell_offers", params: { nft_id: ZERO32 } },
  },
  NFTokenCancelOffer: { category: "nft", example: { TransactionType: "NFTokenCancelOffer", Account: A, NFTokenOffers: [ZERO32] } },
  NFTokenAcceptOffer: { category: "nft", example: { TransactionType: "NFTokenAcceptOffer", Account: A, NFTokenSellOffer: ZERO32 }, hints: { NFTokenBrokerFee: "Only in broker mode (with both offers)." } },
  Clawback: {
    category: "tokens",
    example: { TransactionType: "Clawback", Account: A, Amount: { currency: "USD", issuer: O, value: "10" } },
    hints: { Amount: "Here issuer is the HOLDER you're clawing back the tokens from, not you." },
    prerequisites: ["Your issuing account has asfAllowTrustLineClawback and does not have asfNoFreeze"],
  },
  AMMClawback: { category: "amm", example: { TransactionType: "AMMClawback", Account: A, Holder: O, Asset: { currency: "USD", issuer: A }, Asset2: { currency: "XRP" } } },
  AMMCreate: {
    category: "amm",
    example: { TransactionType: "AMMCreate", Account: A, Amount: "10000000", Amount2: { currency: "USD", issuer: I, value: "10" }, TradingFee: 500 },
    hints: { TradingFee: "In units of 1/100,000 (500 = 0.5%). Maximum 1000." },
    prerequisites: ["Balance of both assets", "Special fee: the incremental owner reserve"],
    verify: { method: "amm_info", params: { asset: { currency: "XRP" }, asset2: { currency: "USD", issuer: I } } },
  },
  AMMDeposit: { category: "amm", example: { TransactionType: "AMMDeposit", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, Amount: "1000000", Flags: 524288 }, hints: { Flags: "524288 = tfSingleAsset. See the flags list." } },
  AMMWithdraw: { category: "amm", example: { TransactionType: "AMMWithdraw", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, Flags: 131072 }, hints: { Flags: "131072 = tfWithdrawAll." } },
  AMMVote: { category: "amm", example: { TransactionType: "AMMVote", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I }, TradingFee: 300 } },
  AMMBid: { category: "amm", example: { TransactionType: "AMMBid", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I } } },
  AMMDelete: { category: "amm", example: { TransactionType: "AMMDelete", Account: A, Asset: { currency: "XRP" }, Asset2: { currency: "USD", issuer: I } }, prerequisites: ["The AMM is empty (no LP tokens)"] },
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
    hints: { URI: "Hex of the DID document URI.", DIDDocument: "Hex of the inline DID document." },
    verify: { method: "account_objects", params: { account: A, type: "did" } },
  },
  DIDDelete: { category: "identidad", example: { TransactionType: "DIDDelete", Account: A } },
  OracleSet: {
    category: "oraculos",
    example: { TransactionType: "OracleSet", Account: A, OracleDocumentID: 1, Provider: "70726F7669646572", AssetClass: "63757272656E6379", LastUpdateTime: "{{unix}}", PriceDataSeries: [{ PriceData: { BaseAsset: "XRP", QuoteAsset: "USD", AssetPrice: 2500, Scale: 4 } }] },
    hints: { LastUpdateTime: "UNIX timestamp (not Ripple Epoch), no more than 300s before the ledger closes.", AssetPrice: "Integer; the real value is AssetPrice / 10^Scale." },
    verify: { method: "get_aggregate_price", params: { base_asset: "XRP", quote_asset: "USD", oracles: [{ account: A, oracle_document_id: 1 }] } },
  },
  OracleDelete: { category: "oraculos", example: { TransactionType: "OracleDelete", Account: A, OracleDocumentID: 1 } },
  LedgerStateFix: { category: "sistema", example: { TransactionType: "LedgerStateFix", Account: A, LedgerFixType: 1, Owner: O }, hints: { LedgerFixType: "1 = repair NFTokenPage links of the Owner." } },
  MPTokenIssuanceCreate: {
    category: "mpt",
    example: { TransactionType: "MPTokenIssuanceCreate", Account: A, AssetScale: 2, MaximumAmount: "100000000", TransferFee: 100, Flags: 32, MPTokenMetadata: "7B226E616D65223A2244656D6F227D" },
    hints: { Flags: "32 = tfMPTCanTransfer. Combine tfMPT* flags per the list.", MPTokenMetadata: "Hex (max. 1024 bytes). See XLS-89 for the schema." },
    verify: { method: "account_objects", params: { account: A, type: "mpt_issuance" } },
  },
  MPTokenIssuanceDestroy: { category: "mpt", example: { TransactionType: "MPTokenIssuanceDestroy", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" } },
  MPTokenIssuanceSet: { category: "mpt", example: { TransactionType: "MPTokenIssuanceSet", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", Flags: 1 }, hints: { Flags: "1 = tfMPTLock, 2 = tfMPTUnlock.", Holder: "If specified, locks/unlocks only that holder." } },
  MPTokenAuthorize: { category: "mpt", example: { TransactionType: "MPTokenAuthorize", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" }, hints: { Holder: "Only used by the issuer to authorize a holder (issuances with tfMPTRequireAuth)." }, verify: { method: "account_objects", params: { account: A, type: "mptoken" } } },
  CredentialCreate: {
    category: "identidad",
    example: { TransactionType: "CredentialCreate", Account: A, Subject: O, CredentialType: "4B5943", Expiration: "{{time+2592000}}", URI: "68747470733A2F2F6578616D706C652E636F6D" },
    hints: { CredentialType: "Hex (1-64 bytes). 4B5943 = \"KYC\".", Subject: "Account receiving the credential; must accept it with CredentialAccept." },
    verify: { method: "account_objects", params: { account: A, type: "credential" } },
  },
  CredentialAccept: { category: "identidad", example: { TransactionType: "CredentialAccept", Account: A, Issuer: O, CredentialType: "4B5943" } },
  CredentialDelete: { category: "identidad", example: { TransactionType: "CredentialDelete", Account: A, Subject: O, CredentialType: "4B5943" } },
  NFTokenModify: { category: "nft", example: { TransactionType: "NFTokenModify", Account: A, NFTokenID: ZERO32, URI: "68747470733A2F2F6578616D706C652E636F6D2F76322E6A736F6E" }, prerequisites: ["The NFT was minted with tfMutable"] },
  PermissionedDomainSet: {
    category: "permisos",
    example: { TransactionType: "PermissionedDomainSet", Account: A, AcceptedCredentials: [{ Credential: { Issuer: O, CredentialType: "4B5943" } }] },
    hints: { DomainID: "Specify it to modify an existing domain." },
    verify: { method: "account_objects", params: { account: A, type: "permissioned_domain" } },
  },
  PermissionedDomainDelete: { category: "permisos", example: { TransactionType: "PermissionedDomainDelete", Account: A, DomainID: ZERO32 } },
  DelegateSet: {
    category: "permisos",
    example: { TransactionType: "DelegateSet", Account: A, Authorize: O, Permissions: [{ Permission: { PermissionValue: "Payment" } }, { Permission: { PermissionValue: "TrustlineAuthorize" } }] },
    hints: { Permissions: "Delegatable transaction type names or granular permissions (see /permissions)." },
    verify: { method: "account_objects", params: { account: A, type: "delegate" } },
  },
  VaultCreate: {
    category: "vault",
    example: { TransactionType: "VaultCreate", Account: A, Asset: { currency: "XRP" }, AssetsMaximum: "1000000000", Data: "7B7D", Flags: 0 },
    hints: { Flags: "1 = tfVaultPrivate (only accounts with domain credentials).", WithdrawalPolicy: "1 = vaultStrategyFirstComeFirstServe." },
    verify: { method: "account_objects", params: { account: A, type: "vault" } },
  },
  VaultSet: { category: "vault", example: { TransactionType: "VaultSet", Account: A, VaultID: ZERO32, AssetsMaximum: "2000000000" } },
  VaultDelete: { category: "vault", example: { TransactionType: "VaultDelete", Account: A, VaultID: ZERO32 }, prerequisites: ["The vault has no assets or shares outstanding"] },
  VaultDeposit: { category: "vault", example: { TransactionType: "VaultDeposit", Account: A, VaultID: ZERO32, Amount: "5000000" } },
  VaultWithdraw: { category: "vault", example: { TransactionType: "VaultWithdraw", Account: A, VaultID: ZERO32, Amount: "1000000" } },
  VaultClawback: { category: "vault", example: { TransactionType: "VaultClawback", Account: A, VaultID: ZERO32, Holder: O }, prerequisites: ["You are the issuer of the vault's asset"] },
  Batch: {
    category: "batch",
    example: { TransactionType: "Batch", Account: A, Flags: 65536, RawTransactions: [{ RawTransaction: { TransactionType: "Payment", Flags: 1073741824, Account: A, Destination: O, Amount: "1000000", Sequence: "{{seq+1}}", Fee: "0", SigningPubKey: "" } }, { RawTransaction: { TransactionType: "Payment", Flags: 1073741824, Account: A, Destination: I, Amount: "1000000", Sequence: "{{seq+2}}", Fee: "0", SigningPubKey: "" } }] },
    hints: { Flags: "65536 = tfAllOrNothing, 131072 = tfOnlyOne, 262144 = tfUntilFailure, 524288 = tfIndependent.", RawTransactions: "Each inner tx carries tfInnerBatchTxn (1073741824), Fee 0, empty SigningPubKey and its own Sequence." },
  },
  LoanBrokerSet: { category: "prestamos", example: { TransactionType: "LoanBrokerSet", Account: A, VaultID: ZERO32, ManagementFeeRate: 100, CoverRateMinimum: 1000, Data: "7B7D" }, hints: { ManagementFeeRate: "In 1/10,000 (100 = 1%)." } },
  LoanBrokerDelete: { category: "prestamos", example: { TransactionType: "LoanBrokerDelete", Account: A, LoanBrokerID: ZERO32 } },
  LoanBrokerCoverDeposit: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverDeposit", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanBrokerCoverWithdraw: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverWithdraw", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanBrokerCoverClawback: { category: "prestamos", example: { TransactionType: "LoanBrokerCoverClawback", Account: A, LoanBrokerID: ZERO32, Amount: "1000000" } },
  LoanSet: { category: "prestamos", example: { TransactionType: "LoanSet", Account: A, LoanBrokerID: ZERO32, PrincipalRequested: "10000000", InterestRate: 500, PaymentInterval: 604800, PaymentTotal: 4, CounterpartySignature: { CounterpartySignature: { Account: O, SigningPubKey: "", TxnSignature: "" } } }, hints: { CounterpartySignature: "The other party (borrower or broker) signs the same tx; paste it here." } },
  LoanDelete: { category: "prestamos", example: { TransactionType: "LoanDelete", Account: A, LoanID: ZERO32 } },
  LoanManage: { category: "prestamos", example: { TransactionType: "LoanManage", Account: A, LoanID: ZERO32, Flags: 65536 }, hints: { Flags: "See the tfLoan* flags list." } },
  LoanPay: { category: "prestamos", example: { TransactionType: "LoanPay", Account: A, LoanID: ZERO32, Amount: "2500000" } },
  ConfidentialMPTConvert: { category: "confidencial", example: { TransactionType: "ConfidentialMPTConvert", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100", HolderElGamalPublicKey: "", IssuerElGamalPublicKey: "" }, hints: { HolderElGamalPublicKey: "ElGamal public key (hex) of the holder. Requires external cryptographic tools." } },
  ConfidentialMPTMergeInbox: { category: "confidencial", example: { TransactionType: "ConfidentialMPTMergeInbox", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000" } },
  ConfidentialMPTConvertBack: { category: "confidencial", example: { TransactionType: "ConfidentialMPTConvertBack", Account: A, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100", ZKProof: "" } },
  ConfidentialMPTSend: { category: "confidencial", example: { TransactionType: "ConfidentialMPTSend", Account: A, Destination: O, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", HolderEncryptedAmount: "", DestinationEncryptedAmount: "", IssuerEncryptedAmount: "", AuditorEncryptedAmount: "", ZKProof: "" } },
  ConfidentialMPTClawback: { category: "confidencial", example: { TransactionType: "ConfidentialMPTClawback", Account: A, Holder: O, MPTokenIssuanceID: "000000000000000000000000000000000000000000000000", MPTAmount: "100" } },
  SponsorshipSet: { category: "permisos", example: { TransactionType: "SponsorshipSet", Account: A, Sponsor: O, Flags: 65536 }, hints: { Flags: "See tfSponsorship*." } },
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
