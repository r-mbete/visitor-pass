import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav, Logo, Sidebar, TopNav } from "@/components/app-nav";
import { getSignedIn } from "@/lib/auth/session";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
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
  themeColor: "#0f3d3e",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The menu is for signed-in people; each page still checks for itself (requirePage).
  // A database that is not set up yet shows as signed out here; the page itself says what is missing.
  const me = await getSignedIn().catch(() => null);
  const user = me && {
    name: me.name,
    role: me.role,
    estateName: me.estateName,
  };
  const showNav = user !== null;
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-brand text-shell sr-only z-30 rounded-lg px-4 py-2 font-mono text-xs tracking-widest uppercase focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        {user && <Sidebar user={user} />}
        <div className={`flex flex-1 flex-col ${showNav ? "lg:pl-64" : ""}`}>
          <header
            className={`border-line bg-shell/80 border-b backdrop-blur ${showNav ? "lg:hidden" : ""}`}
          >
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-2 sm:px-8">
              <Logo />
              {user && <TopNav user={user} />}
            </div>
          </header>
          <main
            id="main"
            className={`flex flex-1 flex-col ${showNav ? "pb-24 sm:pb-0" : ""}`}
          >
            {children}
          </main>
        </div>
        {user && <BottomNav user={user} />}
      </body>
    </html>
  );
}
