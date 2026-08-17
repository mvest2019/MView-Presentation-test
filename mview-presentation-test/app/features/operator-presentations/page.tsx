import { CalendarDays, Clock, Presentation, UserRound } from "lucide-react";
import type { Metadata } from "next";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { displayXsClass, eyebrowClass } from "@/app/_components/typography";
import { presentationsSummary } from "@/lib/operator-presentations";

import { PresentationsPage } from "./presentations-page";

/**
 * Operator Presentations — `/features/operator-presentations`.
 *
 * WHY THIS URL. Third of the operator tools, and the same reasoning as its two
 * siblings under `/features/`: the page describes a capability, not one operator's
 * record, and it is the same page whatever a visitor filters to. The slug drops
 * "compare" because this one does not compare anything — it is a library — and
 * "operator presentations" is the phrase the page is about.
 *
 * WHAT IS SERVER-RENDERED, AND WHY IT MATTERS HERE. The header count and the KPI
 * strip describe the whole library rather than the filtered view, so they are
 * computed here and ship no JavaScript. That also means this page — unlike the
 * statistics comparison — has real content in its crawlable HTML before any
 * interaction: the counts, the most recent filing date, and the heading.
 *
 * The card grid is behind the client boundary because it is filtered, but a client
 * component still server-renders its initial state, so page one's six cards — names,
 * titles, dates, summaries and both outbound links — are in the crawlable HTML.
 * Pages two and three are not: reaching them takes a click. If individual
 * presentations are ever meant to be discoverable they need their own routes, since
 * a crawler will not page through a client-side grid.
 *
 * STATICALLY PRERENDERED. No cookie, header or search param is read.
 */

const summary = presentationsSummary();

const PAGE_TITLE =
  "Operator Presentations — Texas oil & gas investor decks and quarterly results | Mineral View";

const PAGE_DESCRIPTION = `Quarterly results and investor presentations from ${summary.operators} operators active across Texas. Filter by operator or date, skim the summary, and open the full deck. Free to browse.`;

const PATH = "/features/operator-presentations";

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
    { "@type": "ListItem", position: 3, name: "Operator presentations" },
  ],
};

/** The KPI strip. Static: every figure describes the library, not the filtered view. */
const KPIS = [
  {
    Icon: Presentation,
    value: String(summary.total),
    label: "Presentations on file",
  },
  {
    Icon: UserRound,
    value: String(summary.operators),
    label: "Operators covered",
  },
  {
    Icon: CalendarDays,
    value: String(summary.inLatestPeriod),
    label: `In ${summary.latestPeriod}`,
  },
  {
    Icon: Clock,
    value: summary.latestLabel,
    label: "Most recent",
  },
] as const;

export default function OperatorPresentationsRoute() {
  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        // Serialised from the literal above — no user input reaches it, and the
        // browser paints nothing for it, so it cannot shift the layout.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }}
      />

      <div className="border-b border-mv-line bg-[linear-gradient(180deg,var(--color-mv-card),var(--color-mv-card-tint))]">
        <div className="mx-auto max-w-[1200px] px-[22px] pb-6 pt-[22px] max-[767px]:px-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Know Your Operators", href: "/operators" },
              { label: "Operator presentations" },
            ]}
          />

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className={`${eyebrowClass} mt-[14px]`}>
                Investor relations · free to browse
              </p>
              <h1 className={`${displayXsClass} mb-2 mt-[10px] text-mv-ink`}>
                Operator presentations
              </h1>
              <p className="max-w-[580px] text-[14.5px] text-mv-muted">
                Quarterly results and investor decks from operators active across
                Texas — filter, skim the summary, and open the full presentation.
              </p>
            </div>

            {/* The design's big right-aligned count. `flex-none` so it never
                competes with the lede for width, and it wraps beneath on narrow
                screens rather than squeezing the heading. Once wrapped it aligns
                left with everything above it — a "18" floating against the right
                edge under a left-aligned lede reads as a mistake. */}
            <p className="flex-none text-right leading-[1.1] max-[767px]:text-left">
              <b className="block text-[30px] font-bold tracking-[-.02em] tabular-nums text-mv-green-deep">
                {summary.total}
              </b>
              <span className="text-[12px] font-bold uppercase tracking-[.08em] text-mv-muted">
                Presentations
              </span>
            </p>
          </div>

          <ul className="m-0 mt-5 grid list-none grid-cols-4 gap-[14px] p-0 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
            {KPIS.map(({ Icon, value, label }) => (
              <li
                key={label}
                className="flex items-center gap-[14px] rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(16,20,30,.05)]"
              >
                <span
                  aria-hidden="true"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-mv-tint text-mv-green-deep"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <b className="block text-[23px] font-bold leading-none tracking-[-.02em] text-mv-ink">
                    {value}
                  </b>
                  <span className="mt-[3px] block text-[12px] text-mv-muted">
                    {label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PresentationsPage />
    </div>
  );
}
