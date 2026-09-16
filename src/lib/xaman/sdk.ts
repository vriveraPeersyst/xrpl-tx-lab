/**
 * Loader for the Xaman Universal SDK via the official CDN (same pattern as onehextwo-v2/web):
 * no npm dependency, PUBLIC API key (browser OAuth2 PKCE flow), singleton
 * (instantiating more than once breaks the PKCE session). Docs: https://docs.xaman.dev/environments/browser-web3
 */
const CDN_URL = "https://xumm.app/assets/cdn/xumm.min.js";

export interface XummCreatedPayload {
  uuid: string;
  next: { always: string; no_push_msg_received?: string };
  refs: { qr_png: string; qr_matrix: string; qr_uri_quality_opts: string[]; websocket_status: string };
  pushed: boolean;
}
export interface XummResolvedPayload {
  meta: { exists: boolean; uuid: string; signed: boolean; cancelled: boolean; expired: boolean; resolved: boolean; return_url_app?: string; return_url_web?: string };
  payload: { tx_type: string; request_json: Record<string, unknown> };
  response: { hex?: string; txid?: string; account?: string; resolved_at?: string; dispatched_to?: string; dispatched_result?: string; dispatched_nodetype?: string; multisign_account?: string };
}
export interface XummPayloadOptions { submit?: boolean; multisign?: boolean; expire?: number; force_network?: string; return_url?: { app?: string; web?: string }; instruction?: string }
export interface XummPostPayload { txjson: Record<string, unknown>; options?: XummPayloadOptions; custom_meta?: { identifier?: string; instruction?: string; blob?: Record<string, unknown> } }
export interface XummPayloadApi {
  create(payload: XummPostPayload, returnErrors?: boolean): Promise<XummCreatedPayload | null>;
  get(uuid: string): Promise<XummResolvedPayload | null>;
  createAndSubscribe(payload: XummPostPayload, onEvent?: (event: { data: Record<string, unknown>; uuid: string }) => unknown): Promise<{ created: XummCreatedPayload; resolved: Promise<XummResolvedPayload> }>;
  cancel(uuid: string): Promise<unknown>;
}
export interface XummInstance {
  authorize(): Promise<unknown>;
  logout(): Promise<unknown>;
  on(event: "ready" | "success" | "retrieved" | "logout" | "error", cb: (...a: unknown[]) => void): void;
  user: { account: Promise<string | undefined>; name: Promise<string | undefined>; picture: Promise<string | undefined>; networkType: Promise<string | undefined>; networkEndpoint: Promise<string | undefined>; token: Promise<string | undefined> };
  environment: { jwt: Promise<{ network_type?: string; network_endpoint?: string; [k: string]: unknown } | undefined>; ott?: Promise<unknown> };
  payload?: XummPayloadApi;
  runtime: { xapp: boolean; browser: boolean; cli: boolean };
}
type XummConstructor = new (apiKey: string, apiSecretOrOptions?: unknown) => XummInstance;

declare global {
  interface Window { Xumm?: XummConstructor }
}

let scriptPromise: Promise<XummConstructor> | undefined;
let instance: XummInstance | undefined;

function loadConstructor(): Promise<XummConstructor> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<XummConstructor>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Xaman SDK only runs in the browser"));
    if (typeof window.Xumm === "function") return resolve(window.Xumm);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CDN_URL}"]`);
    const script = existing ?? document.createElement("script");
    const done = () => (typeof window.Xumm === "function" ? resolve(window.Xumm) : reject(new Error("The Xaman bundle did not expose window.Xumm")));
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load the Xaman SDK")), { once: true });
    if (!existing) {
      script.src = CDN_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.referrerPolicy = "no-referrer";
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export async function getXumm(apiKey: string): Promise<XummInstance> {
  if (instance) return instance;
  if (!apiKey) throw new Error("Missing NEXT_PUBLIC_XAMAN_API_KEY");
  const Xumm = await loadConstructor();
  instance = new Xumm(apiKey);
  return instance;
}

export function getXummInstance(): XummInstance | undefined {
  return instance;
}

export const XAMAN_API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY ?? "";
/** All payloads are forced to TESTNET: this site only operates on the test network. */
export const XAMAN_FORCE_NETWORK = "TESTNET";
