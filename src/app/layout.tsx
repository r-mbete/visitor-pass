import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Newsreader } from "next/font/google";
import Link from "next/link";
import { BottomNav, TopNav } from "@/components/app-nav";
import { demoGateEnabled } from "@/lib/gate/demo";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Salama Pass",
    template: "%s · Salama Pass",
  },
  description:
    "Visitor management for gated estates: signed visitor passes, a guard app that works offline, and a tamper-evident entry log.",
};

export const viewport: Viewport = {
  themeColor: "#f3dfb1",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // The app's pages exist only while the demo gate is open; until then there is nothing to navigate to.
  const showNav = demoGateEnabled();
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-ink text-shell sr-only z-30 px-4 py-2 font-mono text-xs tracking-widest uppercase focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <header className="border-line border-b">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-8">
            <Link href="/" className="font-display py-2 text-2xl italic">
              Salama Pass
            </Link>
            {showNav && <TopNav />}
          </div>
        </header>
        <main
          id="main"
          className={`flex flex-1 flex-col ${showNav ? "pb-24 sm:pb-0" : ""}`}
        >
          {children}
        </main>
        {showNav && <BottomNav />}
      </body>
    </html>
  );
}
