import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";
import { XamanProvider } from "@/lib/xaman/provider";
import { ConnectButton } from "@/components/ConnectButton";
import { testnet, protocol } from "@/lib/protocol";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["200", "300", "400"] });

export const metadata: Metadata = {
  title: { default: "XRPL Tx Lab", template: "%s · XRPL Tx Lab" },
  description: "Educational lab for the XRPL Testnet: every transaction, object and amendment, explained from the xrpld source code and executable with Xaman.",
};

const NAV = [
  ["/tx", "Transactions"],
  ["/objects", "Objects"],
  ["/amendments", "Amendments"],
  ["/reserves", "Reserves & fees"],
  ["/results", "Results"],
  ["/fields", "Fields"],
  ["/permissions", "Permissions"],
  ["/account", "Wallet"],
] as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-screen">
        <XamanProvider>
          <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
              <Link href="/" className="flex items-center gap-3">
                <Image src="/brand/symbol-black.svg" alt="XRP Ledger" width={26} height={22} className="block" priority />
                <Image src="/brand/symbol-white.svg" alt="XRP Ledger" width={26} height={22} className="hidden" priority />
                <span className="text-sm font-medium">Tx Lab</span>
                <span className="badge bg-accent text-black">testnet</span>
              </Link>
              <nav className="hidden gap-4 text-sm md:flex">
                {NAV.map(([href, label]) => <Link key={href} href={href} className="text-muted hover:text-fg">{label}</Link>)}
              </nav>
              <div className="ml-auto flex items-center gap-4">
                <Link href="/sync" className="hidden text-xs text-muted hover:text-fg lg:block" title="Sync status">xrpld {testnet.buildVersion}</Link>
                <ConnectButton />
              </div>
            </div>
            <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-sm md:hidden">
              {NAV.map(([href, label]) => <Link key={href} href={href} className="whitespace-nowrap text-muted hover:text-fg">{label}</Link>)}
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
          <footer className="border-t border-border">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-xs text-muted md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <Image src="/brand/logo-black.svg" alt="XRP Ledger" width={140} height={27} className="block" />
                <Image src="/brand/logo-white.svg" alt="XRP Ledger" width={140} height={27} className="hidden" />
                <p>Educational lab. Testnet only: nothing you do here has real value.</p>
              </div>
              <p className="max-w-xl">Data extracted from the <a className="link" href={protocol.source.repo} target="_blank" rel="noreferrer">XRPLF/rippled</a> source code ({protocol.source.branch} @ {protocol.source.commit?.slice(0, 8)}) and from the XRPL Testnet (ledger {testnet.validatedLedger.seq.toLocaleString("en-US")}, {new Date(testnet.fetchedAt).toLocaleString("en-US")}).</p>
            </div>
          </footer>
        </XamanProvider>
      </body>
    </html>
  );
}
