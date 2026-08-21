import type { Metadata } from "next";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { displayXsClass } from "@/app/_components/typography";
import {
  getOperatorCounties,
  getOperatorDistrictCodes,
  getOperatorPlayTypes,
} from "@/lib/operator-api";
import {
  defaultProductionWindow,
  emptyProductionFilters,
} from "@/lib/operator-production-filters";
import type { ProductionFilterOptions } from "@/lib/operator-production-shape";

import { ComparePage } from "./compare-page";

/**
 * The filter bar's option lists, read on the server.
 *
 * ALL THREE ARE CACHED UPSTREAM, so this costs no request per visitor — and because
 * they are read here rather than in the browser, opening a dropdown is instant and the
 * page ships no code to populate one. The same `/counties` and `/playtypes` reads the
 * operator listing uses, so an option list cannot disagree between the two pages.
 *
 * A FAILING LIST DEGRADES TO EMPTY rather than taking the page down. A filter with no
 * options is a filter that offers nothing; a page that 500s offers nothing at all, and
 * the comparison itself does not depend on any of these being present.
 *
 * THEY OVERLAP. None depends on another, so the page waits for the slowest rather than
 * the sum of the three.
 */
async function loadFilterOptions(): Promise<ProductionFilterOptions> {
  const [counties, playTypes, districtCodes] = await Promise.all([
    getOperatorCounties().catch((error: unknown) => {
      console.error("[compare-production] counties unavailable", error);
      return [] as string[];
    }),
    getOperatorPlayTypes().catch((error: unknown) => {
      console.error("[compare-production] play types unavailable", error);
      return [] as string[];
    }),
    getOperatorDistrictCodes().catch((error: unknown) => {
      console.error("[compare-production] district codes unavailable", error);
      return [] as string[];
    }),
  ]);

  return { counties, playTypes, districtCodes };
}

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

/**
 * The window the page actually opens on, from the same helper the filters use.
 *
 * IT USED TO COME FROM `COMPARE_YEARS` — the fixture's fixed 2016–2025 — while the
 * chart plots whatever the API returns for the applied range. The two agreed only by
 * coincidence, and the copy would have gone stale on its own next year.
 * `defaultProductionWindow` is what `initialFilters` below is built from, so the
 * sentence and the request are now the same decision read twice.
 */
const DEFAULT_WINDOW = defaultProductionWindow(new Date().getFullYear());
const YEAR_RANGE = `${DEFAULT_WINDOW.fromYear}–${DEFAULT_WINDOW.toYear}`;

const PAGE_TITLE = `Compare Operators Performance — Texas oil & gas operators side by side | Mineral View`;

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

export default async function CompareOperatorProductionRoute() {
  const currentYear = new Date().getFullYear();
  const options = await loadFilterOptions();
  /* No operator selected, and the default ten-year window. The page therefore opens
     with nothing requested — see the note on the two filter sets in `compare-page`. */
  const initialFilters = {
    ...emptyProductionFilters(currentYear),
    ...defaultProductionWindow(currentYear),
  };

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

          {/* The one h1. The lede repeats the year range because that is the
              first thing a visitor needs to know the page can answer. */}
          <h1 className={`${displayXsClass} mb-[6px] mt-2 text-mv-ink`}>
            Compare Operators Performance
          </h1>
          <p className="max-w-[600px] text-[14.5px] text-mv-muted">
            Put two to four Texas operators side by side on filed annual
            production — real RRC figures, {YEAR_RANGE}.
          </p>
        </div>
      </div>

      <ComparePage options={options} initialFilters={initialFilters} />
    </div>
  );
}
