import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import { XamanProvider } from "@/lib/xaman/provider";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600"] });
const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"], weight: ["200", "300", "400"] });

export const metadata: Metadata = {
  title: { default: "XRPL Tx Lab", template: "%s · XRPL Tx Lab" },
  description: "Educational lab for the XRPL test networks: every transaction, ledger object and amendment, explained from the xrpld source and executable with Xaman.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-screen">
        <XamanProvider>{children}</XamanProvider>
      </body>
    </html>
  );
}
