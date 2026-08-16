import type { Metadata } from "next";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { displayXsClass, eyebrowClass } from "@/app/_components/typography";
import { COMPARE_YEARS } from "@/lib/operator-compare";

import { ComparePage } from "./compare-page";

/**
 * Compare Operator Production — `/features/compare-operator-production`.
 *
 * WHY THIS URL. `/features/` is the section of the site that holds a capability
 * rather than a record: the thing being described is the tool, and it stays the
 * same page whichever operators a visitor picks. Nesting it under `/operators/`
 * would have implied a specific operator's data, competing with the directory and
 * the operator detail pages for the same intent. The slug spells out the search
 * language — "compare operator production" — rather than abbreviating to
 * `/compare`, which reads as navigation rather than as a page about anything.
 *
 * THE ROUTE SHELL, and only that: metadata, breadcrumb, heading, structured data.
 * The comparison itself is a client component, because every panel on the page
 * responds to which operators are selected.
 *
 * STATICALLY PRERENDERED. Nothing here reads a cookie, a header or a search
 * param, so the whole page — including the server-rendered first paint of the
 * client island — is built once. That is deliberate and worth protecting: it is
 * most of why this page's LCP is a static document rather than a request.
 */

const YEAR_RANGE = `${COMPARE_YEARS[0]}–${COMPARE_YEARS.at(-1)}`;

const PAGE_TITLE = `Compare Operator Production — Texas oil & gas operators side by side | Mineral View`;

const PAGE_DESCRIPTION = `Put two to four Texas operators side by side on filed annual production, ${YEAR_RANGE}. Real Railroad Commission figures — cumulative volumes, oil vs gas mix, growth and production per lease. Free to use.`;

const PATH = "/features/compare-operator-production";

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
 * Three levels, matching the visible trail exactly — Google requires the markup
 * and the rendered crumbs to agree. The middle crumb points at the directory,
 * which is where the tool is entered from.
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
    { "@type": "ListItem", position: 3, name: "Compare production" },
  ],
};

export default function CompareOperatorProductionRoute() {
  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        // Serialised from the literal above — no user input reaches it, and the
        // browser paints nothing for it, so it cannot shift the layout.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }}
      />

      {/* The design's `.cp-head`: a paler band that separates the page's own
          heading from the site header above it. */}
      <div className="border-b border-mv-line bg-[linear-gradient(180deg,var(--color-mv-card),var(--color-mv-card-tint))]">
        <div className="mx-auto max-w-[1180px] px-[22px] pb-6 pt-5 max-[767px]:px-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Know Your Operators", href: "/operators" },
              { label: "Compare production" },
            ]}
          />

          <p className={`${eyebrowClass} mt-[14px]`}>Operator tools · free to use</p>

          {/* The one h1. The lede repeats the year range because that is the
              first thing a visitor needs to know the page can answer. */}
          <h1 className={`${displayXsClass} mb-[6px] mt-2 text-mv-ink`}>
            Compare operator production
          </h1>
          <p className="max-w-[600px] text-[14.5px] text-mv-muted">
            Put two to four Texas operators side by side on filed annual production
            — real RRC figures, {YEAR_RANGE}.
          </p>
        </div>
      </div>

      <ComparePage />
    </div>
  );
}
