import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NETWORKS, isNetworkId } from "@/lib/networks";
import { getNet, availableNetworkIds } from "@/lib/protocol";
import { NetworkProvider } from "@/lib/net-context";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ConnectButton } from "@/components/ConnectButton";

export function generateStaticParams() {
  return availableNetworkIds().map((net) => ({ net }));
}

const NAV = [
  ["tx", "Transactions"],
  ["objects", "Objects"],
  ["amendments", "Amendments"],
  ["reserves", "Reserves & fees"],
  ["results", "Results"],
  ["fields", "Fields"],
  ["permissions", "Permissions"],
  ["account", "Wallet"],
] as const;

export default async function NetLayout({ children, params }: { children: React.ReactNode; params: Promise<{ net: string }> }) {
  const { net } = await params;
  if (!isNetworkId(net) || !availableNetworkIds().includes(net)) notFound();
  const d = getNet(net);
  const available = availableNetworkIds();
  return (
    <NetworkProvider id={net}>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3">
          <Link href={`/${net}`} className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Image src="/brand/symbol-black.svg" alt="XRP Ledger" width={26} height={22} priority />
            <span className="text-sm font-medium">Tx Lab</span>
          </Link>
          <nav className="hidden gap-4 text-sm lg:flex">
            {NAV.map(([href, label]) => <Link key={href} href={`/${net}/${href}`} className="whitespace-nowrap text-muted hover:text-fg">{label}</Link>)}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <NetworkSwitcher available={available} />
            <Link href={`/${net}/sync`} className="hidden whitespace-nowrap text-xs text-muted hover:text-fg xl:block" title="Sync status">xrpld {d.snapshot.buildVersion}</Link>
            <ConnectButton />
          </div>
        </div>
        <nav className="flex gap-4 overflow-x-auto px-4 pb-2 text-sm lg:hidden">
          {NAV.map(([href, label]) => <Link key={href} href={`/${net}/${href}`} className="whitespace-nowrap text-muted hover:text-fg">{label}</Link>)}
        </nav>
      </header>
      {d.network.preview && (
        <div className="border-b border-border bg-[#dbf15e] text-black">
          <div className="mx-auto max-w-7xl px-4 py-1.5 text-xs">{d.network.label} is a preview network (id {d.snapshot.networkId}): it may reset or go offline without notice. {d.network.xaman ? "" : "Xaman cannot sign on this network; use Simulate or copy the JSON to another signer."}</div>
        </div>
      )}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-xs text-muted md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <Image src="/brand/logo-black.svg" alt="XRP Ledger" width={140} height={27} />
            <p>Educational lab. Test networks only: nothing you do here has real value.</p>
            <p>Networks: {NETWORKS.map((n) => <Link key={n.id} href={`/${n.id}`} className={`mr-2 ${n.id === net ? "text-fg" : ""} ${available.includes(n.id) ? "hover:underline" : "opacity-50"}`}>{n.label}</Link>)}</p>
          </div>
          <p className="max-w-xl">Data extracted from <a className="link" href={d.protocol.source.repo} target="_blank" rel="noreferrer">XRPLF/rippled</a> ({d.protocol.source.branch} @ {d.protocol.source.commit?.slice(0, 8)}) and from {d.network.label} ({d.snapshot.rpc}, ledger {d.snapshot.validatedLedger.seq.toLocaleString("en-US")}, {new Date(d.snapshot.fetchedAt).toLocaleString("en-US")}).</p>
        </div>
      </footer>
    </NetworkProvider>
  );
}
