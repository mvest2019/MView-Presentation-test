import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  FileText,
  Gauge,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import { buttonClass } from "@/app/_components/button";
import { OperatorLogo } from "@/app/_components/operator-logo";
import {
  displayXsClass,
  eyebrowClass,
  sectionTitleClass,
} from "@/app/_components/typography";
import { operatorLogoPath } from "@/lib/operator-api-types";
import { whatChangedConfigured } from "@/lib/operator-what-changed-api";
import {
  OPERATOR_ILLUSTRATIVE_NOTE,
  baseFromDirectory,
  mergeOperatorDetails,
  formatCount,
  listOperatorDetailSlugs,
  type ConditionCard,
  type OperatorDetail,
} from "@/lib/operator-detail";
import { resolveOperatorSlug } from "@/lib/operator-slug-api";
import { TEXAS_COUNTY_PATHS, TEXAS_VIEWBOX } from "@/lib/texas-county-paths";

import { FootprintMap } from "./_components/footprint-map";
import { getOperatorCounties } from "@/lib/operator-api";
import { fetchOperatorDetails } from "@/lib/operator-details-api";
import {
  getRelatedOperators,
  type RelatedOperator,
} from "@/lib/operator-related-api";

import { DeferredSection } from "@/app/_components/deferred-section";
import { OperatorLeases } from "./_components/operator-leases";
import { OperatorWhatChanged } from "./_components/operator-what-changed";
import { CountyProduction } from "./_components/county-production";
import { EditableAddress } from "./_components/editable-address";
import { CountyShading } from "./_components/county-shading";
import { RecentWellsPermits } from "./_components/recent-wells-permits";
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
 * EVERY OPERATOR HAS A PAGE. The slug used to be looked up in a 30-record fixture,
 * so the other ~24,700 the listing links to answered 404. `resolveOperatorSlug` now
 * matches it against `/operators/search`'s own `operator_name_url`, and every figure
 * on the page comes from `/operators/details` or from a section's own endpoint.
 *
 * SECTIONS ARE GATED ON REAL DATA. Each asks whether its own data exists, which is
 * why one operator's page is fuller than another's — it is thinner because the record
 * is, not because the page is broken.
 *
 * A FAILED DETAIL READ IS AN ERROR STATE, NOT OLD DATA. It used to fall back to the
 * fixture's figures with nothing saying they were not live. See `loadOperator`.
 */

export function generateStaticParams() {
  // The thirty best-known operators are prerendered so the common pages are static.
  // Every other slug renders on demand and is resolved live, so this is a warm-cache
  // list rather than the set of pages that exist.
  return listOperatorDetailSlugs().map((slug) => ({ slug }));
}

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mineralview.com"
).replace(/\/+$/, "");

/**
 * Resolve a slug into a detail, or say which way it failed.
 *
 * THREE OUTCOMES, NOT TWO, because they need three different pages:
 *
 *   `unknown`      the slug names no operator in the directory -> 404.
 *   `unavailable`  the operator exists but `/operators/details` did not answer ->
 *                  an error state. It used to render the FIXTURE's figures here,
 *                  with nothing on screen saying they were not live.
 *   `ok`           the live record.
 *
 * ANY OPERATOR RESOLVES NOW, not just the thirty in the fixture. `resolveOperatorSlug`
 * matches the slug against `/operators/search`'s own `operator_name_url`, so every
 * operator the listing links to has a page.
 *
 * Called by both `generateMetadata` and the page body. Both reads are cached, so the
 * two awaits share one round trip rather than issuing two.
 */
type DetailLoad =
  | { status: "unknown" }
  | { status: "unavailable"; name: string; slug: string }
  | { status: "ok"; operator: OperatorDetail };

async function loadOperator(slug: string): Promise<DetailLoad> {
  /*
   * A FAILED LOOKUP IS NOT AN UNKNOWN OPERATOR, and must not fail the build.
   * `resolveOperatorSlug` reads `/operators/search`, which prerendering calls once per
   * page — so an upstream blip during a build used to throw out of the render and take
   * the whole build down with it. Measured: this build failed on
   * "POST /api/v1/operators/search failed to reach the operator API".
   *
   * A throw is therefore treated as "cannot resolve right now" and lands on the
   * unavailable state, which is honest and renders. Only a SUCCESSFUL search that
   * matched nothing is a 404 — that is the case where the slug really names no
   * operator.
   */
  let row;
  try {
    row = await resolveOperatorSlug(slug);
  } catch (error) {
    console.error("[operator-detail] slug lookup failed", { slug, error });
    return { status: "unavailable", name: "This operator", slug };
  }
  if (!row) return { status: "unknown" };

  const merged = mergeOperatorDetails(
    baseFromDirectory(row),
    await fetchOperatorDetails(row.operatorNumber),
  );

  // `mergeOperatorDetails` returns null when the details endpoint gave nothing. The
  // directory row still has the operator's name, which is enough to say WHOSE page
  // could not be loaded.
  if (!merged) {
    return { status: "unavailable", name: row.name, slug: row.slug };
  }
  return { status: "ok", operator: merged };
}

/**
 * Shown when the operator exists but its figures did not arrive.
 *
 * DELIBERATELY NOT A 404 AND NOT THE FIXTURE. The operator is real — the directory
 * resolved it — so a 404 would be a lie, and the fixture's figures would be stale data
 * dressed as live. This says what happened and offers the way back, in the same card
 * language the rest of the site uses for a failed read.
 */
function DetailUnavailable({ name }: { name: string }) {
  return (
    <div className="mx-auto max-w-[1180px] px-[22px] py-16 max-[767px]:px-4">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Know Your Operators", href: "/operators" },
          { label: name },
        ]}
      />
      <div
        role="alert"
        className="mt-6 rounded-2xl border border-mv-sand-line bg-mv-sand-tint px-6 py-8 text-center"
      >
        <h1 className={`${displayXsClass} mb-2 text-mv-ink`}>{name}</h1>
        <p className="mx-auto max-w-[520px] text-sm text-mv-ink-soft">
          This operator&rsquo;s production record could not be loaded just now.
          Nothing is wrong with the operator — the records service did not
          answer. Reloading in a moment usually resolves it.
        </p>
        <p className="mt-5">
          <Link
            href="/operators"
            className={buttonClass({ variant: "primary" })}
          >
            Back to the operator directory
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * The related-operators band, read on the server.
 *
 * IT OVERLAPS THE DETAIL READ rather than queuing behind it: the two do not depend
 * on each other, so the page waits for the slower of the pair instead of their sum.
 *
 * A failure degrades to an empty band. This is one supporting section on a page full
 * of them, and losing it is not worth losing the page.
 */
async function loadRelated(operatorNumber: string): Promise<RelatedOperator[]> {
  try {
    return await getRelatedOperators(operatorNumber);
  } catch (error) {
    console.error("[operator-detail] related operators unavailable", {
      operatorNumber,
      error,
    });
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const load = await loadOperator(slug);

  if (load.status === "unknown") {
    return { title: "Operator not found | Mineral View" };
  }

  /* A page that could not read its figures must not be indexed with a description
     full of them, and must not claim a rank it does not have. */
  if (load.status === "unavailable") {
    return {
      title: `${load.name} — Texas operator profile | Mineral View`,
      robots: { index: false, follow: true },
      alternates: { canonical: `/operators/${load.slug}` },
    };
  }

  const operator = load.operator;

  // `seo_operator_name` is the API's own marketing alias ("Pioneer Natural
  // Resources" rather than "Pioneer Natural RES USA, Inc"), which is what people
  // actually search for. Falls back to the filed name when absent.
  const title = `${operator.seoName ?? operator.name} (${operator.operatorNumber}) — Texas operator profile | Mineral View`;
  /* The rank clause is dropped when the API sends none, rather than published as
     "#0 statewide". */
  const description =
    `${operator.name} operates ${formatCount(operator.leases)} leases across ` +
    `${operator.counties} Texas counties` +
    (operator.rank > 0
      ? ` and ranks #${operator.rank} statewide by reported production`
      : "") +
    `. Production, footprint and county breakdown from Railroad Commission records.`;
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
  const load = await loadOperator(slug);
  if (load.status === "unknown") notFound();
  if (load.status === "unavailable") {
    return <DetailUnavailable name={load.name} />;
  }
  const operator = load.operator;

  /* Both reads are independent of each other, so they overlap: the page waits for
     the slower of the two rather than their sum. */
  const [countyOptions, related] = await Promise.all([
    loadCountyOptions(),
    loadRelated(operator.operatorNumber),
  ]);

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
              {/* The operator's real logo, the listing's tile at hero size.
                  `operatorLogoPath` is the same helper that produces the listing
                  row's `logoUrl`, so both surfaces resolve to the same bytes on the
                  same origin — and there is nothing to carry through the route,
                  because the value is a function of the operator number the page
                  already has. Missing or 404 falls back to the monogram, which is
                  what stood here before. `eager` because it is above the fold, so it
                  does not visibly swap in after the name. */}
              <OperatorLogo
                url={operatorLogoPath(operator.operatorNumber)}
                monogram={operator.monogram}
                name={operator.name}
                size={54}
                radius={13}
                monogramClassName="!rounded-[13px]"
                loading="eager"
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
                // Omitted rather than shown as "#0" when the API reports no rank.
                ...(operator.rank > 0 ? [`#${operator.rank} statewide`] : []),
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

        {/* ---- 3 · what changed — MOVED UP, see the note at the top ----
            Now measured rather than narrated: the Python analysis service reads the
            five MongoDB collections for THIS operator, computes and ranks the changes,
            and has Claude rephrase the finished findings. Deferred, so neither the
            request nor the model call touches first paint — the section reserves its
            height and fills in when approached. See `operator-what-changed.tsx`. */}
        {/* OMITTED ENTIRELY WHERE THE SERVICE IS NOT CONFIGURED. The heading is
            server-rendered and the panel is not, so without this gate a deployment
            with no analysis service showed "What changed" above a card explaining
            that it is not configured — an internal deploy note, on a public page.
            Checked on the server, so the section produces no markup at all. */}
        {whatChangedConfigured() ? (
          <section className="pt-[26px]">
            {/* The heading goes IN, rather than above: the section's Refresh button has
                to sit on its line, and only the component that owns the panel's state
                can place it there. `DeferredSection` moved inside with it — around the
                panel alone, so the heading paints immediately and the request still
                waits for the reader. */}
            <OperatorWhatChanged
              operatorNumber={operator.operatorNumber}
              heading={<SectionHead title="What changed" />}
            />
          </section>
        ) : null}

        {/* ---- 4 · footprint ---- */}
        <section className="pt-[26px]">
          {/* `mt-[7px]` went with the eyebrow that used to sit above this. */}
          <h2
            className={`${sectionTitleClass} mb-[14px] flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
          >
            Where {operator.name.split(/[ ,]/)[0]} operates across Texas
          </h2>

          <div className="grid grid-cols-[1.45fr_1fr] items-start gap-4 max-[940px]:grid-cols-1">
            {/* The choropleth is 254 <path> elements. Deferred so they are not laid
                out on first paint; the panels beside it are cheap and render at once. */}
            <DeferredSection minHeight={560} label="Texas footprint map">
              <FootprintMap
                hasData
                caption={
                  operator.countyRows.length > 0
                    ? `${operator.counties} producing counties · MView records`
                    : `${operator.counties} producing counties · per-county detail not in this extract`
                }
              >
                <CountyShading operatorNumber={operator.operatorNumber}>
                  <TexasChoropleth operator={operator} />
                </CountyShading>
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
                {/* The one editable row in this panel — see `editable-address.tsx`.
                    It renders `PanelRow`'s markup until the pencil is pressed, so the
                    panel reads exactly as it did. */}
                {operator.headquarters ? (
                  <EditableAddress
                    operatorNumber={operator.operatorNumber}
                    operatorName={operator.name}
                    /* The correction is filed against the operator's most-active
                       county, which is the only county this record identifies as
                       principal. "" when none is on file — the endpoint does not
                       require it, so a thin record must not block the submission. */
                    county={operator.topCounties[0] ?? ""}
                    address={operator.headquarters}
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
                  label="Oil Produced"
                  value={
                    operator.oilProduced ??
                    `${formatCount(operator.oilTotal)} bbl`
                  }
                  numeric
                />
                <PanelRow
                  label="Gas Produced"
                  value={
                    operator.gasProduced ??
                    `${formatCount(operator.gasTotal)} Mcf`
                  }
                  numeric
                />
                {/* DERIVED FROM THE THREE VOLUMES ABOVE, not from the fixture.
                    Omitted when the endpoint sends nothing to divide — a share of
                    BOE nobody can compute is not 0%. */}
                {operator.oilPct === null ? null : (
                  <PanelRow
                    label="Oil share of BOE"
                    value={`${operator.oilPct}%`}
                    numeric
                  />
                )}
                <PanelRow
                  label="BOE Produced (15:1)"
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

        {/* ---- 6 · production by county ----
            Live from `/operators/production-by-county`, paginated ten at a time.
            Deferred, so neither the request nor the table's DOM touches first paint. */}
        <section className="pt-[26px]">
          <DeferredSection minHeight={560} label="Production by county">
            <CountyProduction operatorNumber={operator.operatorNumber} />
          </DeferredSection>
        </section>

        {/* ---- 7 · recent wells & permits ---- */}
        {/* ---- 7 · recent wells & permits ----
            The component owns its own <section>: zero records must leave no heading
            and no top padding, and the count is only known after the fetch, so the
            server cannot decide it. `DeferredSection` drops its reserved height once
            mounted, so a null child collapses the whole thing. */}
        <DeferredSection minHeight={560} label="Recent wells and permits">
          <RecentWellsPermits operatorNumber={operator.operatorNumber} />
        </DeferredSection>

        {/* ---- 8 · leases ----
            Deferred so the lease read fires when the section is approached rather
            than on page load. It no longer depends on the fixture's rows: the table
            and its wells drilldown are both served by the operator API. */}
        <section className="pt-[26px]">
          <DeferredSection minHeight={620} label="Operator leases">
            {/*
              DEFECT 152 — the county filter listed all 255 Texas counties from
              `/operators/counties`, so picking almost any of them answered "No
              leases match these filters": Pioneer has leases in 79, not 255.

              `operator.activeCounties` is this operator's OWN county list, already
              on the record `/operators/details` returned for the page — the same
              array the footprint map shades. So the filter now offers only counties
              the operator actually reports in, and it costs no extra request.
            */}
            <OperatorLeases
              operatorNumber={operator.operatorNumber}
              totalLeasesOnRecord={operator.leases}
              /* Sorted, because the endpoint returns them in its own order —
                 Terry, Crockett, Jackson … — and a 79-entry picker nobody can scan
                 alphabetically is barely better than the 255 it replaced. */
              countyOptions={
                operator.activeCounties.length > 0
                  ? [...operator.activeCounties].sort((a, b) =>
                      a.localeCompare(b),
                    )
                  : countyOptions
              }
            />
          </DeferredSection>
        </section>

        {/* ---- 9 · related operators ---- */}
        {related.length === 0 ? null : (
          <section className="pt-[26px]">
            {/* `mt-[7px]` went with the eyebrow that used to sit above this. */}
            <h2
              className={`${sectionTitleClass} flex items-center gap-[11px] text-mv-ink before:h-[19px] before:w-1 before:rounded-full before:bg-mv-green-deep before:content-['']`}
            >
              Related operators
            </h2>
            <p className="mb-[14px] mt-[7px] text-[13px] text-mv-muted">
              Operators the record associates with{" "}
              {operator.name.split(/[ ,]/)[0]}
              {related.some((peer) => peer.slug)
                ? " — open any profile to compare."
                : "."}
            </p>
            <div className="grid grid-cols-4 gap-[14px] max-[940px]:grid-cols-2 max-[520px]:grid-cols-1">
              {related.map((peer) => (
                <RelatedCard key={peer.operatorNumber} peer={peer} />
              ))}
            </div>
          </section>
        )}

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
            {/* `/signup` DOES NOT EXIST IN THIS APP — it 404s. This button sent
                every visitor who pressed it to a dead page, which is the worst
                possible defect for the one conversion control on the profile: the
                copy is right, the intent is right, and the destination is nothing.
                The route is `/register`, and `from=operator-profile` is the
                enumerated in-product source value for this surface. */}
            <Link
              href="/register?from=operator-profile"
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
        {/*
          DEFECT 148 — this span rendered whatever the card carried, so a card with
          no comparison still drew one: `direction` undefined is not "up", so the
          ternary picked ArrowDown, and it was printed beside an empty delta and an
          empty window chip. That is the "1,547 ↓ —" the defect shows — an arrow
          asserting a fall with nothing behind it.

          Both halves are now required. A card with a real comparison renders the
          arrow, the delta and the period; a card without one renders nothing here
          and says what it has to say in its footer instead.
        */}
        {card.direction && card.delta ? (
          <span
            className={`inline-flex items-center gap-1 text-[12.5px] font-bold ${card.direction === "up" ? "text-mv-green-deep" : "text-mv-muted"}`}
          >
            <Arrow aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
            {card.delta}
            {card.window ? (
              <span className="rounded-full bg-mv-line-soft px-[7px] py-[1px] text-[12px] font-bold text-mv-muted">
                {card.window}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* Inside the same wrapping row, so it lands in the space the chip leaves
            rather than on a line of its own. See `footInline`. */}
        {card.footInline ? (
          <span className="text-[12px] font-normal text-mv-muted">
            {card.foot}
          </span>
        ) : null}
      </p>
      {card.footInline ? null : (
        <p className="mt-1 text-[12px] text-mv-muted">{card.foot}</p>
      )}
    </div>
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
/** Initials of the first two words, for a card with no logo on file. */
function monogramOf(name: string): string {
  const words = name.match(/[A-Za-z]+/g) ?? [];
  return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

/**
 * One related-operator card.
 *
 * A LINK ONLY WHERE THERE IS A PAGE TO LINK TO. `slug` is null for an operator this
 * site does not prerender, and `/operators/null` would 404 — so those render as a
 * plain tile carrying the same information without the affordance.
 *
 * The logo is the API's own, served from our origin; the initials stand in when an
 * operator has none. No production figure: this endpoint does not report one, and
 * the old fixture's BOE line had no source here.
 */
function RelatedCard({ peer }: { peer: RelatedOperator }) {
  const inner = (
    <>
      <OperatorLogo
        url={peer.logoUrl}
        monogram={monogramOf(peer.name)}
        size={40}
        radius={10}
      />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-bold text-mv-ink">
          {peer.name}
        </span>
        <span className="mt-[2px] block text-[12px] tabular-nums text-mv-muted">
          Operator no. {peer.operatorNumber}
        </span>
      </span>
    </>
  );

  const shell =
    "flex items-center gap-[11px] rounded-[14px] border border-mv-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]";

  if (!peer.slug) {
    return <div className={shell}>{inner}</div>;
  }

  return (
    <Link
      href={`/operators/${peer.slug}`}
      className={`${shell} !no-underline transition-[transform,box-shadow,border-color] hover:-translate-y-px hover:border-mv-mint-line hover:shadow-mv focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep`}
    >
      {inner}
    </Link>
  );
}

/**
 * The county geometry — server-rendered, deliberately.
 *
 * All 254 outlines are 64 KB and identical for every operator, so they gzip inside the
 * document and never enter a client bundle. Shading is NOT applied here any more: it
 * comes from `/operators/production-map`, and `CountyShading` writes it onto these
 * paths once the response lands. Each path still ships both custom properties, so the
 * Oil/Gas toggle stays a CSS class flip rather than a re-render.
 */
function TexasChoropleth({ operator }: { operator: OperatorDetail }) {
  return (
    <>
      <style>{CHOROPLETH_CSS}</style>
      <svg
        viewBox={`0 0 ${TEXAS_VIEWBOX.width} ${TEXAS_VIEWBOX.height}`}
        className="tx-map block h-auto w-full"
        role="img"
        aria-label={`Texas counties shaded by ${operator.name}'s reported production. The Production by county table below lists every figure.`}
      >
        {Object.entries(TEXAS_COUNTY_PATHS).map(([name, d]) => (
          <path
            key={name}
            d={d}
            data-county={name}
            // Neutral until the API answers, and filled in by `CountyShading`. An
            // unshaded county is honest; a guessed one is not.
            //
            // The bucket is a DATA ATTRIBUTE, not a CSS custom property, because the
            // CSS has to select on it: `[style*="--b-oil:3"]` is a substring match
            // against serialised CSS text, and `style.setProperty` writes
            // `--b-oil: 3` with a space where React writes `--b-oil:3` without one.
            // The selector silently stops matching the moment the value is set from
            // script. `[data-oil-bucket="3"]` is an exact attribute match and cannot
            // drift that way.
            data-oil="—"
            data-gas="—"
            data-oil-bucket="0"
            data-gas-bucket="0"
          />
        ))}
      </svg>
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
/* Bucket 0 is WHITE: a county the API reported nothing for is left blank, not tinted,
   so "no data" can never be mistaken for "a little". Buckets 1–5 are the ramp, pitched
   deliberately dark at the low end — the faint tints this started with were unreadable
   once the log scale spread most counties into the lower steps. */
.tx-map{--ramp-0:#fff;--ramp-1:#b7e3cd;--ramp-2:#69c39a;--ramp-3:#2f9e6b;--ramp-4:#177a4f;--ramp-5:#0b5236}
/* Gas reads red, oil green, on request, at matching intensity step for step. Both ramps
   darken as well as change hue, so the order survives greyscale and the common
   red-green colour deficiencies — the step is legible even when the hue is not. */
.tx-map{--gas-1:#f9c9bd;--gas-2:#ef9080;--gas-3:#dd5843;--gas-4:#b8301f;--gas-5:#7d1508}
/* ONE stroke colour for every county, shaded or not. It has to be a mid grey rather
   than the white it was: white borders vanish against the white no-data fill, and the
   requirement is that the county outlines stay visible and identical on both metrics.
   This grey reads against blank white and against the darkest green and red alike. */
.tx-map path{stroke:#8fa2ad;stroke-width:.8;fill:var(--ramp-0);transition:fill .12s}
.tx-map path[data-oil-bucket="1"]{fill:var(--ramp-1)}
.tx-map path[data-oil-bucket="2"]{fill:var(--ramp-2)}
.tx-map path[data-oil-bucket="3"]{fill:var(--ramp-3)}
.tx-map path[data-oil-bucket="4"]{fill:var(--ramp-4)}
.tx-map path[data-oil-bucket="5"]{fill:var(--ramp-5)}
.metric-gas .tx-map path{fill:var(--ramp-0)}
.metric-gas .tx-map path[data-gas-bucket="1"]{fill:var(--gas-1)}
.metric-gas .tx-map path[data-gas-bucket="2"]{fill:var(--gas-2)}
.metric-gas .tx-map path[data-gas-bucket="3"]{fill:var(--gas-3)}
.metric-gas .tx-map path[data-gas-bucket="4"]{fill:var(--gas-4)}
.metric-gas .tx-map path[data-gas-bucket="5"]{fill:var(--gas-5)}
/* The legend swatches follow the metric, so the key never contradicts the map. */
.tx-key[data-bucket="1"]{background:var(--ramp-1)}
.tx-key[data-bucket="2"]{background:var(--ramp-2)}
.tx-key[data-bucket="3"]{background:var(--ramp-3)}
.tx-key[data-bucket="4"]{background:var(--ramp-4)}
.tx-key[data-bucket="5"]{background:var(--ramp-5)}
.metric-gas .tx-key[data-bucket="1"]{background:var(--gas-1)}
.metric-gas .tx-key[data-bucket="2"]{background:var(--gas-2)}
.metric-gas .tx-key[data-bucket="3"]{background:var(--gas-3)}
.metric-gas .tx-key[data-bucket="4"]{background:var(--gas-4)}
.metric-gas .tx-key[data-bucket="5"]{background:var(--gas-5)}
/* ONLY COUNTIES WITH DATA ARE INTERACTIVE. \`pointer-events:none\` is what does it, and
   it settles hover and tooltip in one stroke: it stops \`:hover\` matching, AND the
   pointer event then targets the <svg> instead, so \`FootprintMap\`'s
   \`closest("path[data-county]")\` finds nothing and clears the tooltip. No JavaScript
   change needed, and nothing to keep in sync with the fills.

   It is deliberately METRIC-AWARE: a county can report oil and not gas, so which
   counties are live has to follow the visible metric, exactly as the fill does. */
.tx-map path{pointer-events:none}
.tx-map path:not([data-oil-bucket="0"]){pointer-events:auto}
.metric-gas .tx-map path{pointer-events:none}
.metric-gas .tx-map path:not([data-gas-bucket="0"]){pointer-events:auto}
/* The hover outline is gated on the same condition rather than left to
   \`pointer-events\` alone — the rule then states its own intent, and a blank county
   cannot pick up an outline if that ever changes. It tracks the metric's own colour. */
.tx-map path:not([data-oil-bucket="0"]):hover{stroke:var(--color-mv-green-deep);stroke-width:1.4}
.metric-gas .tx-map path:not([data-gas-bucket="0"]):hover{stroke:var(--color-mv-red);stroke-width:1.4}
.tx-key{--ramp-1:#b7e3cd;--ramp-2:#69c39a;--ramp-3:#2f9e6b;--ramp-4:#177a4f;--ramp-5:#0b5236;--gas-1:#f9c9bd;--gas-2:#ef9080;--gas-3:#dd5843;--gas-4:#b8301f;--gas-5:#7d1508}
`;
