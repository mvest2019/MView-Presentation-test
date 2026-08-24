import type { Metadata } from "next";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { displayXsClass } from "@/app/_components/typography";

import { StatisticsPage } from "./statistics-page";

/**
 * Compare Operator Statistics — `/features/compare-operator-statistics`.
 *
 * WHY THIS URL. The same reasoning as its sibling at
 * `/features/compare-operator-production`: `/features/` holds a capability rather
 * than a record, and the page is the same page whichever operators a visitor
 * picks. Keeping the two side by side under one section also means the pair reads
 * as a suite in a sitemap and in search results, instead of one living under
 * `/features/` and the other under `/operators/`.
 *
 * THE ROUTE SHELL, and only that: metadata, breadcrumb, heading, structured data.
 * The comparison is a client component because every block responds to the picker.
 *
 * STATICALLY PRERENDERED. No cookie, header or search param is read, so the page —
 * including the server-rendered first paint of the client island — is built once.
 *
 * A NOTE ON WHAT IS INDEXED. The design opens on an empty state: the comparison
 * blocks appear only once two operators are chosen, so the crawlable HTML is the
 * heading, the lede, the picker and the prompt. That is the approved flow and it is
 * reproduced as specified. If this page is ever expected to rank on comparison
 * terms it needs server-rendered content that does not depend on interaction —
 * preselecting two operators from the URL, or adding standing copy about what the
 * tool compares. Worth deciding before it goes in a sitemap.
 */

/**
 * The trend window, described rather than named.
 *
 * IT USED TO NAME 2021–2025, from the fixture's `STATISTICS_TREND_YEARS`. The table
 * now plots whichever five years the API reports — 2022–2026 as of writing, and it
 * moves on its own — so naming years here would be a claim this page cannot keep. The
 * span is still stated, which is what the description is for; the exact years are on
 * the page itself, where they are the API's own.
 */
const TREND_WINDOW = "five-year";

const PAGE_TITLE =
  "Compare Operator Statistics — Texas oil & gas operators head-to-head | Mineral View";

const PAGE_DESCRIPTION = `Put two to four Texas operators head-to-head on company profile, leases, counties, reported production and the latest ${TREND_WINDOW} BOE trend. Real Railroad Commission records — free to use.`;

const PATH = "/features/compare-operator-statistics";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PATH,
    siteName: "Mineral View",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mineralview.com"
).replace(/\/+$/, "");

/**
 * Three levels, matching the visible trail exactly — Google requires the markup and
 * the rendered crumbs to agree. The middle crumb points at the directory, which is
 * where the tool is entered from.
 */
const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    {
      "@type": "ListItem",
      position: 2,
      name: "Know Your Operators",
      item: `${SITE_URL}/operators`,
    },
    // The page you are on carries no `item`, which is what Google expects.
    { "@type": "ListItem", position: 3, name: "Compare statistics" },
  ],
};

export default function CompareOperatorStatisticsRoute() {
  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        // Serialised from the literal above — no user input reaches it, and the
        // browser paints nothing for it, so it cannot shift the layout.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }}
      />

      {/* The design's `.cs-head`: a paler band separating the page's own heading
          from the site header above it. */}
      <div className="bg-white">
        <div className="mx-auto max-w-[1180px] px-[22px] pb-6 pt-5 max-[767px]:px-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Know Your Operators", href: "/operators" },
              { label: "Compare statistics" },
            ]}
          />

          <h1 className={`${displayXsClass} mb-[6px] mt-[14px] text-mv-ink`}>
            Compare operator statistics
          </h1>
          <p className="max-w-[640px] text-[14.5px] text-mv-muted">
            Put two to four operators head-to-head on company profile, reported
            production, and five-year trend — everything from the public record,
            in one scannable view.
          </p>
        </div>
      </div>

      <StatisticsPage />
    </div>
  );
}
