import { AppNav } from "@/components/app-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equity Token Radar · 代币化美股 & 稳定币看板",
  description:
    "免费监控代币化美股协议 TVL 与稳定币发行。Robinhood Chain 夏天看股权代币 AUM，而不是 meme 发射台市值。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${notoSans.className} ${geistMono.variable} min-h-screen antialiased`}>
        <TooltipProvider>
          <AppNav />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
