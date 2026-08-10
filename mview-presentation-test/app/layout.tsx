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

export const metadata: Metadata = {
  title: "Mineral View — A clearer view of your minerals",
  description:
    "Public-record intelligence, plain-English briefings, and a community of mineral owners like you.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexendDeca.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
