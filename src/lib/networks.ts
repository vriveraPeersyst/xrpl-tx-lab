/**
 * Public XRPL test networks supported by the lab. Each one gets its own snapshot
 * (server_definitions + feature) and its own protocol.json extracted from the rippled
 * source that matches the version it runs. Order = order in the network switcher.
 */
export interface Network {
  id: string;
  label: string;
  short: string;
  blurb: string;
  /** JSON-RPC endpoints, tried in order (browser-friendly first). */
  rpc: string[];
  ws: string;
  faucet?: string;
  explorer?: string;
  /** Xaman `force_network` value; undefined = Xaman cannot sign on this network. */
  xaman?: string;
  /** Preview networks may reset or go down without notice. */
  preview?: boolean;
  /** Real network: transactions cost real XRP. */
  mainnet?: boolean;
}

export const NETWORKS: Network[] = [
  {
    id: "mainnet",
    label: "Mainnet",
    short: "mainnet",
    blurb: "The production XRP Ledger. Transactions cost real XRP and cannot be undone.",
    rpc: ["https://xrplcluster.com/", "https://s1.ripple.com:51234/", "https://s2.ripple.com:51234/"],
    ws: "wss://xrplcluster.com",
    explorer: "https://livenet.xrpl.org",
    xaman: "MAINNET",
    mainnet: true,
  },
  {
    id: "testnet",
    label: "Testnet",
    short: "testnet",
    blurb: "Mainnet-like environment: same amendments as Mainnet plus the ones about to activate.",
    rpc: ["https://testnet.xrpl-labs.com/", "https://s.altnet.rippletest.net:51234/"],
    ws: "wss://s.altnet.rippletest.net:51233",
    faucet: "https://faucet.altnet.rippletest.net/accounts",
    explorer: "https://testnet.xrpl.org",
    xaman: "TESTNET",
  },
  {
    id: "devnet",
    label: "Devnet",
    short: "devnet",
    blurb: "Preview of upcoming amendments before they reach Testnet.",
    rpc: ["https://s.devnet.rippletest.net:51234/"],
    ws: "wss://s.devnet.rippletest.net:51233",
    faucet: "https://faucet.devnet.rippletest.net/accounts",
    explorer: "https://devnet.xrpl.org",
    xaman: "DEVNET",
    preview: true,
  },
  {
    id: "amm-devnet",
    label: "AMM Devnet",
    short: "amm",
    blurb: "Feature devnet for the automated market maker (network id 25).",
    rpc: ["https://amm.devnet.rippletest.net:51234/"],
    ws: "wss://amm.devnet.rippletest.net:51233",
    preview: true,
  },
  {
    id: "lending-devnet",
    label: "Lending Devnet",
    short: "lending",
    blurb: "Preview of the XLS-66 Lending Protocol (LoanBroker, Loan, Vault).",
    rpc: ["https://lend.devnet.rippletest.net:51234/"],
    ws: "wss://lend.devnet.rippletest.net:51233",
    faucet: "https://lendfaucet.devnet.rippletest.net/accounts",
    preview: true,
  },
  {
    id: "wasm-devnet",
    label: "WASM Devnet",
    short: "wasm",
    blurb: "Preview of XLS-100 Smart Escrows and WASM programmability (network id 2002).",
    rpc: ["https://wasm.devnet.rippletest.net:51234/"],
    ws: "wss://wasm.devnet.rippletest.net:51233",
    faucet: "https://wasmfaucet.devnet.rippletest.net/accounts",
    preview: true,
  },
];

export const DEFAULT_NETWORK = "testnet";
export const NETWORK_IDS = NETWORKS.map((n) => n.id);
export function getNetwork(id: string): Network {
  return NETWORKS.find((n) => n.id === id) ?? NETWORKS[0];
}
export function isNetworkId(id: string): boolean {
  return NETWORKS.some((n) => n.id === id);
}
