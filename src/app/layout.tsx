import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { XamanProvider } from "@/lib/xaman/provider";
import { ConnectButton } from "@/components/ConnectButton";
import { testnet, protocol } from "@/lib/protocol";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "XRPL Tx Lab", template: "%s · XRPL Tx Lab" },
  description: "Laboratorio educativo de la XRPL Testnet: todas las transacciones, objetos y amendments, explicados desde el código de xrpld y ejecutables con Xaman.",
};

const NAV = [
  ["/tx", "Transacciones"],
  ["/objects", "Objetos"],
  ["/amendments", "Amendments"],
  ["/results", "Resultados"],
  ["/fields", "Campos"],
  ["/permissions", "Permisos"],
  ["/reserves", "Reservas y fees"],
  ["/account", "Mi cuenta"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <XamanProvider>
          <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
              <Link href="/" className="flex items-baseline gap-2 font-semibold"><span className="text-accent">XRPL</span> Tx Lab <span className="badge bg-warning/15 text-warning">testnet</span></Link>
              <nav className="hidden gap-1 text-sm md:flex">
                {NAV.map(([href, label]) => <Link key={href} href={href} className="rounded px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg">{label}</Link>)}
              </nav>
              <div className="ml-auto flex items-center gap-3">
                <Link href="/sync" className="hidden text-xs text-muted hover:text-fg sm:block" title="Estado de sincronización">xrpld {testnet.buildVersion} · fuente {protocol.source.version}</Link>
                <ConnectButton />
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-4 pb-2 text-sm md:hidden">
              {NAV.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap rounded px-2 py-1 text-muted hover:bg-surface-2">{label}</Link>)}
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 py-8 text-xs text-muted">
            Datos extraídos del código de <a className="link" href={protocol.source.repo} target="_blank" rel="noreferrer">XRPLF/rippled</a> ({protocol.source.branch} @ {protocol.source.commit?.slice(0, 8)}) y de la XRPL Testnet ({testnet.rpc}, ledger {testnet.validatedLedger.seq}, {new Date(testnet.fetchedAt).toLocaleString("es-ES")}). Solo testnet: nada de lo que hagas aquí tiene valor real.
          </footer>
        </XamanProvider>
      </body>
    </html>
  );
}
