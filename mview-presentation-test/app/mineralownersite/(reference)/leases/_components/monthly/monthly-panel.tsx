"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import { fetchMonthlyReport, LeasesApiError } from "../../_api/leases-api";
import {
  buildMonthlyReport,
  DEFAULT_REPORT_INDEX,
  reportMonthOptions,
  type MonthlyReport,
} from "../../_lib/monthly-report";
import { monthlyReportFromApi } from "../../_lib/monthly-report-from-api";
import { PageCashFlow } from "./page-cash-flow";
import { PageDevelopment } from "./page-development";
import { PageExecutive } from "./page-executive";
import { PageLeaseAnalysis } from "./page-lease-analysis";
import { PageMonth } from "./page-month";
import { PageOperators } from "./page-operators";
import { PageOutlook } from "./page-outlook";
import { PagePrices } from "./page-prices";
import { PagePress } from "./page-press";
import { PageRevenue } from "./page-revenue";
import { PageSideBySide } from "./page-side-by-side";
import { PageYear } from "./page-year";
import { ReportHeader } from "./report-header";
import { ReportProvider } from "./report-context";
import { usePortalViewState } from "../../../../_components/reference/view-state";
import { sampleLeaseRecords } from "../../_lib/sample-leases";

/**
 * MONTHLY REPORTS — twelve pages about one month, on one screen.
 *
 * ── IT HOLDS ONE PIECE OF STATE: WHICH MONTH ──
 *
 * Everything else is derived. `buildMonthlyReport` reads the month out of the
 * series and returns every figure all twelve pages print, which is why they
 * cannot disagree with each other — page 5's column totals to page 2's headline
 * because they are the same number, not two calculations that happen to match.
 *
 * ── ALL TWELVE ARE RENDERED, NOT TABBED ──
 *
 * This is a document. A reader scrolling one expects to keep scrolling, the
 * browser's own find-in-page has to reach every figure in it, and it has to
 * print. The chips at the top jump between pages rather than swapping them, so
 * nothing is ever hidden behind a control.
 *
 * ── THE ORDER IS THE ARGUMENT, AND IT LIVES IN `REPORT_PAGES` ──
 *
 * The list this file renders and the chips the header renders both read from
 * that one array, so a page cannot be added to the document without appearing in
 * the navigation, or the other way round.
 */
export function MonthlyPanel() {
  const [index, setIndex] = useState(DEFAULT_REPORT_INDEX);

  const months = useMemo(() => reportMonthOptions(), []);
  /* Rebuilt only when the month changes: the builder walks ten leases across a
     twelve-month trailing window for each, which is not work to repeat on an
     unrelated re-render. */
  /* WHOSE RECORD THIS IS. The shell's own funnel state, the same one the lease
     list and the value band read — so all three tabs agree about whether this
     visitor has claimed anything. Unclaimed gets the sample identities and
     withheld figures; see `report-context.tsx`. */
  const unclaimed = usePortalViewState()?.funnel === "unclaimed";

  const fixture = useMemo(
    () => buildMonthlyReport(index, unclaimed ? sampleLeaseRecords : undefined),
    [index, unclaimed],
  );

  /* ── THE READ WAITS UNTIL THE TAB IS ACTUALLY OPENED ──
     All three tab panels are force-mounted and the inactive ones hidden with
     CSS — see `TabsContent` — so mounting is not opening, and a fetch on mount
     would fire beside the lease list's own 79 requests and the financials read.
     The service caches one record per owner and every COLD request starts its
     own build of it, so two in flight together is the hundred-second build done
     twice rather than once shared. See `fetchMonthlyReport`.

     A hidden panel never intersects anything, so the first intersection IS the
     first time a reader has this tab in front of them. It fires once and the
     observer disconnects. */
  const root = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (opened || unclaimed) return;
    const node = root.current;
    if (!node) return;

    /* ── THE TAB'S OWN STATE, READ OFF THE DOM ──
       Radix marks the panel `data-state="active"` or `"inactive"`, and that
       attribute IS the click: it flips the moment a reader chooses the tab, and
       it already says `active` on arrival when `?ltab=mon` deep-links here.

       NOT A RESIZE OR INTERSECTION OBSERVER, both of which were tried. Those
       are driven by the rendering loop, so a browser that is not painting — a
       backgrounded tab, a hidden preview pane — never runs their callbacks and
       the read silently never starts. A MutationObserver is driven by the DOM,
       which mutates whether or not anything is drawn.

       NO TABPANEL ANCESTOR means the panel is not inside a tab strip at all, so
       there is nothing to wait for. */
    const panel = node.closest('[role="tabpanel"]');

    const check = () => !panel || panel.getAttribute("data-state") === "active";

    /* A microtask rather than a call here: a synchronous set inside an effect
       is a second render pass before the first has been shown. */
    let live = true;
    queueMicrotask(() => {
      if (live && check()) setOpened(true);
    });

    if (!panel) return;

    const watcher = new MutationObserver(() => {
      if (check()) {
        setOpened(true);
        watcher.disconnect();
      }
    });
    watcher.observe(panel, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    return () => {
      live = false;
      watcher.disconnect();
    };
  }, [opened, unclaimed]);

  /** Which month the reader asked for. Null means "the newest one filed". */
  const [cycle, setCycle] = useState<string | null>(null);
  const [served, setServed] = useState<MonthlyReport | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || unclaimed) return;

    const controller = new AbortController();
    fetchMonthlyReport(cycle, controller.signal)
      .then((wire) => {
        if (controller.signal.aborted) return;
        setServed(monthlyReportFromApi(wire));
        setFailure(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        /* A MONTH THAT WAS NEVER FILED IS NOT AN OUTAGE — the service answers
           404 `LEASES_MONTH_NOT_FILED` and names the months that were, which is
           deliberately not a page of zeroes. The message carries that. */
        setFailure(
          error instanceof LeasesApiError
            ? error.message
            : "This monthly report could not be loaded.",
        );
      });

    return () => controller.abort();
  }, [opened, unclaimed, cycle]);

  /* The served report when there is one, the fixture until then. An unclaimed
     visitor never leaves the fixture. */
  const report = served ?? fixture;

  /* The picker is the service's own 24 months when they are in hand, and the
     fixture's otherwise. Its `index` is a POSITION in that list rather than a
     meaning of its own — the served path turns it back into a cycle. */
  const monthOptions = served?.served
    ? served.served.months.map((month, position) => ({
        index: position,
        label: month.label,
      }))
    : months;

  const chooseMonth = (position: number) => {
    const list = served?.served?.months;
    if (list) setCycle(list[position]?.cycle ?? null);
    else setIndex(position);
  };

  /* ── ANY READ IN FLIGHT SHOWS THE LOADING REPORT ──
     The first one and every month change alike. The alternative — keeping the
     previous month on screen while the next arrived — reads as a page that has
     not reacted to the control the reader just used, and for the seconds it
     takes, every figure on it belongs to a different month than the one the
     dropdown now names.

     IT REPLACES THE HEADER TOO, dropdown and all. Leaving the header up meant
     choosing between the OLD month's title and total beside a loading body, or
     the NEW month's name over the old month's figures. One state that says
     "this is loading" is easier to trust than a header telling half a truth.

     THE MONTH IS NAMED when the reader chose one, which is the point of showing
     this on a change: the page confirms what it went to fetch. */
  const pending =
    opened &&
    !unclaimed &&
    !failure &&
    (!served || (cycle !== null && served.served?.cycle !== cycle));

  const pendingMonth =
    cycle === null
      ? null
      : (served?.served?.months.find((month) => month.cycle === cycle)?.label ??
        null);

  return (
    <ReportProvider unclaimed={unclaimed} pages={report.served?.pages}>
      {/* THE REF STAYS MOUNTED IN EVERY STATE. It is what the tab-open watcher
          observes, so returning a loading card INSTEAD of this div would leave
          nothing to observe and the read would never start. */}
      <div ref={root}>
        {pending && <ReportBuilding month={pendingMonth} />}

        {!pending && (
          <>
            <ReportHeader
              report={report}
              monthOptions={monthOptions}
              onMonthChange={chooseMonth}
            />

            {failure && (
              <p className="mt-3 text-center text-[12px] text-mv-muted">
                {failure}
              </p>
            )}

            <PageExecutive report={report} />
            <PageMonth report={report} />
            <PageRevenue report={report} />
            <PageLeaseAnalysis report={report} />
            <PageSideBySide report={report} />
            <PageOutlook report={report} />
            <PageDevelopment report={report} />
            <PageOperators report={report} />
            <PageCashFlow report={report} />
            <PagePrices report={report} />
            <PagePress report={report} />
            <PageYear report={report} />

            <p className="mt-4 text-center text-[11.5px] text-mv-muted">
              Twelve pages · built from the Texas public record. Production
              figures are what the operator reported to the state; a statement
              is a different document and will not match this to the penny.
            </p>
          </>
        )}
      </div>
    </ReportProvider>
  );
}

/**
 * WHAT THE REPORT LOOKS LIKE BEFORE IT ARRIVES.
 *
 * THE SHAPE, NOT A SPINNER. A reader who has just opened a twelve-page document
 * should see that twelve pages are coming: the dark band, the chip row, a page
 * card. A centred spinner says only that something is happening somewhere.
 *
 * IT SAYS HOW LONG, because it can be long. The first read of a record builds
 * the whole thing server-side and has been measured at over ninety seconds;
 * every read after it is under a second. A wait nobody warned you about reads
 * as a hang, and a reader who knows it is a minute will leave it alone rather
 * than reloading — which starts the build again.
 */
function ReportBuilding({ month }: { month: string | null }) {
  return (
    <div>
      <Card padded={false} className="overflow-hidden">
        <div className="bg-[linear-gradient(160deg,var(--color-mv-ink),var(--color-mv-portal-band-end))] p-[22px] text-white">
          <p className="text-[10.5px] font-bold tracking-[0.12em] text-mv-on-head-soft uppercase">
            Monthly report
          </p>
          <h2 className="mt-1.5 text-[28px] leading-none font-bold">
            {month ? `Reading ${month}…` : "Building your report…"}
          </h2>
          <p className="mt-2 max-w-[52ch] text-[12.5px] leading-[1.6] text-mv-on-head-soft">
            Twelve pages about one month, from the filings on every lease you
            hold.{" "}
            {month
              ? "A month the service has already built comes back in under a second."
              : "The first read of a record can take a minute while the service assembles it; every read after that is instant."}
          </p>

          <div
            aria-hidden="true"
            className="mt-4 h-1 w-full max-w-[380px] overflow-hidden rounded-full bg-white/15"
          >
            <div className="h-full w-1/3 animate-pulse rounded-full bg-mv-green" />
          </div>
        </div>

        {/* The chip row, at rest. Twelve of them, because that is how many
            pages are coming. */}
        <div className="flex flex-wrap gap-2 border-t border-mv-line p-4">
          {Array.from({ length: 12 }, (_, page) => (
            <span
              key={page}
              aria-hidden="true"
              className="h-[30px] w-[118px] animate-pulse rounded-full bg-mv-portal-wash"
            />
          ))}
        </div>
      </Card>

      {/* FIVE CARDS, AND THEY ARE NOT THE SAME CARD FIVE TIMES. One block of
          shape told a reader something was coming; it did not tell them that
          what is coming is a long document of differently shaped pages. Each
          variant below is the silhouette of the page that will land in its
          place — three columns for the summary, a tile row for the month, a
          chart, a table, a split. Five is enough to fill the fold without
          pretending to preview all twelve. */}
      {SKELETON_PAGES.map((shape, page) => (
        <Card key={page} padded={false} className="mt-4 px-[22px] py-[18px]">
          <span
            aria-hidden="true"
            className="block h-[22px] animate-pulse rounded bg-mv-portal-wash"
            style={{ width: shape.title }}
          />

          {shape.kind === "columns" && (
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, column) => (
                <Lines key={column} widths={[100, 92, 96, 64]} />
              ))}
            </div>
          )}

          {shape.kind === "tiles" && (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, tile) => (
                  <span
                    key={tile}
                    aria-hidden="true"
                    className="block h-[74px] animate-pulse rounded-mv bg-mv-portal-wash"
                  />
                ))}
              </div>
              <div className="mt-4">
                <Lines widths={[96, 88, 70]} />
              </div>
            </>
          )}

          {shape.kind === "chart" && (
            <span
              aria-hidden="true"
              className="mt-4 block h-[210px] animate-pulse rounded-mv bg-mv-portal-wash"
            />
          )}

          {shape.kind === "table" && (
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 6 }, (_, row) => (
                <span
                  key={row}
                  aria-hidden="true"
                  className="block h-[18px] animate-pulse rounded bg-mv-portal-wash"
                />
              ))}
            </div>
          )}

          {shape.kind === "split" && (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, column) => (
                <Lines key={column} widths={[100, 84, 94, 72, 60]} />
              ))}
            </div>
          )}
        </Card>
      ))}

      <p role="status" className="mt-4 text-center text-[11.5px] text-mv-muted">
        {month
          ? `Reading the filings for ${month}…`
          : "Reading the filings for every lease on your record…"}
      </p>
    </div>
  );
}

/** The silhouettes the loading report draws, in the document's own order. */
const SKELETON_PAGES = [
  { kind: "columns", title: "240px" },
  { kind: "tiles", title: "160px" },
  { kind: "chart", title: "200px" },
  { kind: "table", title: "260px" },
  { kind: "split", title: "180px" },
] as const;

/** A stack of lines at given widths, in percent. */
function Lines({ widths }: { widths: number[] }) {
  return (
    <div className="space-y-2.5">
      {widths.map((width, line) => (
        <span
          key={line}
          aria-hidden="true"
          className="block h-[13px] animate-pulse rounded bg-mv-portal-wash"
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
