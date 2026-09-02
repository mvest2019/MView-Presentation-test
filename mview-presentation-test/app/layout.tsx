import type { Metadata } from "next";
import { Lexend_Deca } from "next/font/google";

import { HideInPortal } from "./_components/hide-in-portal";
import { ScrollToTopOnNavigate } from "./_components/scroll-to-top";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { Toaster } from "./_components/ui/sonner";
import { getSessionUser } from "@/lib/session";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read here, not in the header: the header is a client component, and the
  // session cookie is only readable on the server.
  const user = await getSessionUser();

  return (
    // The page defaults the prototype sets on `html` and `body` in CSS live here
    // as utilities instead. Body size and leading are inherited by everything
    // that does not override them, so they have to sit on `body` itself.
    <html
      lang="en"
      className={`${lexendDeca.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-mv-bg font-sans text-[15px] leading-[1.55] text-mv-ink max-[767px]:text-[14px]">
        {/* Renders nothing — it only resets the scroll position after a route
            change, because Next 16 otherwise CARRIES IT OVER to the new page.
            See the component for the doc quote and the two cases it skips. */}
        <ScrollToTopOnNavigate />
        <SiteHeader user={user} />
        <main id="main" className="flex-1">
          {children}
        </main>
        {/* The portal carries its own top bar, sidebar and bottom tab bar, so
            the marketing footer must not sit under it. The header hides itself
            on those routes; the footer is a server component, so it is gated
            from outside instead — see `hide-in-portal.tsx` for why. */}
        <HideInPortal>
          <SiteFooter />
        </HideInPortal>
        {/* Transient, page-level notices only — see the note in `ui/sonner.tsx`.
            Field validation stays inline against the field it is about, where a
            screen reader meets it in the form's own tab order. */}
        <Toaster />
      </body>
    </html>
  );
}
