import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

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
  themeColor: "#f7f5f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-ink text-paper sr-only z-10 px-4 py-2 font-mono text-xs tracking-widest uppercase focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <header className="border-line border-b">
          <p className="mx-auto w-full max-w-5xl px-4 py-5 font-mono text-xs tracking-widest uppercase sm:px-8">
            Salama Pass
          </p>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
