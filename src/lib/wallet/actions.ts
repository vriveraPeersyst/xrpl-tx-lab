/**
 * Actions available on each ledger object owned by the connected account.
 * Each action produces a prefilled transaction that opens in the builder (/tx/<Type>?prefill=…).
 */
export interface WalletAction { label: string; tx: Record<string, unknown>; kind?: "primary" | "danger" }

type Obj = Record<string, unknown>;
const s = (v: unknown) => (v == null ? undefined : String(v));

export function encodePrefill(tx: Record<string, unknown>): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(tx)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decodePrefill(p: string): Record<string, unknown> | undefined {
  try {
    const b = p.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b + "=".repeat((4 - (b.length % 4)) % 4)))));
  } catch {
    return undefined;
  }
}

export function actionsFor(o: Obj, account: string): WalletAction[] {
  const type = String(o.LedgerEntryType);
  const idx = s(o.index);
  switch (type) {
    case "RippleState": {
      const high = String(o.HighLimit && (o.HighLimit as Obj).issuer);
      const low = String(o.LowLimit && (o.LowLimit as Obj).issuer);
      const issuer = high === account ? low : high;
      const cur = String((o.Balance as Obj)?.currency);
      const myLimit = high === account ? (o.HighLimit as Obj).value : (o.LowLimit as Obj).value;
      return [
        { label: "Change limit", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: String(myLimit) } } },
        { label: "Send this token", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { currency: cur, issuer, value: "1" } }, kind: "primary" },
        { label: "Freeze", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: String(myLimit) }, Flags: 0x00100000 } },
        { label: "Close (limit 0)", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: "0" } }, kind: "danger" },
      ];
    }
    case "Offer":
      return [{ label: "Cancel offer", tx: { TransactionType: "OfferCancel", Account: account, OfferSequence: Number(o.Sequence) }, kind: "danger" }];
    case "Escrow":
      return [
        { label: "Finish", tx: { TransactionType: "EscrowFinish", Account: account, Owner: s(o.Account), OfferSequence: Number(o.Sequence) }, kind: "primary" },
        { label: "Cancel", tx: { TransactionType: "EscrowCancel", Account: account, Owner: s(o.Account), OfferSequence: Number(o.Sequence) }, kind: "danger" },
      ];
    case "PayChannel":
      return [
        { label: "Add funds", tx: { TransactionType: "PaymentChannelFund", Account: account, Channel: idx, Amount: "1000000" } },
        { label: "Claim / close", tx: { TransactionType: "PaymentChannelClaim", Account: account, Channel: idx, Flags: 0x00020000 } },
      ];
    case "Check":
      return o.Account === account
        ? [{ label: "Cancel check", tx: { TransactionType: "CheckCancel", Account: account, CheckID: idx }, kind: "danger" }]
        : [{ label: "Cash check", tx: { TransactionType: "CheckCash", Account: account, CheckID: idx, Amount: o.SendMax }, kind: "primary" }, { label: "Cancel", tx: { TransactionType: "CheckCancel", Account: account, CheckID: idx } }];
    case "Ticket":
      return [{ label: "Use in a Payment", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: "1000000", Sequence: 0, TicketSequence: Number(o.TicketSequence) } }];
    case "SignerList":
      return [{ label: "Modify list", tx: { TransactionType: "SignerListSet", Account: account, SignerQuorum: Number(o.SignerQuorum), SignerEntries: o.SignerEntries } }, { label: "Remove list", tx: { TransactionType: "SignerListSet", Account: account, SignerQuorum: 0 }, kind: "danger" }];
    case "DepositPreauth":
      return [{ label: "Revoke", tx: o.Authorize ? { TransactionType: "DepositPreauth", Account: account, Unauthorize: s(o.Authorize) } : { TransactionType: "DepositPreauth", Account: account, UnauthorizeCredentials: o.AuthorizeCredentials }, kind: "danger" }];
    case "NFTokenOffer":
      return [{ label: "Cancel offer", tx: { TransactionType: "NFTokenCancelOffer", Account: account, NFTokenOffers: [idx] }, kind: "danger" }];
    case "DID":
      return [{ label: "Update DID", tx: { TransactionType: "DIDSet", Account: account, URI: s(o.URI), Data: s(o.Data) } }, { label: "Delete DID", tx: { TransactionType: "DIDDelete", Account: account }, kind: "danger" }];
    case "Oracle":
      return [{ label: "Update prices", tx: { TransactionType: "OracleSet", Account: account, OracleDocumentID: Number(o.OracleDocumentID), LastUpdateTime: "{{unix}}", PriceDataSeries: o.PriceDataSeries } }, { label: "Delete oracle", tx: { TransactionType: "OracleDelete", Account: account, OracleDocumentID: Number(o.OracleDocumentID) }, kind: "danger" }];
    case "Credential":
      return o.Subject === account && !((Number(o.Flags) & 0x00010000) === 0x00010000)
        ? [{ label: "Accept credential", tx: { TransactionType: "CredentialAccept", Account: account, Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "primary" }, { label: "Reject (delete)", tx: { TransactionType: "CredentialDelete", Account: account, Subject: s(o.Subject), Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "danger" }]
        : [{ label: "Delete credential", tx: { TransactionType: "CredentialDelete", Account: account, Subject: s(o.Subject), Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "danger" }];
    case "PermissionedDomain":
      return [{ label: "Edit domain", tx: { TransactionType: "PermissionedDomainSet", Account: account, DomainID: idx, AcceptedCredentials: o.AcceptedCredentials } }, { label: "Delete domain", tx: { TransactionType: "PermissionedDomainDelete", Account: account, DomainID: idx }, kind: "danger" }];
    case "Delegate":
      return [{ label: "Edit permissions", tx: { TransactionType: "DelegateSet", Account: account, Authorize: s(o.Authorize), Permissions: o.Permissions } }, { label: "Revoke all", tx: { TransactionType: "DelegateSet", Account: account, Authorize: s(o.Authorize), Permissions: [] }, kind: "danger" }];
    case "MPTokenIssuance":
      return [
        { label: "Lock all", tx: { TransactionType: "MPTokenIssuanceSet", Account: account, MPTokenIssuanceID: s(o.mpt_issuance_id ?? idx), Flags: 1 } },
        { label: "Send MPT", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { mpt_issuance_id: s(o.mpt_issuance_id ?? idx), value: "1" } }, kind: "primary" },
        { label: "Destroy issuance", tx: { TransactionType: "MPTokenIssuanceDestroy", Account: account, MPTokenIssuanceID: s(o.mpt_issuance_id ?? idx) }, kind: "danger" },
      ];
    case "MPToken":
      return [{ label: "Send MPT", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { mpt_issuance_id: s(o.MPTokenIssuanceID), value: "1" } }, kind: "primary" }, { label: "Stop holding (unauthorize)", tx: { TransactionType: "MPTokenAuthorize", Account: account, MPTokenIssuanceID: s(o.MPTokenIssuanceID), Flags: 1 }, kind: "danger" }];
    case "Vault":
      return [{ label: "Deposit", tx: { TransactionType: "VaultDeposit", Account: account, VaultID: idx, Amount: "1000000" }, kind: "primary" }, { label: "Withdraw", tx: { TransactionType: "VaultWithdraw", Account: account, VaultID: idx, Amount: "1000000" } }, { label: "Delete vault", tx: { TransactionType: "VaultDelete", Account: account, VaultID: idx }, kind: "danger" }];
    case "LoanBroker":
      return [{ label: "Deposit cover", tx: { TransactionType: "LoanBrokerCoverDeposit", Account: account, LoanBrokerID: idx, Amount: "1000000" } }, { label: "Delete broker", tx: { TransactionType: "LoanBrokerDelete", Account: account, LoanBrokerID: idx }, kind: "danger" }];
    case "Loan":
      return [{ label: "Pay installment", tx: { TransactionType: "LoanPay", Account: account, LoanID: idx, Amount: "1000000" }, kind: "primary" }, { label: "Manage", tx: { TransactionType: "LoanManage", Account: account, LoanID: idx, Flags: 65536 } }];
    case "Sponsorship":
      return [{ label: "Transfer sponsorship", tx: { TransactionType: "SponsorshipTransfer", Account: account, Sponsor: s(o.Sponsor), Flags: 65536 } }];
    case "Bridge":
      return [{ label: "Modify bridge", tx: { TransactionType: "XChainModifyBridge", Account: account, XChainBridge: o.XChainBridge, SignatureReward: s(o.SignatureReward) } }];
    case "XChainOwnedClaimID":
      return [{ label: "Claim", tx: { TransactionType: "XChainClaim", Account: account, XChainBridge: o.XChainBridge, XChainClaimID: s(o.XChainClaimID), Destination: account, Amount: "1000000" }, kind: "primary" }];
    default:
      return [];
  }
}

/** Actions on an NFT (from account_nfts). */
export function nftActions(nft: Obj, account: string): WalletAction[] {
  const id = String(nft.NFTokenID);
  return [
    { label: "Sell", tx: { TransactionType: "NFTokenCreateOffer", Account: account, NFTokenID: id, Amount: "1000000", Flags: 1 }, kind: "primary" },
    { label: "Gift", tx: { TransactionType: "NFTokenCreateOffer", Account: account, NFTokenID: id, Amount: "0", Flags: 1, Destination: "{{other}}" } },
    { label: "Modify URI", tx: { TransactionType: "NFTokenModify", Account: account, NFTokenID: id, URI: String(nft.URI ?? "") } },
    { label: "Burn", tx: { TransactionType: "NFTokenBurn", Account: account, NFTokenID: id }, kind: "danger" },
  ];
}

/** Quick account actions. */
export function quickActions(account: string): WalletAction[] {
  return [
    { label: "Send XRP", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: "1000000" }, kind: "primary" },
    { label: "Open trust line", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: "USD", issuer: "{{issuer}}", value: "1000" } } },
    { label: "Create escrow", tx: { TransactionType: "EscrowCreate", Account: account, Destination: "{{other}}", Amount: "2000000", FinishAfter: "{{time+120}}", CancelAfter: "{{time+86400}}" } },
    { label: "Issue check", tx: { TransactionType: "CheckCreate", Account: account, Destination: "{{other}}", SendMax: "1000000" } },
    { label: "Mint NFT", tx: { TransactionType: "NFTokenMint", Account: account, NFTokenTaxon: 0, Flags: 8, URI: "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E" } },
    { label: "Create DEX offer", tx: { TransactionType: "OfferCreate", Account: account, TakerGets: "1000000", TakerPays: { currency: "USD", issuer: "{{issuer}}", value: "1" } } },
    { label: "Issue MPT", tx: { TransactionType: "MPTokenIssuanceCreate", Account: account, AssetScale: 2, MaximumAmount: "100000000", Flags: 32 } },
    { label: "Configure account", tx: { TransactionType: "AccountSet", Account: account, SetFlag: 8 } },
    { label: "Reserve tickets", tx: { TransactionType: "TicketCreate", Account: account, TicketCount: 2 } },
    { label: "Set DID", tx: { TransactionType: "DIDSet", Account: account, URI: "697066733A2F2F6578616D706C65" } },
    { label: "Publish oracle", tx: { TransactionType: "OracleSet", Account: account, OracleDocumentID: 1, Provider: "70726F7669646572", AssetClass: "63757272656E6379", LastUpdateTime: "{{unix}}", PriceDataSeries: [{ PriceData: { BaseAsset: "XRP", QuoteAsset: "USD", AssetPrice: 2500, Scale: 4 } }] } },
    { label: "Issue credential", tx: { TransactionType: "CredentialCreate", Account: account, Subject: "{{other}}", CredentialType: "4B5943" } },
  ];
}
