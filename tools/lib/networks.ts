/** Network list for the tools (mirrors src/lib/networks.ts without the Next alias). */
export interface ToolNetwork { id: string; label: string; rpc: string[] }
export const NETWORKS: ToolNetwork[] = [
  { id: "testnet", label: "Testnet", rpc: ["https://s.altnet.rippletest.net:51234/", "https://testnet.xrpl-labs.com/"] },
  { id: "devnet", label: "Devnet", rpc: ["https://s.devnet.rippletest.net:51234/"] },
  { id: "amm-devnet", label: "AMM Devnet", rpc: ["https://amm.devnet.rippletest.net:51234/"] },
  { id: "lending-devnet", label: "Lending Devnet", rpc: ["https://lend.devnet.rippletest.net:51234/"] },
  { id: "wasm-devnet", label: "WASM Devnet", rpc: ["https://wasm.devnet.rippletest.net:51234/"] },
];
export const NETWORK_IDS = NETWORKS.map((n) => n.id);
