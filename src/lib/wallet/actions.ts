/**
 * Acciones disponibles sobre cada objeto del ledger que posee la cuenta conectada.
 * Cada acción produce una transacción prerrellenada que se abre en el builder (/tx/<Type>?prefill=…).
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
        { label: "Cambiar límite", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: String(myLimit) } } },
        { label: "Enviar este token", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { currency: cur, issuer, value: "1" } }, kind: "primary" },
        { label: "Congelar", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: String(myLimit) }, Flags: 0x00100000 } },
        { label: "Cerrar (límite 0)", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: cur, issuer, value: "0" } }, kind: "danger" },
      ];
    }
    case "Offer":
      return [{ label: "Cancelar oferta", tx: { TransactionType: "OfferCancel", Account: account, OfferSequence: Number(o.Sequence) }, kind: "danger" }];
    case "Escrow":
      return [
        { label: "Finalizar", tx: { TransactionType: "EscrowFinish", Account: account, Owner: s(o.Account), OfferSequence: Number(o.Sequence) }, kind: "primary" },
        { label: "Cancelar", tx: { TransactionType: "EscrowCancel", Account: account, Owner: s(o.Account), OfferSequence: Number(o.Sequence) }, kind: "danger" },
      ];
    case "PayChannel":
      return [
        { label: "Añadir fondos", tx: { TransactionType: "PaymentChannelFund", Account: account, Channel: idx, Amount: "1000000" } },
        { label: "Reclamar / cerrar", tx: { TransactionType: "PaymentChannelClaim", Account: account, Channel: idx, Flags: 0x00020000 } },
      ];
    case "Check":
      return o.Account === account
        ? [{ label: "Cancelar cheque", tx: { TransactionType: "CheckCancel", Account: account, CheckID: idx }, kind: "danger" }]
        : [{ label: "Cobrar cheque", tx: { TransactionType: "CheckCash", Account: account, CheckID: idx, Amount: o.SendMax }, kind: "primary" }, { label: "Cancelar", tx: { TransactionType: "CheckCancel", Account: account, CheckID: idx } }];
    case "Ticket":
      return [{ label: "Usar en un Payment", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: "1000000", Sequence: 0, TicketSequence: Number(o.TicketSequence) } }];
    case "SignerList":
      return [{ label: "Modificar lista", tx: { TransactionType: "SignerListSet", Account: account, SignerQuorum: Number(o.SignerQuorum), SignerEntries: o.SignerEntries } }, { label: "Eliminar lista", tx: { TransactionType: "SignerListSet", Account: account, SignerQuorum: 0 }, kind: "danger" }];
    case "DepositPreauth":
      return [{ label: "Revocar", tx: o.Authorize ? { TransactionType: "DepositPreauth", Account: account, Unauthorize: s(o.Authorize) } : { TransactionType: "DepositPreauth", Account: account, UnauthorizeCredentials: o.AuthorizeCredentials }, kind: "danger" }];
    case "NFTokenOffer":
      return [{ label: "Cancelar oferta", tx: { TransactionType: "NFTokenCancelOffer", Account: account, NFTokenOffers: [idx] }, kind: "danger" }];
    case "DID":
      return [{ label: "Actualizar DID", tx: { TransactionType: "DIDSet", Account: account, URI: s(o.URI), Data: s(o.Data) } }, { label: "Borrar DID", tx: { TransactionType: "DIDDelete", Account: account }, kind: "danger" }];
    case "Oracle":
      return [{ label: "Actualizar precios", tx: { TransactionType: "OracleSet", Account: account, OracleDocumentID: Number(o.OracleDocumentID), LastUpdateTime: "{{unix}}", PriceDataSeries: o.PriceDataSeries } }, { label: "Borrar oráculo", tx: { TransactionType: "OracleDelete", Account: account, OracleDocumentID: Number(o.OracleDocumentID) }, kind: "danger" }];
    case "Credential":
      return o.Subject === account && !((Number(o.Flags) & 0x00010000) === 0x00010000)
        ? [{ label: "Aceptar credencial", tx: { TransactionType: "CredentialAccept", Account: account, Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "primary" }, { label: "Rechazar (borrar)", tx: { TransactionType: "CredentialDelete", Account: account, Subject: s(o.Subject), Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "danger" }]
        : [{ label: "Borrar credencial", tx: { TransactionType: "CredentialDelete", Account: account, Subject: s(o.Subject), Issuer: s(o.Issuer), CredentialType: s(o.CredentialType) }, kind: "danger" }];
    case "PermissionedDomain":
      return [{ label: "Editar dominio", tx: { TransactionType: "PermissionedDomainSet", Account: account, DomainID: idx, AcceptedCredentials: o.AcceptedCredentials } }, { label: "Borrar dominio", tx: { TransactionType: "PermissionedDomainDelete", Account: account, DomainID: idx }, kind: "danger" }];
    case "Delegate":
      return [{ label: "Editar permisos", tx: { TransactionType: "DelegateSet", Account: account, Authorize: s(o.Authorize), Permissions: o.Permissions } }, { label: "Revocar todo", tx: { TransactionType: "DelegateSet", Account: account, Authorize: s(o.Authorize), Permissions: [] }, kind: "danger" }];
    case "MPTokenIssuance":
      return [
        { label: "Bloquear todo", tx: { TransactionType: "MPTokenIssuanceSet", Account: account, MPTokenIssuanceID: s(o.mpt_issuance_id ?? idx), Flags: 1 } },
        { label: "Enviar MPT", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { mpt_issuance_id: s(o.mpt_issuance_id ?? idx), value: "1" } }, kind: "primary" },
        { label: "Destruir emisión", tx: { TransactionType: "MPTokenIssuanceDestroy", Account: account, MPTokenIssuanceID: s(o.mpt_issuance_id ?? idx) }, kind: "danger" },
      ];
    case "MPToken":
      return [{ label: "Enviar MPT", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: { mpt_issuance_id: s(o.MPTokenIssuanceID), value: "1" } }, kind: "primary" }, { label: "Dejar de tener (unauthorize)", tx: { TransactionType: "MPTokenAuthorize", Account: account, MPTokenIssuanceID: s(o.MPTokenIssuanceID), Flags: 1 }, kind: "danger" }];
    case "Vault":
      return [{ label: "Depositar", tx: { TransactionType: "VaultDeposit", Account: account, VaultID: idx, Amount: "1000000" }, kind: "primary" }, { label: "Retirar", tx: { TransactionType: "VaultWithdraw", Account: account, VaultID: idx, Amount: "1000000" } }, { label: "Borrar vault", tx: { TransactionType: "VaultDelete", Account: account, VaultID: idx }, kind: "danger" }];
    case "LoanBroker":
      return [{ label: "Depositar cobertura", tx: { TransactionType: "LoanBrokerCoverDeposit", Account: account, LoanBrokerID: idx, Amount: "1000000" } }, { label: "Borrar broker", tx: { TransactionType: "LoanBrokerDelete", Account: account, LoanBrokerID: idx }, kind: "danger" }];
    case "Loan":
      return [{ label: "Pagar cuota", tx: { TransactionType: "LoanPay", Account: account, LoanID: idx, Amount: "1000000" }, kind: "primary" }, { label: "Gestionar", tx: { TransactionType: "LoanManage", Account: account, LoanID: idx, Flags: 65536 } }];
    case "Sponsorship":
      return [{ label: "Transferir patrocinio", tx: { TransactionType: "SponsorshipTransfer", Account: account, Sponsor: s(o.Sponsor), Flags: 65536 } }];
    case "Bridge":
      return [{ label: "Modificar puente", tx: { TransactionType: "XChainModifyBridge", Account: account, XChainBridge: o.XChainBridge, SignatureReward: s(o.SignatureReward) } }];
    case "XChainOwnedClaimID":
      return [{ label: "Reclamar", tx: { TransactionType: "XChainClaim", Account: account, XChainBridge: o.XChainBridge, XChainClaimID: s(o.XChainClaimID), Destination: account, Amount: "1000000" }, kind: "primary" }];
    default:
      return [];
  }
}

/** Acciones sobre un NFT (de account_nfts). */
export function nftActions(nft: Obj, account: string): WalletAction[] {
  const id = String(nft.NFTokenID);
  return [
    { label: "Vender", tx: { TransactionType: "NFTokenCreateOffer", Account: account, NFTokenID: id, Amount: "1000000", Flags: 1 }, kind: "primary" },
    { label: "Regalar", tx: { TransactionType: "NFTokenCreateOffer", Account: account, NFTokenID: id, Amount: "0", Flags: 1, Destination: "{{other}}" } },
    { label: "Modificar URI", tx: { TransactionType: "NFTokenModify", Account: account, NFTokenID: id, URI: String(nft.URI ?? "") } },
    { label: "Quemar", tx: { TransactionType: "NFTokenBurn", Account: account, NFTokenID: id }, kind: "danger" },
  ];
}

/** Acciones rápidas de la cuenta. */
export function quickActions(account: string): WalletAction[] {
  return [
    { label: "Enviar XRP", tx: { TransactionType: "Payment", Account: account, Destination: "{{other}}", Amount: "1000000" }, kind: "primary" },
    { label: "Abrir trust line", tx: { TransactionType: "TrustSet", Account: account, LimitAmount: { currency: "USD", issuer: "{{issuer}}", value: "1000" } } },
    { label: "Crear escrow", tx: { TransactionType: "EscrowCreate", Account: account, Destination: "{{other}}", Amount: "2000000", FinishAfter: "{{time+120}}", CancelAfter: "{{time+86400}}" } },
    { label: "Emitir cheque", tx: { TransactionType: "CheckCreate", Account: account, Destination: "{{other}}", SendMax: "1000000" } },
    { label: "Acuñar NFT", tx: { TransactionType: "NFTokenMint", Account: account, NFTokenTaxon: 0, Flags: 8, URI: "68747470733A2F2F6578616D706C652E636F6D2F6E66742E6A736F6E" } },
    { label: "Crear oferta DEX", tx: { TransactionType: "OfferCreate", Account: account, TakerGets: "1000000", TakerPays: { currency: "USD", issuer: "{{issuer}}", value: "1" } } },
    { label: "Emitir MPT", tx: { TransactionType: "MPTokenIssuanceCreate", Account: account, AssetScale: 2, MaximumAmount: "100000000", Flags: 32 } },
    { label: "Configurar cuenta", tx: { TransactionType: "AccountSet", Account: account, SetFlag: 8 } },
    { label: "Reservar tickets", tx: { TransactionType: "TicketCreate", Account: account, TicketCount: 2 } },
    { label: "Fijar DID", tx: { TransactionType: "DIDSet", Account: account, URI: "697066733A2F2F6578616D706C65" } },
    { label: "Publicar oráculo", tx: { TransactionType: "OracleSet", Account: account, OracleDocumentID: 1, Provider: "70726F7669646572", AssetClass: "63757272656E6379", LastUpdateTime: "{{unix}}", PriceDataSeries: [{ PriceData: { BaseAsset: "XRP", QuoteAsset: "USD", AssetPrice: 2500, Scale: 4 } }] } },
    { label: "Emitir credencial", tx: { TransactionType: "CredentialCreate", Account: account, Subject: "{{other}}", CredentialType: "4B5943" } },
  ];
}
