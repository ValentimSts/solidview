import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavHeader } from "@/components/nav-header";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Solidview",
  description:
    "Explore, understand, and interact with any verified Ethereum smart contract.",
};

const envKeyMap: Record<string, import("@/types/contract").ChainSlug> = {
  ARBISCAN_API_KEY: "arbitrum",
  OPTIMISM_ETHERSCAN_API_KEY: "optimism",
  BASESCAN_API_KEY: "base",
  POLYGONSCAN_API_KEY: "polygon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const serverKeyAvailable = !!process.env.ETHERSCAN_API_KEY;
  const serverChainKeys: Partial<Record<import("@/types/contract").ChainSlug, boolean>> = {};
  for (const [envVar, slug] of Object.entries(envKeyMap)) {
    if (process.env[envVar]) serverChainKeys[slug] = true;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers serverKeyAvailable={serverKeyAvailable} serverChainKeys={serverChainKeys}>
          <NavHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
