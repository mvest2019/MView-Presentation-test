"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowDown,
  Building2,
  FileText,
  Flame,
  Info,
  Layers,
  MapPin,
  Ruler,
  ScrollText,
  TrendingUp,
} from "lucide-react";

import {
  getWellProductionMap,
  getWellSummaryMap,
  type MapProductionPoint,
  type MapWellSummary,
} from "@/lib/map-api";

import {
  COHORT_EUR,
  RESERVE_INTEGRITY,
  WELLBORE,
} from "./well-insights-data";
import { PermitSummary } from "./permit-summary";
import { AiSummary } from "./ai-summary";
import { downloadSummaryPdf } from "./download-summary";
import { ProductionChart } from "./production-chart";
import { WellboreDiagram } from "./wellbore-diagram";
import { WellSummaryHeader, type WellRecord } from "./well-summary-header";
import { wellSummaryFields } from "./well-summary-fields";

/*
 * The summary for one well.
 *
 * Every field comes from the service: `/wells/{api}/summary` for the record and
 * `/wells/{api}/production` for the chart. Nothing on this page is written
 * here — where the response has no value, the row shows an em dash.
 *
 * Two cards are not the service's yet: reserve integrity and cohort EUR. They
 * compare this well against the rest of the collection, which no per-well
 * endpoint answers, so they stay in `well-insights-data.ts` until one does.
 * Everything else on the page is this well's own — including the written read at
 * the foot of it, which the model now writes from this record.
 */

/*
 * What the cards show before the summary lands: the labels, with an em dash
 * for every figure.
 *
 * Not the old fixed values — those belonged to a different well, and showing
 * them for a second is worse than showing nothing. The labels come from the
 * response's own shape, so the cards keep their height and the page does not
 * jump when the figures arrive.
 */
const WELL_INFO_LABELS = [
  "Well Type",
  "Direction",
  "Well Age",
  "Reservoir/Play",
];
const LEASE_LABELS = ["Lease Name", "Lease No.", "Acres", "District"];
const ACTIVITY_LABELS = [
  "Filing Type",
  "Filing Purpose",
  "Spud Date",
  "First Production",
  "Completion Date",
  "Last Production",
];
const LOCATION_LABELS = ["Latitude", "Longitude"];
const DEPTH_LABELS = [
  "Start Depth",
  "True Vertical",
  "End Depth",
  "Nearest Well",
];

/* The decline rows carry a unit and a tone, so their placeholder must too. */
const DECLINE_LOADING = (label: string) => ({
  label,
  value: "—",
  unit: "",
  tone: "ink" as const,
});

const DECLINE_LABELS = [
  "Last month oil",
  "Next month est oil",
  "Month-on-month step",
  "Implied annual effective",
  "Last month gas",
  "Next month est gas",
  "Gas MoM step",
  "Last month GOR",
  "Forecast GOR",
  "Reserves at last month's rate",
  "Last year oil",
  "Last year gas",
  "Average est monthly",
];

const WELL_METRICS_LOADING = [
  { label: "Last Month Oil", value: "—", unit: "BBL" },
  { label: "Last Month Gas", value: "—", unit: "MCF" },
  { label: "Next Month Est Oil", value: "—", unit: "BBL" },
  { label: "Next Month Est Gas", value: "—", unit: "MCF" },
  { label: "Reserve Oil", value: "—", unit: "BBL" },
  { label: "Reserve Gas", value: "—", unit: "MCF" },
];

const blank = (labels: string[]) =>
  labels.map((label) => ({ label, value: "—" }));

export type SelectedWell = {
  api: string;
  lease: string;
  well: string;
  operator: string;
  status: string;
  wtype: string;
  county: string;
  /** The wells feed's own `recordType` — "Permit", "Completion", or empty. */
  record?: string;
};

export function WellInsightsPanel({ well }: { well: SelectedWell }) {
  /*
   * Which filing is on screen — the well's own, not a choice.
   *
   * A well has two records with the Commission and they describe different
   * things: the permit is what was applied for, the completion what was
   * drilled. Which one the map handed over is what `recordType` says, so a
   * permit row opens the permit and a completion row opens the completion.
   *
   * Anything else reads as a completion. The table's rows do not carry the
   * label, and a completion summary of a well is the safer default: it is what
   * most wells on the map have.
   */
  const record: WellRecord = /permit/i.test(well.record ?? "")
    ? "Permit"
    : "Completion";

  /*
   * The permit summary's own node, and whether there is one.
   *
   * Export lives in the header, the filing is rendered by `PermitSummary`, and
   * neither is inside the other — so the panel that renders both holds the ref
   * between them. `print-summary.ts` is what turns it into a PDF.
   */
  const permitRef = useRef<HTMLDivElement>(null);
  const [permitReady, setPermitReady] = useState(false);
  /* The completion record's node, for the same reason — the button that saves
     it lives in the header above, not inside the record. */
  const completionRef = useRef<HTMLDivElement>(null);
  /* Composing the pages takes a moment, and a button that looks idle while it
     happens gets pressed again. */
  const [exporting, setExporting] = useState(false);

  const downloadPermit = useCallback(async () => {
    setExporting(true);
    try {
      await downloadSummaryPdf(
        permitRef.current,
        `permit-${well.api || "summary"}`,
      );
    } finally {
      setExporting(false);
    }
  }, [well.api]);

  const downloadCompletion = useCallback(async () => {
    setExporting(true);
    try {
      await downloadSummaryPdf(
        completionRef.current,
        `completion-${well.api || "summary"}`,
      );
    } finally {
      setExporting(false);
    }
  }, [well.api]);

  /*
   * The completion record for the clicked well.
   *
   * Fetched by API number, which is the only thing the map knows for certain
   * — everything the strip and the cards below show comes back from here. The
   * three states are kept apart because they read differently: no summary yet,
   * a summary, or a well the service could not answer for.
   */
  const [summary, setSummary] = useState<MapWellSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** When the record came back — what the header's "last updated" means. */
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  /*
   * The monthly series behind the chart, asked for separately.
   *
   * Its own request because it is its own endpoint and its own size — two
   * hundred months against a page of fields — so the record does not wait on
   * the chart, nor the chart on the record.
   */
  const [production, setProduction] = useState<MapProductionPoint[] | null>(
    null,
  );
  const [productionError, setProductionError] = useState<string | null>(null);

  useEffect(() => {
    if (!well.api) return;

    let cancelled = false;

    getWellSummaryMap(well.api)
      .then((answer) => {
        if (cancelled) return;
        setSummary(answer);
        setError(null);
        setLoadedAt(new Date().toISOString());
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setSummary(null);
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load this well's summary.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [well.api]);

  useEffect(() => {
    if (!well.api) return;

    let cancelled = false;

    getWellProductionMap(well.api)
      .then((answer) => {
        if (cancelled) return;
        setProduction(answer.points);
        setProductionError(null);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setProduction([]);
        setProductionError(
          failure instanceof Error
            ? failure.message
            : "Could not load production for this well.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [well.api]);

  /*
   * Loading is derived, not stored: neither answer having arrived *is* the
   * loading state, and a third flag set from inside the effect would be a
   * cascading render for something already known. The panel is keyed by API
   * number where it is rendered, so a different well starts from nothing
   * rather than showing the last well's figures while its own arrive.
   */
  const loading = summary === null && error === null;
  const fields = summary ? wellSummaryFields(summary) : null;

  return (
    <div className="mv-thin-scroll h-full overflow-y-auto bg-mv-bg p-3 lg:p-4">
      <WellSummaryHeader
        record={record}
        loadedAt={loadedAt}
        completionExport={{
          /* Nothing to capture until the record is on the page. */
          ready: fields !== null,
          busy: exporting,
          download: downloadCompletion,
        }}
        permitExport={{
          ready: permitReady,
          busy: exporting,
          download: downloadPermit,
        }}
      />

      {record === "Permit" ? (
        <div className="mt-3">
          <PermitSummary
            well={well}
            printRef={permitRef}
            onReady={setPermitReady}
          />
        </div>
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-[#f6c9c6] bg-mv-red-bg px-4 py-[11px] text-[12px] text-mv-red"
            >
              {error}
            </p>
          )}

          {/* ---------------- the record, and the wait for it ----------------
              While the request is out the whole record blurs behind one
              message, the way the map does: every figure would otherwise be an
              em dash, and a page of dashes reads as a well with no data rather
              than a well still loading. */}
          <div className="relative">
            {/* The ref is inside the veil, as on the permit side: the PDF is of
                the record, not of the spinner that was over it. */}
            <div
              ref={completionRef}
              aria-busy={loading}
              className={
                loading ? "pointer-events-none select-none blur-[2px]" : ""
              }
            >
              {/* ---------------- identity strip ----------------
          A pale mint band rather than a white card: enough to read as the
          header the rest of the page hangs off, without going dark on a light
          layout. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] via-[#f2fbf5] to-[#e6f5ec] px-4 py-[14px]">
                <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#bfe0cd] bg-white">
                  <Flame
                    size={19}
                    strokeWidth={1.75}
                    className="text-mv-green-deep"
                    aria-hidden="true"
                  />
                </span>

                {/* The record's own identity, with what the map knew standing in
                until it arrives. */}
                <HeaderFact
                  label="Well Number"
                  value={fields?.header.wellNumber ?? well.well ?? "—"}
                />
                <HeaderFact label="API Number" value={well.api} mono />
                <HeaderFact
                  label="County"
                  value={titleCase(fields?.header.county ?? well.county)}
                />
                <HeaderFact
                  label="Well Status"
                  value={fields?.header.status ?? well.status ?? "—"}
                  tone="green"
                />

                <div className="ml-auto flex items-center gap-[10px] rounded-lg border border-[#cfe8da] bg-white px-[14px] py-[8px]">
                  <TrendingUp
                    size={18}
                    strokeWidth={1.75}
                    className="text-mv-green-deep"
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-[10.5px] leading-tight text-mv-muted">
                      Performance
                    </span>
                    <span className="block text-[14px] font-bold leading-tight text-mv-green-deep">
                      {fields?.header.performance ?? "—"}
                    </span>
                  </span>
                </div>
              </div>

              {/* ---------------- the six figures ----------------
          One card, ruled into six, rather than six cards: they are one row of
          readings about one well, and separate cards said they were separate
          things. `gap-px` over a line-coloured ground is the rule — each cell
          keeps its white fill and the 1px seams read as dividers, including
          where the grid wraps. */}
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-mv-line bg-mv-line md:grid-cols-3 xl:grid-cols-6">
                {(fields?.metrics ?? WELL_METRICS_LOADING).map((metric) => (
                  <div
                    key={metric.label}
                    className="bg-white px-[14px] py-[12px]"
                  >
                    <span className="block truncate text-[11px] leading-tight text-mv-slate">
                      {metric.label}
                    </span>
                    {/* Unit beside the figure, not under it: "10,826 BBL" is one
                reading, and on its own line the unit read as a third fact. */}
                    <span className="mt-[6px] flex items-baseline gap-[5px]">
                      <span className="text-[20px] font-bold leading-none tabular-nums text-mv-ink">
                        {metric.value}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-mv-muted">
                        {metric.unit}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              {/* ---------------- well · lease · operator ---------------- */}
              <div className="mt-3 grid gap-3 xl:grid-cols-3">
                <Card icon={Info} title="Well Information">
                  <Rows
                    rows={fields?.wellInformation ?? blank(WELL_INFO_LABELS)}
                  />
                </Card>

                <Card icon={ScrollText} title="Lease Information">
                  <Rows
                    rows={fields?.leaseInformation ?? blank(LEASE_LABELS)}
                  />
                </Card>

                <Card
                  icon={Layers}
                  title="Wellbore"
                  badge={fields?.wellboreKind ?? WELLBORE.kind}
                >
                  {/* Drawn to the record's own profile: a vertical hole is not
                  illustrated with a mile of lateral. */}
                  <WellboreDiagram
                    kind={fields?.wellboreKind ?? WELLBORE.kind}
                    surface={WELLBORE.surface}
                    /* The record's own producing interval where it names one. */
                    formation={fields?.formation || WELLBORE.formation}
                  />
                </Card>
              </div>

              {/* ---------------- activity · location · wellbore ---------------- */}
              <div className="mt-3 grid gap-3 xl:grid-cols-3">
                <Card
                  icon={FileText}
                  title="Latest Well Activity and Production"
                >
                  {/* One column: at half the card's width the dates were truncating to
              "12-03…" and "0…", which is worse than a taller card. */}
                  <Rows rows={fields?.activity ?? blank(ACTIVITY_LABELS)} />
                </Card>

                <Card icon={MapPin} title="Location">
                  {/* The tile and the coordinates side by side: a pinned map says
              "where" faster than four numbers do. */}
                  <div className="mt-3 flex items-stretch gap-4">
                    <LocationMark />
                    <Rows
                      rows={fields?.location ?? blank(LOCATION_LABELS)}
                      airy
                      className="mt-0 min-w-0 flex-1 self-center"
                    />
                  </div>
                </Card>

                <div className="flex flex-col gap-3">
                  <Card icon={Building2} title="Operator Info">
                    <div className="mt-[10px] flex items-baseline justify-between gap-3 text-[12px]">
                      <span className="shrink-0 text-mv-muted">Operator</span>
                      <span className="text-right font-semibold text-mv-ink">
                        {fields?.operator.value ?? well.operator ?? "—"}
                      </span>
                    </div>
                  </Card>

                  <Card icon={Ruler} title="Depth & Geometry">
                    {/* One column, like the cards beside it: two columns cut every
                depth down to "11,4…". */}
                    <Rows rows={fields?.depth ?? blank(DEPTH_LABELS)} />
                  </Card>
                </div>
              </div>

              {/* ---------------- production ---------------- */}
              <div className="mt-3">
                <ProductionChart
                  points={production ?? []}
                  /* The endpoint sends reported and forecast months in one
                     list; the record's last reported month is what separates
                     them. */
                  historyThrough={summary?.dates?.lastProduction ?? null}
                  loading={production === null && productionError === null}
                  error={productionError}
                />
              </div>

              {/* ---------------- diagnostics · integrity · cohort ----------------
          Two across, then the cohort table on its own row: at a third of the
          width its five bars had no room to differ, and the difference between
          them is the whole point of that card. */}
              <div className="mt-3 grid gap-3 xl:grid-cols-2">
                <Card
                  title="Decline Diagnostics"
                  aside="What the rate curve anchors reveal"
                  className="flex flex-col"
                >
                  {/* Two columns of seven, not one of fourteen: on one column this card
              ran to twice the height of the one beside it, and the pair read as
              a long list with a chart stranded at the top right.

              `auto-rows-fr` lets the rows share whatever height the taller card
              sets, so the two finish level. */}
                  <dl className="mt-2 grid flex-1 auto-rows-fr gap-x-6 sm:grid-cols-2">
                    {(
                      fields?.decline ?? DECLINE_LABELS.map(DECLINE_LOADING)
                    ).map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between gap-3 border-b border-mv-line py-[6px] text-[12px]"
                      >
                        <dt className="min-w-0 truncate text-mv-slate">
                          {row.label}
                        </dt>
                        <dd className="flex items-baseline gap-[5px] whitespace-nowrap">
                          <span
                            className={`font-bold tabular-nums ${
                              row.tone === "down"
                                ? "text-mv-red"
                                : row.tone === "up"
                                  ? "text-mv-green-deep"
                                  : "text-mv-ink"
                            }`}
                          >
                            {row.value}
                          </span>
                          {row.unit && (
                            <span className="text-[10.5px] text-mv-muted">
                              {row.unit}
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <Card
                  title="Reserve Integrity"
                  aside="Stated Depletion vs Well Age"
                  className="flex flex-col"
                >
                  {/* The chart takes the slack and the note sits on the floor of the
              card, rather than both bunching at the top with a gap below. */}
                  <div className="mt-4 flex min-h-[168px] flex-1 items-end gap-3">
                    {RESERVE_INTEGRITY.bars.map((bar, index) => (
                      <div
                        key={bar.label}
                        className="flex flex-1 flex-col items-center"
                      >
                        <span className="mb-[6px] text-[11px] font-bold tabular-nums text-mv-ink">
                          {bar.value}%
                        </span>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            // Scaled from 40%, so the differences between 83 and 97
                            // are visible rather than five near-identical columns.
                            height: `${((bar.value - 40) / 60) * 120}px`,
                            background: BAR_COLOURS[index % BAR_COLOURS.length],
                          }}
                        />
                        <span className="mt-[6px] text-[9.5px] text-mv-muted">
                          {bar.label}
                        </span>
                        <span className="text-[9px] text-mv-muted/70">
                          {bar.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Note tone="red" icon={ArrowDown}>
                    {RESERVE_INTEGRITY.note}
                  </Note>
                </Card>

                {/*
          The chart and its reading side by side, not stacked: the two notes
          are what the bars are for, and under them they read as footnotes to a
          chart that has already been passed over.
        */}
                <div className="grid gap-4 rounded-xl border border-mv-line bg-white p-4 xl:col-span-2 xl:grid-cols-2 xl:gap-6">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-bold leading-none text-mv-ink">
                      Cohort EUR — the tell
                    </h3>
                    <div className="mt-[6px] text-[10.5px] text-mv-muted">
                      median booked EUR by age
                    </div>

                    {/*
              One colour, not five. These are the same measure at five ages, so
              colouring them differently would suggest five kinds of thing —
              the point is the shape of the sequence, which the bar lengths
              already carry.
            */}
                    <div className="mt-3">
                      {COHORT_EUR.bars.map((bar) => (
                        <div
                          key={bar.label}
                          className="flex items-center gap-3 py-[7px]"
                        >
                          <span className="w-[58px] shrink-0 text-[11px] text-mv-slate">
                            {bar.label}
                          </span>
                          <span className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef0f2]">
                            <span
                              className="block h-full rounded-full bg-mv-green-deep"
                              style={{
                                width: `${(bar.value / 400_000) * 100}%`,
                              }}
                            />
                          </span>
                          <span className="w-[56px] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-mv-ink">
                            {bar.display}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col justify-center gap-3">
                    {COHORT_EUR.notes.map((note, index) => (
                      <Note
                        key={note}
                        tone={index === 0 ? "red" : "blue"}
                        icon={index === 0 ? ArrowDown : Info}
                        flush
                      >
                        {note}
                      </Note>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---------------- the written read ----------------
          The permit tab's card, on this tab's record: same component, same
          model, same key — `/api/completion-summary` reads the completion where
          the other route reads the filing. It replaces the fixed six findings
          that used to sit here, which described a different well. */}
              <div className="mt-3">
                <AiSummary
                  api={well.api}
                  endpoint="/api/completion-summary"
                  caption="written from this well's own record"
                  loadingLabel="Reading the record…"
                  title={
                    fields
                      ? `${well.lease || "This well"} · ${fields.header.wellNumber}`
                      : well.api
                  }
                  context={
                    fields
                      ? `${fields.header.status} ${fields.wellboreKind} well · ${titleCase(fields.header.county)} County · ${fields.operator.value}`
                      : ""
                  }
                />
              </div>
            </div>

            {loading && (
              /*
                The veil covers the whole record; the message rides the middle
                of the *screen*, not the middle of the record.
                
                `inset-0` here is a couple of thousand pixels tall — the record
                scrolls — so a centred pill sat far below the fold. `sticky
                top-1/2` keeps it half way down the scrollport wherever the
                reader happens to be.
              */
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/40">
                <div className="sticky top-1/2 flex justify-center">
                  <div className="flex items-center gap-[13px] rounded-full border border-mv-line bg-white px-[22px] py-[13px] shadow-mv-lg">
                    <span
                      aria-hidden="true"
                      className="h-[20px] w-[20px] shrink-0 animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
                    />
                    <span className="text-[15px] font-semibold leading-none text-mv-slate">
                      Loading this well&rsquo;s record…
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

/*
 * The five ages, lightest to darkest.
 *
 * The same ramp the map's clusters use, so a green on this page means the same
 * thing wherever it appears. A red and an amber column here read as an alert on
 * the two youngest cohorts; the point is the shape of the sequence, and the
 * note under the chart is where the alarm belongs.
 */
const BAR_COLOURS = ["#c9e6d5", "#aedcc0", "#8fd0a8", "#6cc48d", "#4cbe74"];

const TONES = {
  green: { card: "border-[#bfe3cc] bg-[#f2faf5]", dot: "bg-mv-green-deep" },
  red: { card: "border-[#f6c9c6] bg-[#fdf3f2]", dot: "bg-mv-red" },
  blue: { card: "border-[#c7d7f2] bg-[#f3f7fd]", dot: "bg-mv-blue" },
};

function HeaderFact({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "green";
}) {
  return (
    <div className="min-w-0 border-l border-[#cfe8da] pl-4 first-of-type:border-0 first-of-type:pl-0">
      <div className="text-[10.5px] leading-tight text-mv-muted">{label}</div>
      <div
        className={`mt-[3px] truncate text-[16px] font-bold leading-tight ${
          tone === "green" ? "text-mv-green-deep" : "text-mv-ink"
        } ${mono ? "font-mono text-[15px]" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Heading({
  icon: Icon,
  title,
  aside,
  badge,
}: {
  icon?: typeof Info;
  title: string;
  aside?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon ? (
        <Icon
          size={14}
          className="shrink-0 text-mv-green-deep"
          aria-hidden="true"
        />
      ) : null}

      <h3 className="text-[12.5px] font-bold leading-none text-mv-ink">
        {title}
      </h3>

      {aside && (
        <span className="hidden truncate text-[10.5px] text-mv-muted lg:block">
          {aside}
        </span>
      )}

      {badge && (
        <span className="ml-auto shrink-0 rounded bg-[#e6f6ee] px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-[.06em] text-mv-green-deep">
          {badge}
        </span>
      )}
    </div>
  );
}

function Card({
  icon,
  title,
  aside,
  badge,
  className = "",
  children,
}: {
  icon?: typeof Info;
  title: string;
  aside?: string;
  badge?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-mv-line bg-white p-4 ${className}`}
    >
      <Heading icon={icon} title={title} aside={aside} badge={badge} />
      {children}
    </div>
  );
}

/** Label left, value right — in one column or two. */
function Rows({
  rows,
  columns = 1,
  airy = false,
  className = "",
}: {
  rows: { label: string; value: string }[];
  columns?: 1 | 2;
  /** More air between rows, for the short lists that sit beside a graphic. */
  airy?: boolean;
  className?: string;
}) {
  return (
    <dl
      className={`mt-[10px] ${
        columns === 2 ? "grid grid-cols-1 gap-x-6 sm:grid-cols-2" : ""
      } ${className}`}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-baseline justify-between gap-3 text-[12px] ${
            airy ? "py-[9px]" : "py-[5px]"
          }`}
        >
          <dt className="shrink-0 text-mv-muted">{row.label}</dt>
          <dd className="truncate text-right font-semibold text-mv-ink">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A map tile with the well pinned on it.
 *
 * Not a real map — the coordinates are static and one tile request per card is
 * not worth the trouble. Faint streets on a pale ground are enough to read as
 * "somewhere", and the pin is what the eye is meant to land on.
 */
function LocationMark() {
  return (
    <div className="relative min-h-[126px] w-[104px] shrink-0 self-stretch overflow-hidden rounded-xl border border-mv-line bg-[#eef3f0]">
      <svg
        viewBox="0 0 104 130"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {/* Blocks first, then the roads over them, as a street map draws. */}
        <g fill="#e7eee9">
          <rect x="6" y="8" width="26" height="20" rx="3" />
          <rect x="52" y="16" width="30" height="16" rx="3" />
          <rect x="14" y="52" width="22" height="26" rx="3" />
          <rect x="62" y="58" width="28" height="22" rx="3" />
          <rect x="10" y="98" width="34" height="18" rx="3" />
        </g>

        <g fill="none" stroke="#dfe8e2" strokeLinecap="round">
          <path d="M-8 40 L112 28" strokeWidth="7" />
          <path d="M-8 92 L112 84" strokeWidth="7" />
          <path d="M40 -8 L32 138" strokeWidth="7" />
          <path d="M84 -8 L94 138" strokeWidth="6" />
          <path d="M-8 66 L112 60" strokeWidth="3" />
          <path d="M14 -8 L8 138" strokeWidth="3" />
        </g>

        {/* A watercourse, for something that is not a straight line. */}
        <path
          d="M-8 122 C 24 108, 46 132, 70 114 S 96 100, 112 106"
          fill="none"
          stroke="#dce9ef"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>

      {/* The pin, centred: a green disc with the marker cut out of it. */}
      <span className="absolute left-1/2 top-1/2 grid h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-mv-green-deep shadow-mv">
        <MapPin
          size={18}
          strokeWidth={2}
          className="text-white"
          aria-hidden="true"
        />
      </span>
    </div>
  );
}

function Note({
  tone,
  icon: Icon,
  flush,
  children,
}: {
  tone: "red" | "blue";
  /** A marked disc rather than a plain dot, where the note carries the point. */
  icon?: typeof Info;
  /** Drop the top margin, for notes a parent already spaces. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  const look = tone === "red" ? TONES.red : TONES.blue;

  return (
    <div
      className={`flex items-start gap-[10px] rounded-lg border p-[12px] ${
        flush ? "" : "mt-3"
      } ${look.card}`}
    >
      {Icon ? (
        <span
          aria-hidden="true"
          className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${look.dot}`}
        >
          <Icon size={11} strokeWidth={3} className="text-white" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`mt-[3px] h-[8px] w-[8px] shrink-0 rounded-full ${look.dot}`}
        />
      )}
      <p className="text-[11px] leading-[1.55] text-mv-slate">{children}</p>
    </div>
  );
}

/** The wellbore in section: down, then out along the lateral. */
/** `TOM GREEN` reads better as `Tom Green` beside the operator's own casing. */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(
      /(^|\s|-)([a-z])/g,
      (_, lead: string, letter: string) => lead + letter.toUpperCase(),
    );
}
