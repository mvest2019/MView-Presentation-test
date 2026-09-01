"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowDown,
  Building2,
  Check,
  Copy,
  FileText,
  Flame,
  Globe,
  Info,
  Layers,
  LocateFixed,
  Map,
  MapPin,
  Ruler,
  ScrollText,
  TrendingUp,
} from "lucide-react";

import {
  getWellInsightsMap,
  getWellProductionMap,
  getWellSummaryMap,
  type MapProductionPoint,
  type MapWellInsights,
  type MapWellSummary,
} from "@/lib/map-api";

import { copyText } from "./copy-text";
import { declineRows, depletionBars, eurBars } from "./well-insights-fields";
import { WELLBORE } from "./well-insights-data";
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

/**
 * What to put in front of the reader when a request fails.
 *
 * Never the thrown message on its own: a dropped connection or a gateway that
 * gave up arrives as "TypeError: Failed to fetch", which tells somebody
 * looking at an empty record nothing they can do anything about. The service
 * failing is one thing to say, however it failed.
 */
function readable(failure: unknown, fallback: string): string {
  const message = failure instanceof Error ? failure.message : "";
  if (!message || /failed to fetch|networkerror|502|timeout/i.test(message)) {
    return fallback;
  }
  return message;
}

export function WellInsightsPanel({
  well,
  onClose,
}: {
  well: SelectedWell;
  /** Closes the record and hands the panel back to "Pick a well". */
  onClose?: () => void;
}) {
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

  /*
   * The decline diagnostics and the two cohort charts.
   *
   * All three were fixed copy — one well's figures, shown for every well. The
   * service computes them now, notes and all, so the page renders what it is
   * given rather than deriving anything of its own.
   */
  const [loaded, setLoaded] = useState<MapWellInsights | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  /*
   * The findings, split between the two cards that show them.
   *
   * The first is about depletion by age, which is what the Reserve Integrity
   * chart draws, so it sits there. Whatever is left belongs to the cohort
   * card — and for a well with no production the service returns only the one,
   * which is why that card has to cope with having none.
   */

  /* Only ever the answer for the well on screen. The response carries the API
     it was computed for, so a reply that arrives after the selection moved on
     is ignored rather than drawn under the wrong name. */
  const insights = loaded?.api10 === well.api ? loaded : null;
  const findings = insights?.cohorts?.findings ?? [];
  const cohortNotes = findings.slice(1);

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
          readable(
            failure,
            "Could not load this well — the service did not answer. Try again in a moment.",
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [well.api]);

  useEffect(() => {
    if (!well.api) return;

    let cancelled = false;

    getWellInsightsMap(well.api)
      .then((answer) => {
        if (cancelled) return;
        setLoaded(answer);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setLoaded(null);
        setInsightsError(
          readable(failure, "Could not load insights for this well."),
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
          readable(failure, "Could not load production for this well."),
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
        onClose={onClose}
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
              /*
               * The sheet is its own container.
               *
               * Everything below lays out against this width rather than the
               * window's. The panel is a share of a split view, so the two
               * have never been the same — and the PDF made that plain: the
               * capture stages this markup 1280px wide, but `xl:` still asked
               * the window, so exporting from a tablet produced a column of
               * cards down the middle of a wide sheet with the page breaks
               * falling wherever they liked.
               */
              className={`@container ${
                loading ? "pointer-events-none select-none blur-[2px]" : ""
              }`}
            >
              {/* ---------------- identity strip ----------------
          A pale mint band rather than a white card: enough to read as the
          header the rest of the page hangs off, without going dark on a light
          layout.

          A container, so the facts answer to the band's own width. This panel
          is a share of a split view -- the same window holds it at half the
          width with the table open -- and it used to be a wrapping flex row,
          which drops the chip onto a line of its own and leaves the rest of
          that line empty rather than narrowing the four facts. */}
              <div className="@container mt-3 rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] via-[#f2fbf5] to-[#e6f5ec] px-4 py-[14px]">
                <div className="flex flex-col gap-4 @md:flex-row @md:items-center @md:gap-5">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#bfe0cd] bg-white">
                      <Flame
                        size={19}
                        strokeWidth={1.75}
                        className="text-mv-green-deep"
                        aria-hidden="true"
                      />
                    </span>

                    {/* The record's own identity, with what the map knew
                    standing in until it arrives. Four across where four fit,
                    two by two where they do not: a grid rather than a row, so
                    the narrow case is still columns that line up.

                    790px is measured, not a guess: four values of the widest
                    kind this band holds -- a full API number, "No Production" --
                    with their rules, the icon and the chip, need a little under
                    that much. Narrower, they would be truncated rather than
                    laid out, so they take two rows instead. The figure is the
                    band's content box, which is what a container query
                    measures: the padding either side is not part of it. */}
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-3 @min-[790px]:grid-cols-4">
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
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-[10px] rounded-lg border border-[#cfe8da] bg-white px-[14px] py-[8px]">
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
              </div>

              {/* ---------------- the six figures ----------------
          One card, ruled into six, rather than six cards: they are one row of
          readings about one well, and separate cards said they were separate
          things. `gap-px` over a line-coloured ground is the rule — each cell
          keeps its white fill and the 1px seams read as dividers.

          A row that scrolls, not a grid that reflows. The column count used to
          come from the window — `xl:grid-cols-6` at a 1280px viewport, whether
          this panel was 900 wide or 600 — and at the narrow end that left each
          figure about a hundred pixels, which is "Last Month …" six times
          over. The floor is 140px: "Next Month Est Gas", the longest label
          here, measures 106 and the padding either side is 28. A floor rather
          than a width, so a figure longer than the label takes the room it
          needs instead of overrunning the seam, and `grow` so that where there
          is room the six share it and nothing scrolls at all.

          `overflow-y-hidden` on purpose: a lone `overflow-x-auto` makes the
          other axis `auto` too, and a stray pixel of height would put a second
          bar down the side of the strip. */}
              <div className="mv-thin-scroll mt-3 flex gap-px overflow-x-auto overflow-y-hidden rounded-xl border border-mv-line bg-mv-line">
                {(fields?.metrics ?? WELL_METRICS_LOADING).map((metric) => (
                  <div
                    key={metric.label}
                    className="min-w-[140px] shrink-0 grow bg-white px-[14px] py-[12px]"
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
              <div className="mt-3 grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3">
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
                  /* Two columns is an odd number of cards short: at tablet
                     width this one is the third of three, so it takes the row
                     under the other two rather than half of one. */
                  className="@2xl:col-span-2 @4xl:col-span-1"
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
              <div className="mt-3 grid gap-3 @2xl:grid-cols-2 @4xl:grid-cols-3">
                <Card
                  icon={FileText}
                  title="Latest Well Activity and Production"
                >
                  {/* One column: at half the card's width the dates were truncating to
              "12-03…" and "0…", which is worse than a taller card. */}
                  <Rows rows={fields?.activity ?? blank(ACTIVITY_LABELS)} />
                </Card>

                <Card
                  icon={MapPin}
                  title="Location"
                  aside="Well latitude & longitude"
                >
                  {/* The readings alone. The tile was a drawing rather than a
                      map of anywhere — the streets were the same on every well
                      — and the chip over it named what the four rows below
                      already say. */}
                  <div className="min-w-0">
                    <dl className="mt-2">
                      <PlaceRow
                        icon={Globe}
                        label="Latitude"
                        value={locationRow(fields?.location, "Latitude")}
                        copy
                      />
                      <PlaceRow
                        icon={Globe}
                        label="Longitude"
                        value={locationRow(fields?.location, "Longitude")}
                        copy
                      />
                      <PlaceRow
                        icon={LocateFixed}
                        label="Coordinate system"
                        value={locationRow(fields?.place, "Coordinate system")}
                      />
                      <PlaceRow
                        icon={Map}
                        label="Location"
                        value={locationRow(fields?.place, "Location")}
                      />
                    </dl>
                  </div>
                </Card>

                <div
                  /* One under the other in the third column where there are
                     three, and side by side across the row at the width where
                     there are two — stacked full width they were two short
                     cards with a page of empty line beside each. */
                  className="grid gap-3 @2xl:col-span-2 @2xl:grid-cols-2 @4xl:col-span-1 @4xl:grid-cols-1"
                >
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
                  /* Silent when the record itself failed: one outage, one
                     message at the top, rather than the same news repeated
                     down the page. */
                  error={error ? null : productionError}
                />
              </div>

              {/* ---------------- diagnostics · integrity · cohort ----------------
          Two across, then the cohort table on its own row: at a third of the
          width its five bars had no room to differ, and the difference between
          them is the whole point of that card. */}
              <div className="mt-3 grid gap-3 @2xl:grid-cols-2">
                <Card
                  title="Decline Diagnostics"
                  aside="What the rate curve anchors reveal"
                  className="flex flex-col"
                >
                  {/* One column, and it scrolls.

              Two columns were bought with the labels: at half the width every
              one of the fourteen was cut to "Last Month ...", which is the
              same four words over and over with the word that tells them
              apart dropped. Down one column they are readable in full.

              The height that cost is taken back by scrolling. `flex-1` with
              `min-h-0` lets the list take whatever the row gives it beside the
              chart and no more -- without `min-h-0` a flex child refuses to
              shrink below its content and would push the card taller instead
              of scrolling. The cap is for the stacked case, where there is no
              chart alongside to set a height. */}
                  <dl className="mv-thin-scroll mt-2 max-h-[300px] min-h-0 flex-1 overflow-y-auto pr-[6px]">
                    {(insights
                      ? declineRows(insights)
                      : DECLINE_LABELS.map(DECLINE_LOADING)
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

                  {/* The service's own caveats about these figures — that an
                      annual rate is one month compounded, that a stored zero
                      is a gap rather than a reading. They belong under the
                      numbers they qualify, and nothing else was rendering
                      them. */}
                  {(insights?.decline?.notes ?? []).map((note) => (
                    <Note
                      key={note.title}
                      tone={note.tone === "warn" ? "red" : "blue"}
                      icon={note.tone === "warn" ? ArrowDown : Info}
                    >
                      <span className="font-semibold">{note.title}.</span>{" "}
                      {note.body}
                    </Note>
                  ))}
                </Card>

                <Card
                  title="Reserve Integrity"
                  aside="Stated Depletion vs Well Age"
                  className="flex flex-col"
                >
                  {/* The chart takes the slack and the note sits on the floor of the
              card, rather than both bunching at the top with a gap below. */}
                  {/* `items-stretch`, so each column is as tall as the box and
                      the bars can be drawn as a share of it. */}
                  <div className="mt-4 flex min-h-[168px] flex-1 gap-3">
                    {depletionBars(insights).map((bar, index) => (
                      <div
                        key={bar.label}
                        className="flex flex-1 flex-col items-center"
                      >
                        {/* The plot: the bar rises from the floor of this box
                            and its figure rides on top. Both are placed
                            against the box rather than laid out in order,
                            which is what lets a percentage height mean
                            anything. */}
                        <div className="relative w-full flex-1">
                          <span
                            style={{
                              bottom: `calc(${Math.max(12, bar.share * 84)}% + 5px)`,
                            }}
                            className={`absolute inset-x-0 text-center text-[11px] font-bold leading-none tabular-nums ${
                              bar.isOwn ? "text-mv-green-deep" : "text-mv-ink"
                            }`}
                          >
                            {bar.display}
                          </span>

                          <div
                            /* Against the tallest bar rather than a fixed
                               axis: these are medians whose range changes
                               with the county, and a fixed ceiling flattened
                               most of them into five near-identical columns.

                               A share of the box, not a pixel height: the
                               card is as tall as the list beside it, which is
                               taller than any ceiling worth hard-coding, and
                               bars that ignored that sat in the bottom third
                               of an otherwise empty card. 84% leaves the
                               figure above the tallest one somewhere to
                               go. */
                            className="absolute inset-x-0 bottom-0 rounded-t-md"
                            style={{
                              height: `${Math.max(12, bar.share * 84)}%`,
                              background:
                                BAR_COLOURS[index % BAR_COLOURS.length],
                            }}
                          />
                        </div>

                        <span
                          className={`mt-[6px] text-[9.5px] ${
                            bar.isOwn
                              ? "font-bold text-mv-green-deep"
                              : "text-mv-muted"
                          }`}
                        >
                          {bar.label}
                        </span>
                        <span className="text-[9px] text-mv-muted/70">
                          {bar.count}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* The service writes these, and marks each with a tone —
                      so the page shows what it was told rather than deciding
                      for itself which finding is the bad news. */}
                  {findings.slice(0, 1).map((finding) => (
                    <Note
                      key={finding.title}
                      tone={finding.tone === "ok" ? "blue" : "red"}
                      icon={finding.tone === "ok" ? Info : ArrowDown}
                    >
                      {finding.body}
                    </Note>
                  ))}

                  {insightsError && !error && (
                    <Note tone="red" icon={ArrowDown}>
                      {insightsError}
                    </Note>
                  )}
                </Card>

                {/*
          The chart and its reading side by side, not stacked: the two notes
          are what the bars are for, and under them they read as footnotes to a
          chart that has already been passed over.
        */}
                {/*
          The chart and its reading side by side — unless the service returned
          only the one finding, which the card above has already used. Then the
          chart takes the whole width rather than sitting beside an empty box.
        */}
                <div
                  /* The width of the row, at every size the row has more
                     than one column: it is a chart with a reading beside it,
                     and half a column left it a stack of bars with a page of
                     nothing next to them. */
                  className={`grid gap-4 rounded-xl border border-mv-line bg-white p-4 @2xl:col-span-2 @4xl:gap-6 ${
                    cohortNotes.length > 0 ? "@4xl:grid-cols-2" : ""
                  }`}
                >
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
                      {eurBars(insights).map((bar) => (
                        <div
                          key={bar.label}
                          className="flex items-center gap-3 py-[7px]"
                        >
                          <span
                            className={`w-[58px] shrink-0 text-[11px] ${
                              bar.isOwn
                                ? "font-bold text-mv-green-deep"
                                : "text-mv-slate"
                            }`}
                          >
                            {bar.label}
                          </span>
                          <span className="h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef0f2]">
                            <span
                              className="block h-full rounded-full bg-mv-green-deep"
                              style={{ width: `${bar.share * 100}%` }}
                            />
                          </span>
                          <span className="w-[56px] shrink-0 text-right text-[11.5px] font-bold tabular-nums text-mv-ink">
                            {bar.display}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {cohortNotes.length > 0 && (
                    <div className="flex min-w-0 flex-col justify-center gap-3">
                      {cohortNotes.map((finding) => (
                        <Note
                          key={finding.title}
                          tone={finding.tone === "warn" ? "red" : "blue"}
                          icon={finding.tone === "warn" ? ArrowDown : Info}
                          flush
                          /* Half the card's width, so two lines came to a
                             clause and a Read more. */
                          lines={3}
                        >
                          <span className="font-semibold">
                            {finding.title}.
                          </span>{" "}
                          {finding.body}
                        </Note>
                      ))}
                    </div>
                  )}
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

/*
 * `fade` is the card's own fill, repeated as a value rather than a class: the
 * Read more link is laid over the end of a clamped line and needs the tint
 * behind it as a gradient stop, which is not something a background class can
 * be asked for.
 */
const TONES = {
  green: {
    card: "border-[#bfe3cc] bg-[#f2faf5]",
    dot: "bg-mv-green-deep",
    fade: "#f2faf5",
    link: "text-mv-green-deep",
  },
  red: {
    card: "border-[#f6c9c6] bg-[#fdf3f2]",
    dot: "bg-mv-red",
    fade: "#fdf3f2",
    link: "text-mv-red",
  },
  blue: {
    card: "border-[#c7d7f2] bg-[#f3f7fd]",
    dot: "bg-mv-blue",
    fade: "#f3f7fd",
    link: "text-mv-blue",
  },
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
    <div className="min-w-0 @min-[790px]:border-l @min-[790px]:border-[#cfe8da] @min-[790px]:pl-4 @min-[790px]:first-of-type:border-0 @min-[790px]:first-of-type:pl-0">
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
      /* A page of the PDF may end at the foot of any card. Marked rather than
         guessed at by depth: the capture used to measure two levels of the
         panel's own markup, and on a narrow screen the cards sit one level
         further in — so the production chart offered no edge to break at and
         the page was cut through the middle of it. */
      data-page-block=""
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
          {/* `title` for the ones that do not fit: these are records, and a
              value cut to "GOLDSMIT…" is not one. */}
          <dd
            title={row.value}
            className="truncate text-right font-semibold text-mv-ink"
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** One reading about the point: its mark, its name, its value. */
function PlaceRow({
  icon: Icon,
  label,
  value,
  copy,
}: {
  icon: typeof Info;
  label: string;
  value: string;
  /** The two coordinates carry it; the two names below them do not. */
  copy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-3 border-b border-mv-line-soft py-[9px] last:border-b-0">
      <span
        aria-hidden="true"
        className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
      >
        <Icon size={14} strokeWidth={2} />
      </span>

      <span className="min-w-0 flex-1">
        <dt className="text-[10.5px] leading-none text-mv-muted">{label}</dt>
        <dd
          title={value}
          className="mt-[5px] truncate text-[12.5px] font-bold leading-none text-mv-ink"
        >
          {value}
        </dd>
      </span>

      {copy && (
        <button
          type="button"
          data-screen-only=""
          onClick={() => {
            void copyText(value).then((done) => {
              if (!done) return;
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            });
          }}
          aria-label={`Copy the ${label.toLowerCase()}`}
          title={copied ? "Copied" : "Copy"}
          className="grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-muted hover:border-mv-green-deep hover:text-mv-green-deep"
        >
          {copied ? (
            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <Copy size={13} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}

/** The value the fields builder put under one label, or an em dash. */
function locationRow(
  rows: { label: string; value: string }[] | undefined,
  label: string,
): string {
  return rows?.find((row) => row.label === label)?.value ?? "—";
}

function Note({
  tone,
  icon: Icon,
  flush,
  lines = 2,
  children,
}: {
  tone: "red" | "blue";
  /** A marked disc rather than a plain dot, where the note carries the point. */
  icon?: typeof Info;
  /** Drop the top margin, for notes a parent already spaces. */
  flush?: boolean;
  /**
   * How much shows before Read more.
   *
   * Two lines across the width of a card is a sentence and a half. In a half
   * width column it is a clause, so the notes beside the cohort bars ask for
   * three. Written out rather than built from the number: the class has to be
   * there in full for the stylesheet to hold it.
   */
  lines?: 2 | 3;
  children: React.ReactNode;
}) {
  const look = tone === "red" ? TONES.red : TONES.blue;

  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  /*
   * Whether there is a third line to open.
   *
   * Measured, not guessed: a Read more on a note that already fits opens
   * nothing, and there is no telling from the text how many lines it will
   * take at whatever width this panel happens to be. A ResizeObserver rather
   * than a one-off read because that width changes -- the panel is a share of
   * a split view -- and because it reports on its own schedule rather than
   * during the effect, which is where React's compiler wants no setState.
   *
   * `children` is in the deps so a different note in the same slot is
   * re-measured; opened, there is nothing to measure, since the clamp that
   * would overflow has been taken off.
   */
  useEffect(() => {
    const node = textRef.current;
    if (!node || open) return;

    const observer = new ResizeObserver(() => {
      setLong(node.scrollHeight > node.clientHeight + 1);
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, [open, children]);

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
      <div className="relative min-w-0 flex-1">
        <p
          ref={textRef}
          className={`text-[11px] leading-[1.55] text-mv-slate ${
            open ? "" : lines === 3 ? "line-clamp-3" : "line-clamp-2"
          }`}
        >
          {children}
        </p>

        {long && !open && (
          /* On the second line, not under the block: the note is two lines
             tall either way, and a link on a third line would cost the height
             the clamp was there to save. The gradient is what lets it sit
             there -- the clipped words fade into the card's own tint rather
             than running into the word "Read". */
          <button
            type="button"
            data-screen-only=""
            aria-expanded={false}
            onClick={() => setOpen(true)}
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${look.fade} 22px)`,
            }}
            className={`absolute bottom-0 right-0 cursor-pointer pl-[30px] text-[11px] font-semibold leading-[1.55] hover:underline ${look.link}`}
          >
            Read more
          </button>
        )}

        {open && (
          <button
            type="button"
            data-screen-only=""
            aria-expanded={true}
            onClick={() => setOpen(false)}
            className={`mt-[3px] cursor-pointer text-[11px] font-semibold hover:underline ${look.link}`}
          >
            Show less
          </button>
        )}
      </div>
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
