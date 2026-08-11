import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import {
  displayLgClass,
  displaySmClass,
  eyebrowClass,
  h3Class,
  inlineLink,
} from "@/app/_components/typography";

import { getOperatorPlayTypes } from "@/lib/operator-api";
import { getVisitorId } from "@/lib/visitor-id";

import { CountyDirectory } from "./_components/county-directory";
import { OperatorPage } from "./operator-page";

/**
 * Know Your Operators — the prototype's `route:operators`.
 *
 * The route shell: metadata, breadcrumb, page heading, the three feature cards,
 * the county section and the closing notice. All server-rendered — the only
 * client component on the route is `<OperatorPage>`, which owns the interactive
 * listing (filters, table, pagination) and its state.
 *
 * The feature cards live here rather than in their own file: they are three
 * static links used only by this page, and a server component is exactly where
 * they belong — moving them into `operator-page.tsx` would ship them to the
 * browser for no reason.
 *
 * There is no Operator API yet. The listing reads a local fixture through
 * `useOperatorDirectory` — see the seam documented there — and no endpoint is
 * called or assumed anywhere on this route.
 *
 * The design's "PUBLIC RECORDS · FREE TO BROWSE" eyebrow above the h1 is
 * dropped on request. The page states its name once in the breadcrumb as the
 * current page, and once as the h1.
 */

const PAGE_TITLE =
  "Know Your Operators — Texas oil & gas operator directory | Mineral View";

const PAGE_DESCRIPTION =
  "Search, filter and rank Texas oil & gas operators by reported production, activity and coverage. Free to browse — built from Railroad Commission public records.";

/**
 * `alternates.canonical` matters here specifically: the listing is a filterable
 * view, so it is reachable with query strings appended once filters move into the
 * URL. A self-referencing canonical keeps those from being indexed as duplicates.
 * Resolved against `metadataBase` in `app/layout.tsx`.
 */
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/operators" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/operators",
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

/**
 * Breadcrumb structured data, matching the visible trail exactly — Google needs
 * the markup to agree with what the user sees. This is what turns the SERP path
 * from a bare URL into "Mineral View › Know Your Operators".
 *
 * Emitted as a plain `<script type="application/ld+json">` from a server
 * component, which is the documented App Router approach; no `dangerouslySet`
 * risk beyond these two hard-coded strings.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mineralview.com"
).replace(/\/+$/, "");

const BREADCRUMB_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    // `item` must be absolute to validate. The trailing crumb omits it, which is
    // what Google expects for the page you are already on.
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name: "Know Your Operators" },
  ],
};

/** The three operator feature cards (`.psvc-card`), unchanged from the design. */
const FEATURE_CARDS = [
  {
    href: "/operators/compare-production",
    icon: "▮▮",
    title: "Compare Operator Production",
    body: "Put 2–4 operators side by side on reported production — real figures, ranked within their play.",
    cta: "Open the comparison →",
  },
  {
    href: "/operators/compare-statistics",
    icon: "≡",
    title: "Compare Operator Statistics",
    body: "Company statistics side by side — leases, counties, rank, and production intensity.",
    cta: "Open the comparison →",
  },
  {
    href: "/operators/presentations",
    icon: "▣",
    title: "Operator Presentations",
    body: "A clean, shareable one-page profile of any operator — built from the public record.",
    cta: "Build a presentation →",
  },
];

/**
 * The Play Type filter's options.
 *
 * Fetched here rather than in the dropdown for two reasons. The operator API
 * sends no `Access-Control-Allow-Origin`, so a browser fetch is blocked by CORS
 * and the call has to happen server-side regardless. And doing it here means the
 * options are already in the HTML: no client request, no spinner, no layout shift
 * as the list arrives, and the route stays prerendered.
 *
 * The failure is swallowed *here*, not in the service — `getOperatorPlayTypes`
 * throws so nothing is hidden, and this boundary decides that a filter which
 * cannot load its options must not take the page down with it. The dropdown then
 * renders with just its default option and every other filter keeps working.
 * Measured upstream reliability makes this a real path, not a formality: one
 * connection timeout and one 522 in four cold calls.
 */
async function loadPlayTypes(): Promise<string[]> {
  try {
    return await getOperatorPlayTypes();
  } catch (error) {
    console.error("[operators] play types unavailable:", error);
    return [];
  }
}

export default async function OperatorsRoute() {
  // Both reads are server-side: the play types because the API blocks browser
  // origins, the visitor id because `cookies()` is server-only. Handing the id to
  // the client lets it build the complete search payload; the route handler still
  // re-asserts it from the cookie so it cannot be spoofed.
  //
  // THIS ROUTE IS INTENTIONALLY DYNAMIC. Reading a cookie opts it out of static
  // prerendering, which is a deliberate trade (Akshay, 2026-08-11): the client
  // needs the visitor id to build the exact contract payload. It costs little —
  // the play types still come from `unstable_cache`, so a request adds no upstream
  // call, only the render. If someone later moves the cookie read to the client to
  // win the prerender back, that is a real option, not a bug fix; do not "restore"
  // static by dropping the id from the payload.
  const [playTypes, visitorId] = await Promise.all([
    loadPlayTypes(),
    getVisitorId(),
  ]);

  return (
    <div className="pb-16 pt-[18px] max-[767px]:pb-11">
      <script
        type="application/ld+json"
        // Serialised from the object literal above, so there is no user input in
        // it. Rendered inert by the browser — it paints nothing and shifts nothing.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }}
      />

      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Know Your Operators" },
          ]}
        />

        <div className="pt-7">
          <h1 className={displayLgClass}>Know Your Operators</h1>
          <p className="mt-[6px] max-w-[640px] text-[15.5px] text-mv-muted">
            Search, filter, and rank Texas oil &amp; gas operators by reported
            production, activity, and coverage.
          </p>
        </div>

        <OperatorPage playTypes={playTypes} visitorId={visitorId} />

        {/* The hrefs are the paths the prototype points at. None of those routes
            exists yet — same situation as most of `site-nav.ts`, where every path
            but the built ones is a placeholder. */}
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-stretch gap-4">
          {FEATURE_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block rounded-2xl border border-mv-line bg-white px-[22px] py-5 !no-underline shadow-mv transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(13,14,23,.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
            >
              <div aria-hidden="true" className="text-xl text-mv-green-deep">
                {card.icon}
              </div>
              <h3 className={`${h3Class} mb-[6px] mt-2`}>{card.title}</h3>
              <p className="m-0 text-sm text-mv-muted">{card.body}</p>
              <span className="mt-[10px] inline-block text-[13.5px] font-semibold text-mv-green-deep">
                {card.cta}
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-[46px]">
          <div className={eyebrowClass}>By county · public records</div>
          <h2 className={`${displaySmClass} mt-[7px]`}>
            Browse operators by county
          </h2>
          <p className="mt-[7px] max-w-[660px] text-sm text-mv-muted">
            Explore the oil &amp; gas companies operating in each Texas county.
            Filter by letter or search to jump straight to a county — all 254.
          </p>

          <CountyDirectory />
        </section>

        {/* The design's `.notice.slate` — the page's one conversion prompt. */}
        <aside className="mt-6 flex gap-3 rounded-[14px] border border-[#dfe4e9] bg-mv-line-soft px-[18px] py-4 text-sm leading-[1.55] text-[#33404e]">
          <span aria-hidden="true">ℹ</span>
          <div>
            Numbers above come from Railroad Commission of Texas filings and are
            refreshed as new records post. Want operator activity tied to{" "}
            <em>your</em> acreage?{" "}
            <Link href="/claim" className={`${inlineLink} font-semibold`}>
              Claim your owner record
            </Link>{" "}
            — it&apos;s free. New to this? Start with the guide:{" "}
            <Link
              href="/guide/know-your-operator"
              className={`${inlineLink} font-semibold`}
            >
              Who is my operator?
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
