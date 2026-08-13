import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "FRED",
  description: "FRED analyserar kostnad, risk och ROI på 30 sekunder — sluta gissa, börja besluta.",
};

// Next.js's dedicated Viewport API (the idiomatic App Router equivalent of
// a manual <meta name="viewport"> tag — Next injects/dedupes it centrally).
// maximumScale: 1 disables pinch-zoom for a more native-app feel on mobile;
// that's a real accessibility tradeoff (WCAG 1.4.4 recommends allowing
// zoom) traded deliberately for the "app, not a webpage" goal here.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
