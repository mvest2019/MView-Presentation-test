import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  FileText,
  Flag,
  Gauge,
  Plus,
  Repeat,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { buttonClass } from "@/app/_components/button";
import { OperatorMonogram } from "@/app/_components/operator-monogram";
import {
  cardTitleClass,
  displayXsClass,
  eyebrowClass,
  sectionTitleClass,
} from "@/app/_components/typography";
import {
  OPERATOR_ILLUSTRATIVE_NOTE,
  buildCountyShading,
  findOperatorDetail,
  mergeOperatorDetails,
  formatCount,
  formatVolume,
  listOperatorDetailSlugs,
  titleCase,
  type ChangeRow,
  type ConditionCard,
  type OperatorDetail,
} from "@/lib/operator-detail";
import { OPERATOR_RECENT_WELLS } from "@/lib/operator-detail-data";
import { TEXAS_COUNTY_PATHS, TEXAS_VIEWBOX } from "@/lib/texas-county-paths";

import { FootprintMap } from "./_components/footprint-map";
import { getOperatorCounties } from "@/lib/operator-api";
import { fetchOperatorDetails } from "@/lib/operator-details-api";

import { DeferredSection } from "./_components/deferred-section";
import { OperatorLeases } from "./_components/operator-leases";
import { ProductionOverTime } from "./_components/production-over-time";

/**
 * Operator detail — `/operators/{slug}`.
 *
 * WHY THIS URL. It is the one the listing table already links to, built from the
 * API's own `operator_name_url`. The operator's name carries the keywords, the
 * `/operators/` parent makes the directory-to-detail hierarchy explicit to a
 * crawler, there is no id or query string, and because the slug comes from the API
 * it stays stable and separates near-identical entities (`chesapeake-operating-inc`
 * from `-llc`).
 *
 * SECTION ORDER. As the prototype, with one change: "What changed" moves up to sit
 * directly under the condition matrix. Those two describe the same recent window —
 * the matrix shows "8 fewer permits vs prior qtr" and the read explains it as "third
 * straight quarter of easing activity" — and the prototype separated them with the
 * map and the chart.
 *
 * MOSTLY A SERVER COMPONENT. Only three things here are interactive, so only three
 * ship JavaScript: the map's metric toggle and tooltip, the chart's year range, and
 * the lease search. The hero, both panels, the county table, recent wells, peers and
 * the CTA are server-rendered and ship none. The 64 KB of county geometry is
 * rendered into the HTML rather than passed as props, so it gzips in the document
 * and never enters a bundle.
 *
 * SECTIONS ARE GATED ON REAL DATA (Akshay, 2026-08-13). Ten candidate detail
 * endpoints all answer 404, so this is fixture-backed, and the fixture does not
 * describe every operator equally — see `lib/operator-detail.ts`. A section renders
 * only where that operator's data exists, which is why one operator's page is fuller
 * than another's. It is thinner because the record is, not because the page is
 * broken. Two blocks are the prototype's own hardcoded illustrations and appear only
 * for the operator they were written about.
 */

export function generateStaticParams() {
  // The 30 operators the fixture covers are prerendered. Anything else the listing
  // links to is rendered on demand and 404s if the slug matches no record, which is
  // the correct answer until an endpoint can resolve the other 24,714.
  return listOperatorDetailSlugs().map((slug) => ({ slug }));
}

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mineralview.com"
).replace(/\/+$/, "");

/**
 * Resolve a slug into a fully merged detail.
 *
 * Called by both `generateMetadata` and the page body. Next deduplicates `fetch`
 * within a render pass and `fetchOperatorDetails` is cached besides, so the two
 * awaits share ONE upstream request rather than issuing two.
 */
async function loadOperator(slug: string) {
  const base = findOperatorDetail(slug);
  if (!base) return null;
  return mergeOperatorDetails(
    base,
    await fetchOperatorDetails(base.operatorNumber),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const operator = await loadOperator(slug);

  if (!operator) {
    return { title: "Operator not found | Mineral View" };
  }

  // `seo_operator_name` is the API's own marketing alias ("Pioneer Natural
  // Resources" rather than "Pioneer Natural RES USA, Inc"), which is what people
  // actually search for. Falls back to the filed name when absent.
  const title = `${operator.seoName ?? operator.name} (${operator.operatorNumber}) — Texas operator profile | Mineral View`;
  const description = `${operator.name} operates ${formatCount(operator.leases)} leases across ${operator.counties} Texas counties and ranks #${operator.rank} statewide by reported production. Production, footprint and county breakdown from Railroad Commission records.`;
  const path = `/operators/${operator.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Mineral View",
      type: "profile",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * County names for the lease table's filter.
 *
 * The SAME read the operator listing's Counties quick filter uses, on request, so the
 * option list has exactly one source. It is cached upstream, so this costs no extra
 * request per view. The failure is swallowed here rather than in the service: a filter
 * that cannot load its options must not take the page down, and the lease table still
 * works unfiltered.
 */
async function loadCountyOptions(): Promise<string[]> {
  try {
    return await getOperatorCounties();
  } catch (error) {
    console.error("[operator-detail] counties unavailable:", error);
    return [];
  }
}

export default async function OperatorDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const operator = await loadOperator(slug);
  if (!operator) notFound();

  const countyOptions = await loadCountyOptions();

  const recentWells = OPERATOR_RECENT_WELLS[operator.operatorNumber] ?? [];

  return (
    <div className="pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(operator)),
        }}
      />

      {/* ---- 1 · identity ---- */}
      <header className="border-b border-mv-line bg-[linear-gradient(180deg,var(--color-mv-card),var(--color-mv-card-tint))]">
        <div className="mx-auto max-w-[1200px] px-[22px] pb-[26px] pt-5 max-[767px]:px-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Operator Directory", href: "/operators" },
              { label: operator.name },
            ]}
          />

          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-[14px]">
              <OperatorMonogram
                monogram={operator.monogram}
                size={54}
                className="!rounded-[13px]"
              />
              <div className="min-w-0">
                <h1 className={`${displayXsClass} text-mv-ink`}>
                  {operator.name}{" "}
                  <span className="font-medium tabular-nums text-mv-muted">
                    ({operator.operatorNumber})
                  </span>
                </h1>
                {operator.topCounties.length > 0 ? (
                  <p className="mt-[6px] text-[13px] text-mv-muted">
                    <span className="mr-[6px] font-extrabold uppercase tracking-[.05em] text-mv-green-deep">
                      Most active
                    </span>
                    <b className="font-semibold text-mv-ink-soft">
                      {operator.topCounties.join(", ")}
                    </b>
                  </p>
                ) : null}
              </div>
            </div>

            <ul className="flex list-none flex-wrap gap-2 p-0">
              {/* Status is the API's, not an assumption — 21,649 of the directory's
                  operators are inactive. */}
              <li
                className={`inline-flex items-center gap-[7px] rounded-full px-3 py-[6px] text-[12.5px] font-semibold ${
                  operator.status === "active"
                    ? "bg-mv-tint text-mv-green-deep"
                    : "bg-mv-line-soft text-mv-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-[7px] w-[7px] rounded-full ${
                    operator.status === "active"
                      ? "bg-mv-green-deep"
                      : "bg-mv-muted"
                  }`}
                />
                {operator.status === "active" ? "Active" : "Inactive"}
              </li>
              {[
                `#${operator.rank} statewide`,
                `${formatCount(operator.leases)} leases`,
                `${operator.counties} counties`,
              ].map((pill) => (
                <li
                  key={pill}
                  className="rounded-full border border-mv-line bg-white px-3 py-[6px] text-[12.5px] font-semibold text-mv-muted"
                >
                  {pill}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-[22px] pb-16 max-[767px]:px-4 max-[767px]:pb-11">
        {/* ---- 2 · condition matrix ---- */}
        {operator.conditionCards.length > 0 ? (
          <section className="pt-[26px]">
            <SectionHead
              title="The operator's condition today"
              // Measured and dated by the API now, so the note says when rather
              // than warning that the figures are illustrative.
              aside={
                operator.conditionAsOf
                  ? `Recent-activity indicators · as of ${operator.conditionAsOf}`
                  : `Recent-activity indicators · ${OPERATOR_ILLUSTRATIVE_NOTE}`
              }
            />
            <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
              {operator.conditionCards.map((card) => (
                <ConditionTile key={card.label} card={card} />
              ))}
            </div>
          </section>
        ) : null}

        {/* ---- 3 · what changed — MOVED UP, see the note at the top ---- */}
        {operator.changeRows.length > 0 ? (
          <section className="pt-[26px]">
            <SectionHead
              eyebrow="Auto-generated"
              title="What changed"
              // Shortened to fit one line. "Illustrative" is kept: these rows are
              // hardcoded narrative, not derived from the operator record.
              aside="Illustrative insights · last 90 days"
            />
            <ul className="m-0 grid list-none gap-[10px] p-0">
              {operator.changeRows.map((row) => (
                <ChangeItem key={row.headline} row={row} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---- 4 · footprint ---- */}
        <section className="pt-[26px]">
          <p className={eyebrowClass}>Footprint</p>
          <h2
            className={`${sectionTitleClass} mb-[14px] mt-[7px] flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
          >
            Where {operator.name.split(/[ ,]/)[0]} operates across Texas
          </h2>

          <div className="grid grid-cols-[1.45fr_1fr] items-start gap-4 max-[940px]:grid-cols-1">
            {/* The choropleth is 254 <path> elements. Deferred so they are not laid
                out on first paint; the panels beside it are cheap and render at once. */}
            <DeferredSection minHeight={560} label="Texas footprint map">
              <FootprintMap
                hasData={operator.countyRows.length > 0}
                caption={
                  operator.countyRows.length > 0
                    ? `${operator.counties} producing counties · MView records`
                    : `${operator.counties} producing counties · per-county detail not in this extract`
                }
              >
                <TexasChoropleth operator={operator} />
              </FootprintMap>
            </DeferredSection>

            <div className="grid gap-4">
              <Panel
                icon={<Building2 aria-hidden="true" className="h-4 w-4" />}
                title="Company information"
              >
                <PanelRow
                  label="RRC operator no."
                  value={operator.operatorNumber}
                  numeric
                />
                <PanelRow label="Status" value="Operator Active" />
                <PanelRow
                  label="No. of leases"
                  value={formatCount(operator.leases)}
                  numeric
                />
                <PanelRow
                  label="Producing counties"
                  value={String(operator.counties)}
                  numeric
                />
                {operator.location ? (
                  <PanelRow label="Location" value={operator.location} />
                ) : null}
                {operator.contactNumber ? (
                  <PanelRow label="Contact" value={operator.contactNumber} />
                ) : null}
                {operator.headquarters ? (
                  <PanelRow
                    label="Address"
                    value={operator.headquarters}
                    wrap
                  />
                ) : null}
              </Panel>

              <Panel
                icon={<TrendingUp aria-hidden="true" className="h-4 w-4" />}
                title="Production metrics"
              >
                {/* Printed exactly as the API formats them, units included. The
                    fixture's raw totals are the fallback when the read failed. */}
                <PanelRow
                  label="Oil production"
                  value={
                    operator.oilProduced ??
                    `${formatCount(operator.oilTotal)} bbl`
                  }
                  numeric
                />
                <PanelRow
                  label="Gas production"
                  value={
                    operator.gasProduced ??
                    `${formatCount(operator.gasTotal)} Mcf`
                  }
                  numeric
                />
                <PanelRow
                  label="Oil share of BOE"
                  value={`${operator.oilPct}%`}
                  numeric
                />
                <PanelRow
                  label="BOE (15:1)"
                  value={
                    operator.boeProduced ??
                    `${formatCount(operator.boeTotal)} BOE`
                  }
                  numeric
                />
              </Panel>
            </div>
          </div>
        </section>

        {/* ---- 5 · production over time ---- */}
        {/* Deferred so the production-graph request fires when the chart is
            approached rather than on page load. Shown whenever the operator has
            counties to ask about — the series no longer comes from the fixture. */}
        {operator.activeCounties.length > 0 ? (
          <section className="pt-[26px]">
            <DeferredSection minHeight={520} label="Production over time">
              <ProductionOverTime
                operatorNumber={operator.operatorNumber}
                operatorCounties={operator.activeCounties}
              />
            </DeferredSection>
          </section>
        ) : null}

        {/* ---- 6 · production by county ---- */}
        {operator.countyRows.length > 0 ? (
          <section className="pt-[26px]">
            {/* 84 rows, each with six cells. */}
            <DeferredSection minHeight={640} label="Production by county">
              <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
                <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
                  <h2 className={cardTitleClass}>Production by county</h2>
                  <p className="mt-1 text-[13px] text-mv-muted">
                    Two questions at once: how important each county is to the
                    operator, and the operator to the county.
                  </p>
                </div>
                <CountyTable operator={operator} />
              </div>
            </DeferredSection>
          </section>
        ) : null}

        {/* ---- 7 · recent wells & permits ---- */}
        {recentWells.length > 0 ? (
          <section className="pt-[26px]">
            <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv">
              <div className="px-[22px] pb-3 pt-5 max-[560px]:px-4">
                <h2 className={cardTitleClass}>Recent wells &amp; permits</h2>
                <p className="mt-1 text-[13px] text-mv-muted">
                  Newest activity across the portfolio ·{" "}
                  {OPERATOR_ILLUSTRATIVE_NOTE}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
                  <caption className="sr-only">
                    Recent wells and permits, {recentWells.length} rows
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Well / Lease",
                        "API",
                        "County",
                        "Status",
                        "Type",
                        "Lateral",
                        "First prod.",
                      ].map((label, index) => (
                        <th
                          key={label}
                          scope="col"
                          className={`whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white ${index === 5 ? "text-right" : "text-left"}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentWells.map((well) => (
                      <tr
                        key={well.api}
                        className="[&:hover>*]:bg-mv-row-hover"
                      >
                        <th
                          scope="row"
                          className={`${CELL} text-left font-semibold text-mv-ink`}
                        >
                          {well.well}
                        </th>
                        <td className={`${CELL} tabular-nums`}>{well.api}</td>
                        <td className={CELL}>{well.county}</td>
                        <td className={CELL}>
                          <span className="inline-block rounded-full bg-mv-line-soft px-[10px] py-[3px] text-[12px] font-semibold text-mv-ink-soft">
                            {well.status}
                          </span>
                        </td>
                        <td className={CELL}>{well.type}</td>
                        <td className={`${CELL} text-right tabular-nums`}>
                          {well.lateral}
                        </td>
                        <td className={CELL}>{well.firstProduction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}

        {/* ---- 8 · leases ----
            Deferred so the lease read fires when the section is approached rather
            than on page load. It no longer depends on the fixture's rows: the table
            and its wells drilldown are both served by the operator API. */}
        <section className="pt-[26px]">
          <DeferredSection minHeight={620} label="Operator leases">
            <OperatorLeases
              operatorNumber={operator.operatorNumber}
              totalLeasesOnRecord={operator.leases}
              countyOptions={countyOptions}
            />
          </DeferredSection>
        </section>

        {/* ---- 9 · related operators ---- */}
        <section className="pt-[26px]">
          <p className={eyebrowClass}>Peers</p>
          <h2
            className={`${sectionTitleClass} mt-[7px] flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
          >
            Related operators
          </h2>
          <p className="mb-[14px] mt-[7px] text-[13px] text-mv-muted">
            Other major Texas operators — open any profile to compare.
          </p>
          <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
            {operator.peers.map((peer) => (
              <Link
                key={peer.slug}
                href={`/operators/${peer.slug}`}
                className="flex items-center gap-[11px] rounded-[14px] border border-mv-line bg-white p-4 !no-underline shadow-[0_1px_2px_rgba(24,24,27,.05)] transition-[transform,box-shadow,border-color] hover:-translate-y-px hover:border-mv-mint-line hover:shadow-mv focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                <OperatorMonogram monogram={peer.monogram} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-bold text-mv-ink">
                    {peer.shortName}
                  </span>
                  <span className="mt-[2px] block text-[12px] tabular-nums text-mv-muted">
                    {formatVolume(peer.boeTotal)} BOE
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---- 10 · CTA ---- */}
        <section className="pt-[26px]">
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-[linear-gradient(120deg,var(--color-mv-forest),var(--color-mv-night))] px-[26px] py-6 shadow-mv max-[560px]:px-5">
            <div className="min-w-[260px] flex-1">
              <strong className="text-[17px] font-bold text-white">
                Is {operator.name.split(/[ ,]/)[0]} <em>your</em> operator?
              </strong>
              <p className="mt-[5px] max-w-[520px] text-[13.5px] text-mv-on-deep-soft">
                A free account ties this operator&apos;s permits, completions
                and production postings to <b>your acreage</b> — with alerts
                when something new touches your leases. Always free, no card,
                and we&apos;re not a broker.
              </p>
            </div>
            <Link
              href="/signup?from=operator"
              className={buttonClass({ variant: "primary", size: "lg" })}
            >
              Create your free account →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ==========================================================================
   Server-only pieces
   ========================================================================== */

const CELL =
  "whitespace-nowrap border-b border-mv-line-soft bg-white px-4 py-3 text-mv-ink-soft";

function breadcrumbJsonLd(operator: OperatorDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Operator Directory",
        item: `${SITE_URL}/operators`,
      },
      { "@type": "ListItem", position: 3, name: operator.name },
    ],
  };
}

function SectionHead({
  eyebrow,
  title,
  aside,
}: {
  eyebrow?: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className={eyebrowClass}>{eyebrow}</p> : null}
        <h2
          className={`${sectionTitleClass} ${eyebrow ? "mt-[7px]" : ""} flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
        >
          {title}
        </h2>
      </div>
      {aside ? (
        <p className="max-w-[420px] text-[13px] text-mv-muted max-[640px]:text-left sm:text-right">
          {aside}
        </p>
      ) : null}
    </div>
  );
}

const CONDITION_ICONS = {
  production: Gauge,
  leases: FileText,
  permits: FileText,
  completions: CheckCircle2,
} as const;

function ConditionTile({ card }: { card: ConditionCard }) {
  const Icon = CONDITION_ICONS[card.icon];
  const Arrow = card.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <div className="rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold text-mv-muted">{card.label}</p>
        <span
          aria-hidden="true"
          className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-mv-tint text-mv-green-deep"
        >
          <Icon className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[25px] font-bold tracking-[-.02em] tabular-nums text-mv-ink">
          {card.value}
          {card.unit ? (
            <span className="ml-1 text-[12px] font-semibold text-mv-muted">
              {card.unit}
            </span>
          ) : null}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[12.5px] font-bold ${card.direction === "up" ? "text-mv-green-deep" : "text-mv-muted"}`}
        >
          <Arrow aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
          {card.delta}
          <span className="rounded-full bg-mv-line-soft px-[7px] py-[1px] text-[12px] font-bold text-mv-muted">
            {card.window}
          </span>
        </span>
      </p>
      <p className="mt-1 text-[12px] text-mv-muted">{card.foot}</p>
    </div>
  );
}

const CHANGE_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  add: Plus,
  flag: Flag,
  swap: Repeat,
} as const;

function ChangeItem({ row }: { row: ChangeRow }) {
  const Icon = CHANGE_ICONS[row.kind];
  const tone =
    row.kind === "up"
      ? "bg-mv-tint text-mv-green-deep"
      : row.kind === "down"
        ? "bg-mv-line-soft text-mv-muted"
        : "bg-mv-sand-tint text-mv-sand";

  return (
    <li className="flex items-start gap-3 rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <span
        aria-hidden="true"
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg ${tone}`}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 text-[13.5px] leading-[1.55] text-mv-ink-soft">
        <b className="font-bold text-mv-ink">{row.headline}</b> {row.detail}
        <span className="mt-1 block text-[12px] text-mv-muted">
          {row.source}
        </span>
      </span>
    </li>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.05)]">
      <p className="flex items-center gap-[10px] border-b border-mv-line-soft px-[18px] py-[14px] text-sm font-bold text-mv-ink">
        <span aria-hidden="true" className="text-mv-green-deep">
          {icon}
        </span>
        {title}
      </p>
      <dl className="m-0 px-[18px] py-2">{children}</dl>
    </div>
  );
}

function PanelRow({
  label,
  value,
  numeric = false,
  wrap = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  wrap?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-mv-line-soft py-[10px] last:border-b-0">
      <dt className="shrink-0 text-[12.5px] text-mv-muted">{label}</dt>
      <dd
        className={`m-0 text-right text-[13px] font-semibold text-mv-ink ${numeric ? "tabular-nums" : ""} ${wrap ? "whitespace-normal" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The choropleth, server-rendered.
 *
 * Each county path carries BOTH shades as CSS custom properties, plus its figures as
 * data attributes. The client shell then switches metric with a class and reads the
 * tooltip off the hovered path — so no geometry and no county data crosses the
 * boundary. `--b-oil` / `--b-gas` are bucket 0–5 mapped to a colour by the rules
 * below.
 */
function TexasChoropleth({ operator }: { operator: OperatorDetail }) {
  const shading = buildCountyShading(operator.countyRows);
  const byCounty = new Map(
    operator.countyRows.map((row) => [row.county.toUpperCase(), row]),
  );

  return (
    <>
      <style>{CHOROPLETH_CSS}</style>
      <svg
        viewBox={`0 0 ${TEXAS_VIEWBOX.width} ${TEXAS_VIEWBOX.height}`}
        className="tx-map block h-auto w-full"
        role="img"
        aria-label={
          operator.countyRows.length > 0
            ? `Texas counties shaded by ${operator.name}'s reported production. ${operator.counties} producing counties; the table below lists every figure.`
            : `Texas counties. Per-county production for ${operator.name} is not in this extract.`
        }
      >
        {Object.entries(TEXAS_COUNTY_PATHS).map(([name, d]) => {
          const key = name.toUpperCase();
          const row = byCounty.get(key);
          return (
            <path
              key={name}
              d={d}
              data-county={name}
              data-oil={row ? `${formatCount(row.oil)} bbl` : "—"}
              data-gas={row ? `${formatCount(row.gas)} Mcf` : "—"}
              style={
                {
                  "--b-oil": shading.oil[key] ?? 0,
                  "--b-gas": shading.gas[key] ?? 0,
                } as React.CSSProperties
              }
            />
          );
        })}
      </svg>

      {operator.countyRows.length > 0 ? (
        <p className="mt-2 flex flex-wrap items-center gap-2 px-1 text-[12px] text-mv-muted">
          <span>Lower</span>
          {[1, 2, 3, 4, 5].map((bucket) => (
            <span
              key={bucket}
              aria-hidden="true"
              className="h-[10px] w-[22px] rounded-sm"
              style={{ background: `var(--ramp-${bucket})` }}
            />
          ))}
          <span>Higher</span>
        </p>
      ) : null}
    </>
  );
}

/**
 * The ramp and the metric switch, as plain CSS.
 *
 * Inlined here rather than added to `globals.css` because it is meaningless outside
 * this one map, and it is what makes the metric toggle free: `.metric-gas` simply
 * re-points every fill at the other custom property.
 */
const CHOROPLETH_CSS = `
/* The prototype's own ramp and its neutral no-production fill, verbatim. */
.tx-map{--ramp-0:#e7ecea;--ramp-1:#cbe8db;--ramp-2:#7ecaa6;--ramp-3:#48b184;--ramp-4:#25925f;--ramp-5:#146848}
.tx-map path{stroke:#fff;stroke-width:.8;fill:var(--ramp-0);transition:fill .12s}
.tx-map path[style*="--b-oil:1"]{fill:var(--ramp-1)}
.tx-map path[style*="--b-oil:2"]{fill:var(--ramp-2)}
.tx-map path[style*="--b-oil:3"]{fill:var(--ramp-3)}
.tx-map path[style*="--b-oil:4"]{fill:var(--ramp-4)}
.tx-map path[style*="--b-oil:5"]{fill:var(--ramp-5)}
.metric-gas .tx-map path{fill:var(--ramp-0)}
.metric-gas .tx-map path[style*="--b-gas:1"]{fill:var(--ramp-1)}
.metric-gas .tx-map path[style*="--b-gas:2"]{fill:var(--ramp-2)}
.metric-gas .tx-map path[style*="--b-gas:3"]{fill:var(--ramp-3)}
.metric-gas .tx-map path[style*="--b-gas:4"]{fill:var(--ramp-4)}
.metric-gas .tx-map path[style*="--b-gas:5"]{fill:var(--ramp-5)}
.tx-map path:hover{stroke:var(--color-mv-green-deep);stroke-width:1.4}
`;

function CountyTable({ operator }: { operator: OperatorDetail }) {
  const totalBoe = operator.countyRows.reduce((sum, row) => sum + row.boe, 0);

  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0 text-[13.5px]">
        <caption className="sr-only">
          Production by county for {operator.name}, {operator.countyRows.length}{" "}
          counties
        </caption>
        <thead>
          <tr>
            {[
              ["County", "left"],
              ["Wells", "right"],
              ["Producing", "right"],
              ["Leases", "right"],
              ["Oil (bbl)", "right"],
              ["Gas (Mcf)", "right"],
              ["Share of BOE", "right"],
            ].map(([label, align]) => (
              <th
                key={label}
                scope="col"
                className={`sticky top-0 z-[2] whitespace-nowrap bg-mv-table-head px-4 py-3 text-[12px] font-semibold uppercase tracking-[.04em] text-white text-${align}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {operator.countyRows.map((row) => (
            <tr key={row.county} className="[&:hover>*]:bg-mv-row-hover">
              <th
                scope="row"
                className={`${CELL} text-left font-semibold text-mv-ink`}
              >
                {titleCase(row.county)}
              </th>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatCount(row.wells)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatCount(row.producing)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatCount(row.leases)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatCount(row.oil)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {formatCount(row.gas)}
              </td>
              <td className={`${CELL} text-right tabular-nums`}>
                {totalBoe > 0
                  ? `${((row.boe / totalBoe) * 100).toFixed(1)}%`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
