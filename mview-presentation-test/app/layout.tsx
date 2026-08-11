import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";

import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import "./globals.css";

// Lexend Deca throughout the marketing site (Nikhil, 2026-07-20). The
// prototype pulls it from the Google Fonts CDN; next/font self-hosts the same
// variable face, which removes the external request and the layout shift.
const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
});

/**
 * `metadataBase` is what lets pages declare a relative canonical or Open Graph
 * URL and have Next resolve it to an absolute one — without it, `alternates` and
 * `openGraph.url` are dropped from the rendered head. Override
 * `NEXT_PUBLIC_SITE_URL` per environment so preview deployments do not advertise
 * production as their canonical.
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mineralview.com",
  ),
  title: "Mineral View — A clearer view of your minerals",
  description:
    "Public-record intelligence, plain-English briefings, and a community of mineral owners like you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The page defaults the prototype sets on `html` and `body` in CSS live here
    // as utilities instead. Body size and leading are inherited by everything
    // that does not override them, so they have to sit on `body` itself.
    <html
      lang="en"
      className={`${lexendDeca.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-mv-bg font-sans text-[15px] leading-[1.55] text-mv-ink max-[767px]:text-[14px]">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
